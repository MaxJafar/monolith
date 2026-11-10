package app.monolith.android.data

import java.io.IOException
import java.security.PublicKey
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class ApiFailure(
    val status: Int,
    val code: String,
    message: String,
    val detail: JSONObject? = null,
) : IOException(message)

data class Session(
    val origin: String,
    val serverId: String,
    val accountId: String,
    val sessionId: String,
    val refreshToken: String,
) {
    val scope
        get() = "$serverId:$accountId"

    fun json() =
        obj(
            "origin" to origin,
            "serverId" to serverId,
            "accountId" to accountId,
            "sessionId" to sessionId,
            "refreshToken" to refreshToken,
        )

    companion object {
        fun from(json: JSONObject) =
            Session(
                json.getString("origin"),
                json.getString("serverId"),
                json.getString("accountId"),
                json.getString("sessionId"),
                json.getString("refreshToken"),
            )
    }
}

class MonolithApi(
    val contracts: Contracts,
    private val vault: Vault,
    private val development: Boolean = false,
    private val client: OkHttpClient =
        OkHttpClient.Builder()
            .followRedirects(false)
            .followSslRedirects(false)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .callTimeout(60, TimeUnit.SECONDS)
            .build(),
) {
    private val auth = Mutex()
    @Volatile
    var session: Session? = null
        private set

    @Volatile private var access = ""
    @Volatile private var epoch = 0L
    private var selected = ""
    private var discovery: JSONObject? = null
    private var serverKey: PublicKey? = null
    private val keyMutex = Mutex()

    fun savedSession(): Session? = vault.read("session")?.let { Session.from(JSONObject(it)) }

    companion object {
        fun origin(input: String, development: Boolean = false): String {
            val raw = input.trim().let { if ("://" in it) it else "https://$it" }
            val url = runCatching {
                raw.toHttpUrl()
            }.getOrElse { throw ApiFailure(0, "invalid_url", "Enter a valid HTTPS host") }
            val local =
                development &&
                    url.scheme == "http" &&
                    url.host in listOf("localhost", "127.0.0.1", "10.0.2.2")
            if (
                (!url.isHttps && !local) ||
                    url.username.isNotEmpty() ||
                    url.password.isNotEmpty() ||
                    url.encodedPath != "/" ||
                    url.query != null ||
                    url.fragment != null
            )
                throw ApiFailure(
                    0,
                    "invalid_url",
                    "Use an HTTPS host without a path or credentials",
                )
            return url.toString().trimEnd('/')
        }

        fun target(origin: String, path: String): HttpUrl {
            if (
                !path.startsWith("/") ||
                    path.startsWith("//") ||
                    path.contains('\\') ||
                    path.contains('#')
            )
                throw ApiFailure(0, "invalid_url", "Invalid request path")
            val root = origin.toHttpUrl()
            val target =
                root.resolve(path) ?: throw ApiFailure(0, "invalid_url", "Invalid request path")
            if (
                target.scheme != root.scheme || target.host != root.host || target.port != root.port
            )
                throw ApiFailure(0, "invalid_url", "Request origin changed")
            return target
        }
    }

    suspend fun connect(input: String): JSONObject = auth.withLock {
        val base = origin(input, development)
        val found =
            send(base, "/.well-known/monolith", "GET", null, "", emptyMap()) as? JSONObject
                ?: throw ApiFailure(0, "incompatible", "Invalid server discovery")
        if (
            found.optInt("apiVersion") != 1 ||
                found.optInt("editorVersion") != 2 ||
                "device-sessions" !in found.array("capabilities").values() ||
                found.str("serverId").isBlank()
        )
            throw ApiFailure(0, "incompatible", "This host does not support the companion protocol")
        val old = session ?: savedSession()
        if (old?.origin == base && old.serverId != found.str("serverId"))
            throw ApiFailure(0, "identity_changed", "The server identity has changed")
        if (old != null && old.origin != base)
            throw ApiFailure(
                409,
                "sign_out_required",
                "Sign out before connecting to a different host",
            )
        selected = base
        discovery = found
        serverKey = null
        found
    }

    suspend fun resume(): Boolean {
        val saved = savedSession() ?: return false
        connect(saved.origin)
        session = saved
        refresh()
        return true
    }

    suspend fun login(
        email: String,
        password: String,
        challenge: String = "",
        code: String = "",
    ): JSONObject = auth.withLock {
        check(selected.isNotBlank())
        val result =
            if (challenge.isEmpty())
                send(
                    selected,
                    "/api/v1/device-sessions",
                    "POST",
                    obj(
                        "email" to email,
                        "password" to password,
                        "deviceName" to "Monolith · Android",
                    ),
                    "",
                    emptyMap(),
                )
            else
                send(
                    selected,
                    "/api/v1/device-sessions/totp",
                    "POST",
                    obj("challenge" to challenge, "code" to code),
                    "",
                    emptyMap(),
                )
        val json = result as JSONObject
        if (!json.has("challenge")) commit(json)
        json
    }

    private fun commit(tokens: JSONObject) {
        val next =
            Session(
                selected,
                discovery!!.getString("serverId"),
                tokens.getString("accountId"),
                tokens.getString("sessionId"),
                tokens.getString("refreshToken"),
            )
        require(next.refreshToken.isNotEmpty() && tokens.getString("accessToken").isNotEmpty())
        val old = session ?: savedSession()
        if (old != null && old.scope != next.scope)
            throw ApiFailure(409, "different_account", "Sign out before switching accounts")
        vault.write("session", next.json().toString())
        if (session?.scope != next.scope) epoch++
        session = next
        access = tokens.getString("accessToken")
    }

    suspend fun refresh() = auth.withLock { refreshLocked() }

    private suspend fun refreshLocked() {
        val current = session ?: throw ApiFailure(401, "expired", "Sign in again")
        val tokens =
            send(
                current.origin,
                "/api/v1/device-sessions/refresh",
                "POST",
                obj("refreshToken" to current.refreshToken),
                "",
                emptyMap(),
            )
                as JSONObject
        commit(tokens)
    }

    suspend fun signOut() = auth.withLock {
        val current = session ?: savedSession()
        if (current != null) {
            // Revoke before erasing the only refresh credential; errors keep the session intact.
            if (access.isEmpty()) {
                session = current
                refreshLocked()
            }
            send(
                current.origin,
                "/api/v1/device-sessions/${current.sessionId}",
                "DELETE",
                null,
                access,
                emptyMap(),
            )
        }
        vault.remove("session")
        session = null
        access = ""
        selected = ""
        discovery = null
        serverKey = null
        epoch++
    }

    suspend fun request(
        path: String,
        method: String = "GET",
        body: Any? = null,
        headers: Map<String, String> = emptyMap(),
    ): Any {
        val current = session ?: throw ApiFailure(401, "expired", "Sign in again")
        val ticket = epoch
        val token = access
        val result =
            try {
                send(current.origin, path, method, body, token, headers)
            } catch (error: ApiFailure) {
                if (error.status != 401) throw error
                auth.withLock {
                    if (epoch != ticket) throw ApiFailure(401, "expired", "Account changed")
                    if (access == token) refreshLocked()
                }
                send(current.origin, path, method, body, access, headers)
            }
        if (ticket != epoch) throw ApiFailure(401, "expired", "Account changed")
        return result
    }

    suspend fun call(id: String, query: JSONObject = JSONObject(), body: JSONObject? = null): Any {
        val endpoint = contracts[id]
        val path =
            endpoint.path +
                if (query.length() == 0) ""
                else
                    query.entries().joinToString("&", "?") { (k, v) ->
                        "${java.net.URLEncoder.encode(k,"UTF-8")}=${java.net.URLEncoder.encode(v.toString(),"UTF-8")}"
                    }
        suspend fun exchange(): Any {
            if (!endpoint.encrypted) return unpack(request(path, endpoint.method, body))
            val key = keyMutex.withLock {
                serverKey
                    ?: WireCrypto.publicKey(unpack(request("/api/encryptionPublicKey")) as String)
                        .also { serverKey = it }
            }
            val crypto = WireCrypto.Session(key)
            val result =
                unpack(
                    request(
                        path,
                        endpoint.method,
                        if (endpoint.method == "GET") null
                        else crypto.encrypt(body ?: JSONObject()),
                        if (endpoint.method == "GET") mapOf("X-Monolith-Key" to crypto.wrapped)
                        else emptyMap(),
                    )
                )
            return if (
                result is JSONObject && result.has("iv") && result.has("tag") && result.has("data")
            )
                crypto.decrypt(result)
            else result
        }
        return try {
            exchange()
        } catch (error: ApiFailure) {
            if (
                error.status != 400 ||
                    error.message !in
                        listOf("Failed to decrypt payload", "Failed to decrypt encryption key")
            )
                throw error
            keyMutex.withLock { serverKey = null }
            exchange()
        }
    }

    private fun unpack(value: Any): Any {
        if (value !is JSONObject) return value
        if (value.str("state") == "error")
            throw ApiFailure(400, "api_error", value.str("message", "The request failed"), value)
        return if (value.str("state") == "success") value.opt("data") ?: JSONObject.NULL else value
    }

    private suspend fun send(
        origin: String,
        path: String,
        method: String,
        body: Any?,
        token: String,
        headers: Map<String, String>,
    ): Any =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(target(origin, path))
            if (token.isNotBlank()) builder.header("Authorization", "Bearer $token")
            headers.forEach { (k, v) -> builder.header(k, v) }
            val payload =
                if (method in listOf("POST", "PUT", "PATCH"))
                    (body?.toString() ?: "{}").toRequestBody(
                        "application/json; charset=utf-8".toMediaType()
                    )
                else null
            builder.method(method, payload)
            client.newCall(builder.build()).execute().use { response ->
                if (response.code in 300..399)
                    throw ApiFailure(response.code, "redirect", "Server redirects are not allowed")
                val bytes =
                    response.body?.byteStream()?.use { stream ->
                        val sink = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(8192)
                        while (true) {
                            val n = stream.read(buffer)
                            if (n < 0) break
                            if (sink.size() + n > 24_000_000)
                                throw ApiFailure(
                                    413,
                                    "too_large",
                                    "Response exceeds the transfer limit",
                                )
                            sink.write(buffer, 0, n)
                        }
                        sink.toByteArray()
                    } ?: byteArrayOf()
                val text = bytes.toString(Charsets.UTF_8)
                val data =
                    if (text.isBlank()) JSONObject.NULL
                    else
                        runCatching { jsonValue(text) }
                            .getOrElse {
                                throw ApiFailure(
                                    response.code,
                                    "invalid_response",
                                    "Invalid response from host",
                                )
                            }
                if (!response.isSuccessful)
                    throw ApiFailure(
                        response.code,
                        (data as? JSONObject)?.str("code", "request_failed") ?: "request_failed",
                        (data as? JSONObject)?.str("message", "The request failed")
                            ?: "The request failed",
                        data as? JSONObject,
                    )
                data
            }
        }
}
