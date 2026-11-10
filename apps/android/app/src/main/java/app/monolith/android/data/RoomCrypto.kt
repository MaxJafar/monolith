package app.monolith.android.data

import java.security.*
import java.security.spec.*
import java.util.Base64
import javax.crypto.*
import javax.crypto.spec.*
import org.json.JSONArray
import org.json.JSONObject

data class RoomIdentity(
    val public: JSONObject,
    val agreement: PrivateKey,
    val signing: PrivateKey,
    val backup: JSONObject,
) {
    fun secret() =
        obj(
            "public" to public,
            "agreement" to RoomCrypto.b64(agreement.encoded),
            "signing" to RoomCrypto.b64(signing.encoded),
            "backup" to backup,
        )
}

/**
 * Wire-compatible with packages/api/src/rooms/crypto.ts; all private material stays in the vault.
 */
object RoomCrypto {
    fun b64(bytes: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    fun bytes(text: String): ByteArray {
        require(Regex("[A-Za-z0-9_-]*").matches(text))
        return Base64.getUrlDecoder().decode(text).also { require(b64(it) == text) }
    }

    fun canonical(value: Any?): String =
        when (value) {
            is JSONObject ->
                value
                    .entries()
                    .sortedBy { it.first }
                    .joinToString(",", "{", "}") { (k, v) ->
                        "${JSONObject.quote(k)}:${canonical(v)}"
                    }
            is JSONArray -> value.values().joinToString(",", "[", "]") { canonical(it) }
            else -> value.jsonText()
        }

    private fun encoded(value: Any?) = canonical(value).toByteArray()

    private fun random(size: Int) = ByteArray(size).also { SecureRandom().nextBytes(it) }

    private fun sha(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes)

    private fun pair() =
        KeyPairGenerator.getInstance("EC")
            .apply { initialize(ECGenParameterSpec("secp256r1")) }
            .generateKeyPair()

    private fun publicKey(value: String) =
        KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(bytes(value)))

    private fun privateKey(value: String) =
        KeyFactory.getInstance("EC").generatePrivate(PKCS8EncodedKeySpec(bytes(value)))

    private fun aes(
        encrypt: Boolean,
        key: ByteArray,
        iv: ByteArray,
        data: ByteArray,
        aad: ByteArray,
    ): ByteArray =
        Cipher.getInstance("AES/GCM/NoPadding").run {
            init(
                if (encrypt) Cipher.ENCRYPT_MODE else Cipher.DECRYPT_MODE,
                SecretKeySpec(key, "AES"),
                GCMParameterSpec(128, iv),
            )
            updateAAD(aad)
            doFinal(data)
        }

    private fun passwordKey(password: String, salt: ByteArray): ByteArray =
        SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(PBEKeySpec(password.toCharArray(), salt, 600000, 256))
            .encoded

    fun fingerprint(identity: JSONObject) =
        b64(
            sha(
                encoded(
                    obj(
                        "owner_id" to identity.getString("owner_id"),
                        "agreement" to identity.getString("agreement"),
                        "signing" to identity.getString("signing"),
                    )
                )
            )
        )

    private fun p1363(der: ByteArray): ByteArray {
        require(der.size in 68..72 && der[0] == 0x30.toByte())
        var offset = 2
        fun integer(): ByteArray {
            require(der[offset++] == 2.toByte())
            val length = der[offset++].toInt() and 255
            require(length in 1..33 && offset + length <= der.size)
            val raw = der.copyOfRange(offset, offset + length)
            offset += length
            val trimmed = raw.dropWhile { it == 0.toByte() }.toByteArray()
            require(trimmed.size <= 32)
            return ByteArray(32 - trimmed.size) + trimmed
        }
        return integer() + integer()
    }

