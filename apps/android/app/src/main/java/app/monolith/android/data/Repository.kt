package app.monolith.android.data

import app.monolith.android.editor.Drafts
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

data class Cached(
    val value: Any,
    val stale: Boolean = false,
    val savedAt: Long = System.currentTimeMillis(),
)

class Repository(val api: MonolithApi, val vault: Vault) {
    val drafts = Drafts(vault)
    val contracts
        get() = api.contracts

    suspend fun load(id: String, query: JSONObject = JSONObject()): Cached {
        val scope = api.session?.scope ?: throw ApiFailure(401, "expired", "Sign in again")
        val cacheKey =
            "cache:$scope:$id:${query.entries().sortedBy { it.first }.joinToString { "${it.first}=${it.second}" }}"
        return try {
            val result = api.call(id, query)
            withContext(Dispatchers.IO) {
                vault.write(
                    cacheKey,
                    obj("value" to result, "savedAt" to System.currentTimeMillis()).toString(),
                )
            }
            Cached(result)
        } catch (error: java.io.IOException) {
            // Permission, validation and authentication failures must not reveal cached access.
            if (error is ApiFailure && error.status in 400..499) throw error
            val cached =
                withContext(Dispatchers.IO) { vault.read(cacheKey) }?.let(::JSONObject)
                    ?: throw error
            Cached(cached.get("value"), true, cached.getLong("savedAt"))
        }
    }

    suspend fun mutate(id: String, query: JSONObject, body: JSONObject): Any =
        api.call(id, query, body)

    suspend fun signOut() {
        val scope = api.session?.scope ?: api.savedSession()?.scope
        if (scope != null && withContext(Dispatchers.IO) { drafts.dirty(scope).isNotEmpty() })
            throw ApiFailure(
                409,
                "unsaved_drafts",
                "Save or recover your document drafts before signing out",
            )
        api.signOut()
    }

    fun preferences(): JSONObject = vault.read("preferences")?.let(::JSONObject) ?: JSONObject()

    fun savePreferences(value: JSONObject) = vault.write("preferences", value.toString())
}
