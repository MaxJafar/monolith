package app.monolith.android

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.monolith.android.data.*
import java.io.File
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Opt-in acceptance against an explicitly supplied, short-lived test device session. No credentials
 * or host addresses are bundled in the app or test APK.
 */
@RunWith(AndroidJUnit4::class)
class HostAcceptanceTest {
    @Test
    fun nativeTransportAndDocumentRoundTrip() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("monolithCleanup") != "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val input = File(context.filesDir, "acceptance-session.json")
        require(BuildConfig.DEBUG)
        val vault = SecureVault(context)
        assumeTrue(
            "A separately authorized test device session is required",
            input.exists() || vault.read("acceptance-workspace") != null,
        )
        if (input.exists()) {
            val saved = JSONObject(input.readText())
            check(input.delete())
            val existing = vault.read("session")?.let(::JSONObject)
            require(existing == null || existing.str("origin") == saved.str("origin")) {
                "Use an isolated emulator installation"
            }
            vault.write("session", saved.toString())
        }
        val api = MonolithApi(Contracts(context), vault, true)
        assertTrue(api.resume())
        val name = "Android verification ${UUID.randomUUID().toString().take(8)}"
        val createBody =
            (Schema.seed(api.contracts["databases:workspaces/create"].body) as JSONObject)
                .put("name", name)
                .put("description", "Temporary native Android acceptance workspace")
        val previousWorkspace = vault.read("acceptance-workspace")
        val created =
            if (previousWorkspace == null)
                api.call("databases:workspaces/create", body = createBody) as JSONObject
            else
                (api.call("databases:workspaces/list") as JSONArray).objects().single {
                    it.str("id") == previousWorkspace &&
                        it.str("name").startsWith("Android verification ") &&
                        it.str("owner_id") == api.session!!.accountId
                }
        val workspace = created.getString("id")
        val query = obj("workspace_id" to workspace)
        // The only mutating requests below target this newly created workspace.
        vault.write("acceptance-workspace", workspace)
        File(context.filesDir, "acceptance-result.json")
            .writeText(
                obj("workspace" to workspace, "name" to created.str("name"), "status" to "started")
                    .toString()
            )
        val result =
            api.call(
                "databases:workspaces/createPage",
                query,
                obj("title" to "Native Kotlin acceptance", "parent_id" to JSONObject.NULL),
            )
        val page = if (result is JSONObject) result.getString("id") else result.toString()
        val path = "/api/v1/editor-documents/page/$page?workspaceId=$workspace"
        val doc =
            try {
                api.request(path) as JSONObject
            } catch (error: ApiFailure) {
                if (error.status != 404) throw error
                api.request(
                    "/api/v1/editor-documents/page/$page/initialize?workspaceId=$workspace",
                    "POST",
                    JSONObject(),
                ) as JSONObject
            }
        val changed =
            app.monolith.android.editor.Document.title(
                doc.getJSONObject("snapshot"),
                "Saved from native Kotlin",
            )
        val next =
            api.request(
                path,
                "PUT",
                obj("expectedRevision" to doc.getInt("revision"), "snapshot" to changed),
            ) as JSONObject
        assertEquals(doc.getInt("revision") + 1, next.getInt("revision"))
        assertEquals(
            "Saved from native Kotlin",
            (api.request(path) as JSONObject)
                .getJSONObject("snapshot")
                .getJSONObject("meta")
                .getString("title"),
        )
        try {
            api.request(
                path,
                "PUT",
                obj("expectedRevision" to doc.getInt("revision"), "snapshot" to changed),
            )
            fail("A stale revision must be rejected")
        } catch (error: ApiFailure) {
            assertEquals(409, error.status)
        }
        val recovered =
            api.request(
                "/api/v1/editor-documents/page/$page/recover?workspaceId=$workspace",
                "POST",
                obj("title" to "Recovered native draft", "snapshot" to changed),
            ) as JSONObject
        assertNotEquals(page, recovered.getJSONObject("source").getString("id"))
        assertEquals(workspace, recovered.getString("workspaceId"))
        val snapshot = api.call("databases:workspaceDatabases/snapshot", query) as JSONObject
        val pages = api.call("databases:workspaces/pages", query) as JSONArray
        assertTrue(pages.length() >= 2)
        vault.write("preferences", obj("workspace" to workspace).toString())
        File(context.filesDir, "acceptance-result.json")
            .writeText(
                obj(
                        "workspace" to workspace,
                        "name" to created.str("name"),
                        "page" to page,
                        "recovered" to recovered.getJSONObject("source").getString("id"),
                        "status" to "passed",
                        "pages" to pages.length(),
                        "bases" to snapshot.array("bases").length(),
                    )
                    .toString()
            )
    }

    /** Only runs with an explicit runner argument and the isolated workspace marker. */
    @Test
    fun removeAcceptanceContents() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("monolithCleanup") == "true")
        require(BuildConfig.DEBUG)
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val vault = SecureVault(context)
        val workspace = requireNotNull(vault.read("acceptance-workspace"))
        val api = MonolithApi(Contracts(context), vault, true)
        assertTrue(api.resume())
        val owned =
            (api.call("databases:workspaces/list") as JSONArray).objects().single {
                it.str("id") == workspace && it.str("owner_id") == api.session!!.accountId
            }
        require(owned.str("name").startsWith("Android verification "))
        require(owned.str("description") == "Temporary native Android acceptance workspace")
        require(!owned.optBoolean("is_default"))
        val query = obj("workspace_id" to workspace)
        val snapshot = api.call("databases:workspaceDatabases/snapshot", query) as JSONObject
        // Use the server routes so connected Actions/Journal rows are removed too.
        snapshot.array("records").objects().forEach { record ->
            api.call(
                "databases:workspaceDatabases/removeRecord",
                obj("workspace_id" to workspace, "id" to record.str("id")),
            )
        }
        snapshot.array("bases").objects().forEach { base ->
            api.call(
                "databases:workspaceDatabases/removeBase",
                obj("workspace_id" to workspace, "id" to base.str("id")),
            )
        }
        val pages = api.call("databases:workspaces/pages", query) as JSONArray
        pages.objects().forEach { page ->
            require(page.str("workspace_id") == workspace)
            api.call(
                "databases:workspaces/removePage",
                obj("id" to page.str("id")),
                obj("expected_revision" to page.getInt("revision")),
            )
        }
        assertEquals(0, (api.call("databases:workspaces/pages", query) as JSONArray).length())
        assertEquals(
            0,
            (api.call("databases:workspaceDatabases/snapshot", query) as JSONObject)
                .array("bases")
                .length(),
        )
        File(context.filesDir, "acceptance-cleanup.json")
            .writeText(
                obj(
                        "workspace" to workspace,
                        "status" to "contents_removed",
                        "records" to snapshot.array("records").length(),
                        "bases" to snapshot.array("bases").length(),
                        "pages" to pages.length(),
                    )
                    .toString()
            )
    }
}