    private fun der(raw: ByteArray): ByteArray {
        require(raw.size == 64)
        fun integer(part: ByteArray): ByteArray {
            var v = part.dropWhile { it == 0.toByte() }.toByteArray()
            if (v.isEmpty()) v = byteArrayOf(0)
            if (v[0].toInt() and 128 != 0) v = byteArrayOf(0) + v
            return byteArrayOf(2, v.size.toByte()) + v
        }
        val data = integer(raw.copyOfRange(0, 32)) + integer(raw.copyOfRange(32, 64))
        return byteArrayOf(0x30, data.size.toByte()) + data
    }

    fun sign(identity: RoomIdentity, value: Any): String =
        b64(
            p1363(
                Signature.getInstance("SHA256withECDSA").run {
                    initSign(identity.signing)
                    update(encoded(value))
                    sign()
                }
            )
        )

    fun verify(identity: JSONObject, value: Any, signature: String) = runCatching {
        Signature.getInstance("SHA256withECDSA").run {
            initVerify(publicKey(identity.getString("signing")))
            update(encoded(value))
            verify(der(bytes(signature)))
        }
    }
        .getOrDefault(false)

    fun create(owner: String, password: String): RoomIdentity {
        require(password.length >= 12) { "Use at least 12 characters for the recovery password" }
        val agreement = pair()
        val signing = pair()
        val public =
            obj(
                "owner_id" to owner,
                "agreement" to b64(agreement.public.encoded),
                "signing" to b64(signing.public.encoded),
            )
        val salt = random(32)
        val iv = random(12)
        val secret =
            encoded(
                obj(
                    "agreement" to b64(agreement.private.encoded),
                    "signing" to b64(signing.private.encoded),
                )
            )
        val backup =
            obj(
                "version" to 1,
                "identity" to public,
                "salt" to b64(salt),
                "iv" to b64(iv),
                "ciphertext" to
                    b64(aes(true, passwordKey(password, salt), iv, secret, encoded(public))),
            )
        secret.fill(0)
        return RoomIdentity(public, agreement.private, signing.private, backup)
    }

    fun restore(backup: JSONObject, password: String, owner: String): RoomIdentity {
        require(
            backup.optInt("version") == 1 &&
                backup.getJSONObject("identity").str("owner_id") == owner &&
                backup.str("ciphertext").length <= 8192
        ) {
            "Recovery file belongs to a different account or version"
        }
        val identity = backup.getJSONObject("identity")
        val salt = bytes(backup.getString("salt"))
        val iv = bytes(backup.getString("iv"))
        require(salt.size == 32 && iv.size == 12)
        val raw =
            aes(
                false,
                passwordKey(password, salt),
                iv,
                bytes(backup.getString("ciphertext")),
                encoded(identity),
            )
        val secret = JSONObject(raw.toString(Charsets.UTF_8))
        raw.fill(0)
        val result =
            RoomIdentity(
                identity,
                privateKey(secret.getString("agreement")),
                privateKey(secret.getString("signing")),
                backup,
            )
        require(verify(identity, "rooms-recovery-check", sign(result, "rooms-recovery-check"))) {
            "Recovery signing key does not match"
        }
        val test = pair()
        require(
            MessageDigest.isEqual(
                shared(result.agreement, test.public),
                shared(test.private, publicKey(identity.getString("agreement"))),
            )
        ) {
            "Recovery agreement key does not match"
        }
        return result
    }

    fun fromSecret(raw: JSONObject) =
        RoomIdentity(
            raw.getJSONObject("public"),
            privateKey(raw.getString("agreement")),
            privateKey(raw.getString("signing")),
            raw.getJSONObject("backup"),
        )

    private fun shared(private: PrivateKey, public: PublicKey) =
        KeyAgreement.getInstance("ECDH").run {
            init(private)
            doPhase(public, true)
            generateSecret()
        }

    private fun wrap(
        private: PrivateKey,
        public: PublicKey,
        header: JSONObject,
        recipient: String,
    ): ByteArray {
        val prk =
            Mac.getInstance("HmacSHA256").run {
                init(SecretKeySpec(sha(encoded(header)), "HmacSHA256"))
                doFinal(shared(private, public))
            }
        return Mac.getInstance("HmacSHA256").run {
            init(SecretKeySpec(prk, "HmacSHA256"))
            doFinal(("monolith/rooms/key/v1/$recipient").toByteArray() + byteArrayOf(1))
        }
    }

