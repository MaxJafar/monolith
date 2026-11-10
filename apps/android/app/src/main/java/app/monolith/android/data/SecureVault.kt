package app.monolith.android.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

interface Vault {
    fun read(key: String): String?

    fun write(key: String, value: String)

    fun remove(key: String)
}

/** Private app files, authenticated encryption, atomic replacement, no Android backup. */
class SecureVault(context: Context) : Vault {
    private val directory = File(context.noBackupFilesDir, "vault").apply { mkdirs() }
    private val alias = "monolith.companion.v1"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let {
            return it
        }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(
                        alias,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                    )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build()
            )
            generateKey()
        }
    }

    private fun file(key: String) =
        AtomicFile(
            File(
                directory,
                MessageDigest.getInstance("SHA-256").digest(key.toByteArray()).joinToString("") {
                    "%02x".format(it)
                },
            )
        )

    @Synchronized
    override fun read(key: String): String? {
        val target = file(key)
        if (!target.baseFile.exists()) return null
        val bytes = target.readFully()
        require(bytes.size >= 28) { "Local storage is damaged" }
        return Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            updateAAD(key.toByteArray())
            doFinal(bytes.copyOfRange(12, bytes.size)).toString(Charsets.UTF_8)
        }
    }

    @Synchronized
    override fun write(key: String, value: String) {
        val cipher =
            Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.ENCRYPT_MODE, key())
                updateAAD(key.toByteArray())
            }
        val encrypted = cipher.doFinal(value.toByteArray())
        val target = file(key)
        val stream = target.startWrite()
        try {
            stream.write(cipher.iv + encrypted)
            target.finishWrite(stream)
        } catch (error: Throwable) {
            target.failWrite(stream)
            throw error
        }
    }

    @Synchronized override fun remove(key: String) = file(key).delete()
}
