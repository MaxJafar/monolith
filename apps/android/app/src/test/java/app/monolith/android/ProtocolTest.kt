package app.monolith.android

import app.monolith.android.data.*
import app.monolith.android.editor.*
import java.io.File
import java.security.KeyPairGenerator
import java.security.spec.MGF1ParameterSpec
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.*
import kotlinx.coroutines.*
import okhttp3.mockwebserver.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class MemoryVault : Vault {
    private val data = mutableMapOf<String, String>()

    override fun read(key: String) = data[key]

    override fun write(key: String, value: String) {
        data[key] = value
    }

    override fun remove(key: String) {
        data.remove(key)
    }
}

class ProtocolTest {
    private fun fixture() =
        JSONObject(javaClass.classLoader!!.getResource("rooms-webcrypto.json")!!.readText())

    @Test
    fun roomsSelectHistoricalSigningKeyAfterRotation() {
        val f = fixture()
        val original = f.getJSONObject("senderIdentity")
        val changed =
            f.getJSONObject("receiverIdentity").copy().put("owner_id", original.str("owner_id"))
        val envelope = f.getJSONObject("envelope")
        assertEquals(
            original,
            RoomCrypto.senderFor(envelope, original.str("owner_id"), listOf(changed, original)),
        )
        assertThrows(IllegalStateException::class.java) {
            RoomCrypto.senderFor(envelope, original.str("owner_id"), listOf(changed))
        }
        assertThrows(IllegalStateException::class.java) {
            RoomCrypto.senderFor(envelope, "another-account", listOf(original))
        }
    }