    fun seal(
        identity: RoomIdentity,
        context: JSONObject,
        payload: JSONObject,
        people: List<JSONObject>,
    ): JSONObject {
        require(
            context.str("author_id") == identity.public.str("owner_id") &&
                people.any { it.str("owner_id") == context.str("author_id") } &&
                people.map { it.str("owner_id") }.distinct().size == people.size
        )
        val header =
            obj("version" to 1, "context" to context, "sender" to fingerprint(identity.public))
        val ephemeral = pair()
        val key = random(32)
        val iv = random(12)
        val recipients =
            JSONArray(
                people
                    .sortedBy { it.str("owner_id") }
                    .map { person ->
                        val fingerprint = fingerprint(person)
                        val wrapIv = random(12)
                        val owner = person.str("owner_id")
                        obj(
                            "user_id" to owner,
                            "fingerprint" to fingerprint,
                            "iv" to b64(wrapIv),
                            "key" to
                                b64(
                                    aes(
                                        true,
                                        wrap(
                                            ephemeral.private,
                                            publicKey(person.getString("agreement")),
                                            header,
                                            "$owner/$fingerprint",
                                        ),
                                        wrapIv,
                                        key,
                                        encoded(header),
                                    )
                                ),
                        )
                    }
            )
        val unsigned =
            header
                .copy()
                .put("ephemeral", b64(ephemeral.public.encoded))
                .put("iv", b64(iv))
                .put("ciphertext", b64(aes(true, key, iv, encoded(payload), encoded(header))))
                .put("recipients", recipients)
        key.fill(0)
        return unsigned.copy().put("signature", sign(identity, unsigned))
    }

    fun senderFor(
        envelope: JSONObject,
        authorId: String,
        candidates: List<JSONObject>,
    ): JSONObject =
        candidates.firstOrNull {
            it.str("owner_id") == authorId && fingerprint(it) == envelope.str("sender")
        } ?: error("The signing identity for this message is unavailable")

    fun open(
        identity: RoomIdentity,
        envelope: JSONObject,
        sender: JSONObject,
        workspace: String,
        room: String,
    ): JSONObject {
        val unsigned = envelope.copy().apply { remove("signature") }
        val context = envelope.getJSONObject("context")
        require(
            envelope.optInt("version") == 1 &&
                context.str("workspace_id") == workspace &&
                context.str("room_id") == room &&
                context.str("author_id") == sender.str("owner_id") &&
                envelope.str("sender") == fingerprint(sender) &&
                verify(sender, unsigned, envelope.getString("signature"))
        ) {
            "Message signature or context could not be verified"
        }
        val recipient =
            envelope.array("recipients").objects().firstOrNull {
                it.str("user_id") == identity.public.str("owner_id")
            } ?: error("No message key for this identity")
        require(recipient.str("fingerprint") == fingerprint(identity.public))
        val header = obj("version" to 1, "context" to context, "sender" to envelope.get("sender"))
        val key =
            aes(
                false,
                wrap(
                    identity.agreement,
                    publicKey(envelope.getString("ephemeral")),
                    header,
                    "${recipient.str("user_id")}/${recipient.str("fingerprint")}",
                ),
                bytes(recipient.getString("iv")),
                bytes(recipient.getString("key")),
                encoded(header),
            )
        val plaintext =
            aes(
                false,
                key,
                bytes(envelope.getString("iv")),
                bytes(envelope.getString("ciphertext")),
                encoded(header),
            )
        key.fill(0)
        return JSONObject(plaintext.toString(Charsets.UTF_8)).also {
            require(it.getString("body").length <= 16000 && it.array("attachments").length() <= 4)
        }
    }
}
