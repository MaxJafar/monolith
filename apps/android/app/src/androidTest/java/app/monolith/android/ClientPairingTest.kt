package app.monolith.android

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.monolith.android.data.*
import java.io.File
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Developer provisioning on an explicitly selected device; no credentials enter an APK. */
@RunWith(AndroidJUnit4::class)
class ClientPairingTest {
    @Test
    fun consumeAuthorizedDeviceSession() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("monolithPair") == "true")
        require(BuildConfig.DEBUG)
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val input = File(context.filesDir, "pairing-session.json")
        require(input.exists()) { "An authorized device-session import is required" }
        val saved = Session.from(JSONObject(input.readText()))
        val vault = SecureVault(context)
        require(vault.read("session") == null) { "Sign out before provisioning another session" }
        vault.write("session", saved.json().toString())
        check(input.delete())
        val api = MonolithApi(Contracts(context), vault, true)
        assertTrue(api.resume())
        val workspaces = (api.call("databases:workspaces/list") as JSONArray).objects()
        val selected = workspaces.firstOrNull { it.optBoolean("is_default") } ?: workspaces.firstOrNull()
        vault.write("preferences", obj("workspace" to selected?.str("id")).toString())
        File(context.filesDir, "pairing-result.json").writeText(obj(
            "status" to "connected", "origin" to saved.origin,
            "accountId" to saved.accountId, "sessionId" to saved.sessionId,
            "workspace" to selected?.str("id")
        ).toString())
    }
}