    @Test
    fun roomsDecryptSharedWebCryptoAndRejectTampering() {
        val f = fixture()
        val identity =
            RoomCrypto.restore(
                f.getJSONObject("receiverBackup"),
                f.getString("password"),
                f.getJSONObject("receiverIdentity").getString("owner_id"),
            )
        val context = f.getJSONObject("context")
        val plain =
            RoomCrypto.open(
                identity,
                f.getJSONObject("envelope"),
                f.getJSONObject("senderIdentity"),
                context.getString("workspace_id"),
                context.getString("room_id"),
            )
        assertEquals(f.getString("body"), plain.getString("body"))
        val tampered = f.getJSONObject("envelope").copy().put("ciphertext", "AAAA")
        assertThrows(IllegalArgumentException::class.java) {
            RoomCrypto.open(
                identity,
                tampered,
                f.getJSONObject("senderIdentity"),
                context.getString("workspace_id"),
                context.getString("room_id"),
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            RoomCrypto.open(
                identity,
                f.getJSONObject("envelope"),
                f.getJSONObject("senderIdentity"),
                "another-workspace",
                context.getString("room_id"),
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            RoomCrypto.restore(
                f.getJSONObject("receiverBackup"),
                f.getString("password"),
                "another-account",
            )
        }
    }

    @Test
    fun kotlinEnvelopeRoundTripFixture() {
        val f = fixture()
        val sender =
            RoomCrypto.restore(
                f.getJSONObject("senderBackup"),
                f.getString("password"),
                f.getJSONObject("senderIdentity").getString("owner_id"),
            )
        val receiver =
            RoomCrypto.restore(
                f.getJSONObject("receiverBackup"),
                f.getString("password"),
                f.getJSONObject("receiverIdentity").getString("owner_id"),
            )
        val envelope =
            RoomCrypto.seal(
                sender,
                f.getJSONObject("context"),
                obj("body" to f.getString("body"), "attachments" to JSONArray()),
                listOf(sender.public, receiver.public),
            )
        assertEquals(
            f.getString("body"),
            RoomCrypto.open(
                    receiver,
                    envelope,
                    sender.public,
                    f.getJSONObject("context").getString("workspace_id"),
                    f.getJSONObject("context").getString("room_id"),
                )
                .getString("body"),
        )
        File("build/native-room-envelope.json").apply {
            parentFile!!.mkdirs()
            writeText(envelope.toString())
        }
    }

    @Test
    fun wireEncryptionUsesOaepSha256AndGcm() {
        val rsa = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val session = WireCrypto.Session(rsa.public)
        val raw =
            Cipher.getInstance("RSA/ECB/OAEPPadding").run {
                init(
                    Cipher.DECRYPT_MODE,
                    rsa.private,
                    OAEPParameterSpec(
                        "SHA-256",
                        "MGF1",
                        MGF1ParameterSpec.SHA256,
                        PSource.PSpecified.DEFAULT,
                    ),
                )
                doFinal(Base64.getDecoder().decode(session.wrapped))
            }
        assertEquals(32, raw.size)
        val packet = session.encrypt(obj("hello" to "世界"))
        val bytes =
            Cipher.getInstance("AES/GCM/NoPadding").run {
                init(
                    Cipher.DECRYPT_MODE,
                    SecretKeySpec(raw, "AES"),
                    GCMParameterSpec(128, WireCrypto.decode(packet.getString("iv"))),
                )
                doFinal(
                    WireCrypto.decode(packet.getString("data")) +
                        WireCrypto.decode(packet.getString("tag"))
                )
            }
        assertEquals("世界", JSONObject(bytes.toString(Charsets.UTF_8)).getString("hello"))
        assertEquals("世界", (session.decrypt(packet) as JSONObject).getString("hello"))
    }

    @Test
    fun urlsRejectCredentialLeaksAndKeepPrivateHttpsHosts() {
        assertEquals(
            "https://monolith.example.ts.net",
            MonolithApi.origin("monolith.example.ts.net"),
        )
        listOf(
                "http://example.com",
                "https://user:secret@example.com",
                "https://example.com/api",
                "https://example.com?x=1",
                "https://example.com#x",
            )
            .forEach { url -> assertThrows(ApiFailure::class.java) { MonolithApi.origin(url) } }
        assertEquals("http://10.0.2.2:8080", MonolithApi.origin("http://10.0.2.2:8080", true))
        listOf("//evil.test/api", "https://evil.test/api", "/\\evil.test", "/api#x").forEach { path
            ->
            assertThrows(ApiFailure::class.java) { MonolithApi.target("https://example.com", path) }
        }
    }

    @Test
    fun transportRejectsRedirectAndSerializesRefresh() = runBlocking {
        val server = MockWebServer()
        var refreshes = 0
        server.dispatcher =
            object : Dispatcher() {
                override fun dispatch(request: RecordedRequest): MockResponse {
                    val data =
                        when (request.path) {
                            "/.well-known/monolith" ->
                                obj(
                                    "serverId" to "server",
                                    "apiVersion" to 1,
                                    "editorVersion" to 2,
                                    "capabilities" to JSONArray().put("device-sessions"),
                                )
                            "/api/v1/device-sessions" ->
                                obj(
                                    "accountId" to "account",
                                    "sessionId" to "session",
                                    "accessToken" to "expired",
                                    "refreshToken" to "refresh",
                                )
                            "/api/v1/device-sessions/refresh" -> {
                                refreshes++
                                obj(
                                    "accountId" to "account",
                                    "sessionId" to "session",
                                    "accessToken" to "fresh",
                                    "refreshToken" to "rotated",
                                )
                            }
                            "/api/redirect" ->
                                return MockResponse()
                                    .setResponseCode(302)
                                    .addHeader("Location", "https://evil.test")
                            else ->
                                if (request.getHeader("Authorization") != "Bearer fresh")
                                    return MockResponse()
                                        .setResponseCode(401)
                                        .setBody("{\"message\":\"expired\"}")
                                else obj("ok" to true)
                        }
                    return MockResponse()
                        .setHeader("Content-Type", "application/json")
                        .setBody(data.toString())
                }
            }
        server.start()
        try {
            val api = MonolithApi(Contracts("{\"endpoints\":[]}"), MemoryVault(), true)
            api.connect(server.url("/").toString())
            api.login("test", "test")
            coroutineScope { (1..5).map { async { api.request("/api/read") } }.awaitAll() }
            assertEquals(1, refreshes)
            assertEquals("rotated", api.savedSession()!!.refreshToken)
            try {
                api.request("/api/redirect")
                fail("Redirect accepted")
            } catch (error: ApiFailure) {
                assertEquals("redirect", error.code)
            }
        } finally {
            server.shutdown()
        }
    }

    @Test
    fun textEditsPreserveUnchangedFormattingAndSurrogates() {
        val rich =
            obj(
                Document.TEXT_TAG to true,
                "delta" to
                    JSONArray()
                        .put(obj("insert" to "Hello ", "attributes" to obj("bold" to true)))
                        .put(
                            obj(
                                "insert" to "world 👋",
                                "attributes" to obj("link" to "https://example.com"),
                            )
                        ),
            )
        val changed = Document.replaceText(rich, "Hello brave world 👋")
        val delta = changed.getJSONArray("delta").objects()
        assertEquals("Hello brave world 👋", delta.joinToString("") { it.getString("insert") })
        assertEquals(
            "https://example.com",
            delta.last().getJSONObject("attributes").getString("link"),
        )
        assertTrue(delta.first().getJSONObject("attributes").getBoolean("bold"))
        assertEquals(
            "Hello world 👋",
            rich.getJSONArray("delta").objects().joinToString("") { it.getString("insert") },
        )
    }

    @Test
    fun draftsAreScopedAndCompareAndSwap() {
        val store = Drafts(MemoryVault())
        val draft = Draft(obj("revision" to 2), obj("untouched" to true), true, 1)
        store.write("alice", "workspace", "page", "one", draft, null)
        assertNull(store.get("bob", "workspace", "page", "one"))
        assertThrows(ApiFailure::class.java) {
            store.write("alice", "workspace", "page", "one", draft.copy(generation = 2), null)
        }
        assertEquals(1, store.dirty("alice").size)
        store.write(
            "alice",
            "workspace",
            "page",
            "one",
            draft.copy(dirty = false, generation = 2),
            1,
        )
        assertTrue(store.dirty("alice").isEmpty())
    }

    @Test
    fun unknownTextEmbedsCannotBeFlattenedOnEdit() {
        val rich =
            obj(
                Document.TEXT_TAG to true,
                "delta" to
                    JSONArray()
                        .put(obj("insert" to "before"))
                        .put(obj("insert" to obj("reference" to "keep-this"))),
            )
        assertThrows(IllegalArgumentException::class.java) { Document.replaceText(rich, "changed") }
        assertEquals(
            "keep-this",
            rich
                .getJSONArray("delta")
                .getJSONObject(1)
                .getJSONObject("insert")
                .getString("reference"),
        )
    }

    @Test
    fun schemaHonorsDefaultsRequiredAndNestedConstraints() {
        val schema =
            JSONObject(
                """{"type":"object","properties":{"name":{"type":"string","minLength":1},"count":{"type":"integer","minimum":2,"default":3},"enabled":{"type":"boolean","default":true}},"required":["name","count","enabled"]}"""
            )
        val seed = Schema.seed(schema) as JSONObject
        assertEquals(3, seed.getInt("count"))
        assertTrue(seed.getBoolean("enabled"))
        assertTrue(Schema.errors(schema, seed).isNotEmpty())
        seed.put("name", "Name")
        assertTrue(Schema.errors(schema, seed).isEmpty())
        seed.put("count", 1)
        assertTrue(Schema.errors(schema, seed).isNotEmpty())
    }
}
