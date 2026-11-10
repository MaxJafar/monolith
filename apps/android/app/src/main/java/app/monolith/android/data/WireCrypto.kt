package app.monolith.android.data

import java.security.KeyFactory
import java.security.PublicKey
import java.security.SecureRandom
import java.security.spec.MGF1ParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.SecretKeySpec
import org.json.JSONObject

object WireCrypto {
    fun encode(bytes: ByteArray): String = Base64.getEncoder().encodeToString(bytes)

    fun decode(text: String): ByteArray = Base64.getDecoder().decode(text)

    fun publicKey(pem: String): PublicKey =
        KeyFactory.getInstance("RSA")
            .generatePublic(
                X509EncodedKeySpec(
                    decode(
                        pem.lineSequence()
                            .filterNot { it.startsWith("-----") }
                            .joinToString("")
                            .replace(Regex("\\s"), "")
                    )
                )
            )

    class Session(publicKey: PublicKey) {
        private val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val wrapped: String =
            Cipher.getInstance("RSA/ECB/OAEPPadding").run {
                init(
                    Cipher.ENCRYPT_MODE,
                    publicKey,
                    OAEPParameterSpec(
                        "SHA-256",
                        "MGF1",
                        MGF1ParameterSpec.SHA256,
                        PSource.PSpecified.DEFAULT,
                    ),
                )
                encode(doFinal(key))
            }

        fun encrypt(value: Any): JSONObject {
            val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
            val bytes =
                Cipher.getInstance("AES/GCM/NoPadding").run {
                    init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
                    doFinal(value.toString().toByteArray())
                }
            return obj(
                "k" to wrapped,
                "iv" to encode(iv),
                "data" to encode(bytes.copyOfRange(0, bytes.size - 16)),
                "tag" to encode(bytes.takeLast(16).toByteArray()),
            )
        }

        fun decrypt(value: JSONObject): Any =
            Cipher.getInstance("AES/GCM/NoPadding").run {
                init(
                    Cipher.DECRYPT_MODE,
                    SecretKeySpec(key, "AES"),
                    GCMParameterSpec(128, decode(value.getString("iv"))),
                )
                jsonValue(
                    doFinal(decode(value.getString("data")) + decode(value.getString("tag")))
                        .toString(Charsets.UTF_8)
                )
            }
    }
}
