package app.monolith.android

import android.app.Application
import androidx.compose.runtime.*
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.monolith.android.data.*
import app.monolith.android.editor.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject

data class EditorState(
    val kind: String,
    val id: String,
    val document: JSONObject,
    val snapshot: JSONObject,
    val dirty: Boolean = false,
    val generation: Long = 0,
    val conflict: Boolean = false,
    val readOnly: Boolean = false,
) {
    /** Remote reads must never replace unsaved text or regress a completed save. */
    fun reconcile(remote: JSONObject): EditorState {
        if (remote.optLong("revision") <= document.optLong("revision")) return this
        if (dirty) return copy(conflict = true)
        return copy(
            document = remote,
            snapshot = remote.getJSONObject("snapshot"),
            generation = generation + 1,
            conflict = false,
        )
    }
}

data class FormRequest(
    val endpoint: Endpoint,
    val query: JSONObject,
    val body: JSONObject,
    val title: String,
    val hidden: Set<String> =
        setOf("workspace_id", "expected_revision", "expected_updated", "command_id", "request_key"),
)

class MainModel(application: Application) : AndroidViewModel(application) {
    private val vault = SecureVault(application)
    val repository =
        Repository(MonolithApi(Contracts(application), vault, BuildConfig.DEBUG), vault)
    var connected by mutableStateOf(false)
        private set

    var discovered by mutableStateOf(false)
        private set

    var busy by mutableStateOf(false)
        private set

    var error by mutableStateOf("")
        private set

    var challenge by mutableStateOf("")
        private set

    var server by mutableStateOf("")
    var workspaces by mutableStateOf<List<JSONObject>>(emptyList())
        private set

    private var installedAddons by mutableStateOf<Set<String>>(emptySet())
    private var modulesCheckedAt = 0L
    val availableAddons: Set<String>
        get() =
            installedAddons.intersect(
                workspace
                    ?.array("enabled_modules")
                    ?.values()
                    ?.map { it.toString() }
                    ?.toSet()
                    .orEmpty()
            )

    var workspace by mutableStateOf<JSONObject?>(null)
        private set

    var snapshot by mutableStateOf(JSONObject())
        private set

    var pages by mutableStateOf<List<JSONObject>>(emptyList())
        private set

    var rooms by mutableStateOf<List<JSONObject>>(emptyList())
        private set

    var schedules by mutableStateOf<List<JSONObject>>(emptyList())
        private set

    var stale by mutableStateOf(false)
        private set

    var section by mutableStateOf("home")
        private set

    var selectedBase by mutableStateOf<JSONObject?>(null)
    var selectedProject by mutableStateOf<JSONObject?>(null)
    var selectedRoom by mutableStateOf<JSONObject?>(null)
    var editor by mutableStateOf<EditorState?>(null)
        private set

    var form by mutableStateOf<FormRequest?>(null)
        private set

    var operationResult by mutableStateOf<Any?>(null)
    var preferences by mutableStateOf(JSONObject())
        private set

    var reload by mutableIntStateOf(0)
        private set

    var sharedText by mutableStateOf("")
    private var loadJob: Job? = null
    private val localWrite = Mutex()
    private val saveLock = Mutex()
    private val storedGenerations = mutableMapOf<String, Long?>()
    private var workspaceEpoch = 0
    private var undo = mutableListOf<JSONObject>()
    private var redo = mutableListOf<JSONObject>()
    val workspaceId
        get() = workspace?.str("id") ?: ""

    val canWrite
        get() = workspace?.str("role") in listOf("owner", "editor") && !stale

    val records
        get() = snapshot.array("records").objects()

    val bases
        get() = snapshot.array("bases").objects()

    val workspaceQuery
        get() = obj("workspace_id" to workspaceId)

    init {
        run {
            preferences = withContext(Dispatchers.IO) { repository.preferences() }
            server = withContext(Dispatchers.IO) { repository.api.savedSession()?.origin ?: "" }
            connected = repository.api.resume()
            discovered = server.isNotBlank()
            if (connected) refreshWorkspaces()
        }
    }

    fun dismissError() {
        error = ""
    }

    fun fail(cause: Throwable) {
        if (cause is CancellationException) throw cause
        error = cause.message ?: cause.javaClass.simpleName
    }

    fun run(action: suspend () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            error = ""
            try {
                action()
            } catch (cause: Throwable) {
                fail(cause)
            } finally {
                busy = false
            }
        }
    }

    fun connect() = run {
        repository.api.connect(server)
        discovered = true
    }

    fun changeServer() {
        discovered = false
        challenge = ""
    }

    fun signIn(email: String, password: String, code: String) = run {
        val result = repository.api.login(email, password, challenge, code)
        challenge = result.str("challenge")
        if (challenge.isEmpty()) {
            connected = true
            refreshWorkspaces()
        }
    }

    suspend fun refreshWorkspaces() {
        refreshModules()
        val value = repository.load("databases:workspaces/list")
        workspaces = (value.value as JSONArray).objects()
        val chosen =
            workspaces.firstOrNull { it.str("id") == preferences.str("workspace") }
                ?: workspaces.firstOrNull()
        selectWorkspace(chosen)
    }

    private suspend fun refreshModules() {
        if (modulesCheckedAt != 0L && System.nanoTime() - modulesCheckedAt < 60_000_000_000L) return
        val modules = (repository.load("core:modules/list").value as JSONArray).objects()
        val prefixes = modules.map { "/api/modules/${it.str("remoteId")}/" }
        installedAddons =
            repository.contracts.endpoints.values
                .filter { endpoint -> prefixes.any { endpoint.path.startsWith(it) } }
                .map { it.module }
                .toSet()
        modulesCheckedAt = System.nanoTime()
    }

    fun selectWorkspace(next: JSONObject?) {
        workspaceEpoch++
        loadJob?.cancel()
        workspace = next
        selectedBase = null
        selectedProject = null
        selectedRoom = null
        editor = null
        form = null
        snapshot = JSONObject()
        pages = emptyList()
        rooms = emptyList()
        schedules = emptyList()
        stale = false
        if (next != null) {
            updatePreference("workspace", next.str("id"))
            refresh()
        }
    }

    fun navigate(next: String) {
        section = next
        selectedBase = null
        selectedProject = null
        selectedRoom = null
        editor = null
        form = null
    }

    fun back(): Boolean =
        when {
            form != null -> {
                form = null
                true
            }
            editor != null -> {
                editor = null
                true
            }
            selectedRoom != null -> {
                selectedRoom = null
                true
            }
            selectedBase != null -> {
                selectedBase = null
                true
            }
            selectedProject != null -> {
                selectedProject = null
                true
            }
            section != "home" -> {
                navigate("home")
                true
            }
            else -> false
        }

    fun updatePreference(key: String, value: Any) {
        preferences = preferences.withValue(key, value)
        val snapshot = preferences.copy()
        viewModelScope.launch(Dispatchers.IO) {
            try {
                repository.savePreferences(snapshot)
            } catch (cause: Throwable) {
                withContext(Dispatchers.Main) { fail(cause) }
            }
        }
    }

    fun refresh() {
        if (workspaceId.isBlank()) return
        val ticket = workspaceEpoch
        val query = workspaceQuery
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            try {
                loadWorkspace(ticket, query)
            } catch (cause: Throwable) {
                fail(cause)
            }
        }
    }

    /** Runs only while an Activity is visible; restarts immediately when it returns. */
    suspend fun syncWhileVisible() {
        while (currentCoroutineContext().isActive) {
            if (connected && !busy && loadJob?.isActive != true) {
                val ticket = workspaceEpoch
                try {
                    refreshModules()
                    val available = repository.load("databases:workspaces/list")
                    if (ticket == workspaceEpoch && !busy) {
                        workspaces = (available.value as JSONArray).objects()
                        val current = workspaces.firstOrNull { it.str("id") == workspaceId }
                        if (current == null) {
                            selectWorkspace(
                                workspaces.firstOrNull {
                                    it.str("id") == preferences.str("workspace")
                                } ?: workspaces.firstOrNull()
                            )
                        } else {
                            workspace = current
                            editor = editor?.copy(readOnly = current.str("role") == "viewer")
                            loadWorkspace(ticket, workspaceQuery)
                            syncDocument(ticket)
                        }
                    }
                } catch (cause: Throwable) {
                    if (cause is CancellationException) throw cause
                    if (ticket == workspaceEpoch) {
                        stale = true
                        if (cause is ApiFailure && cause.status in listOf(401, 403)) {
                            snapshot = JSONObject()
                            pages = emptyList()
                            rooms = emptyList()
                            schedules = emptyList()
                            editor = null
                            fail(cause)
                        }
                    }
                }
            }
            delay(5_000)
        }
    }

    private suspend fun loadWorkspace(ticket: Int, query: JSONObject) {
        val data = repository.load("databases:workspaceDatabases/snapshot", query)
        val documents = repository.load("databases:workspaces/pages", query)
        val calendar = repository.load("databases:calendar/list", query)
        val conversations = repository.load("core:rooms/list", query)
        if (ticket != workspaceEpoch) return
        snapshot = data.value as JSONObject
        pages = (documents.value as JSONArray).objects()
        schedules = (calendar.value as JSONObject).array("schedules").objects()
        rooms = (conversations.value as JSONArray).objects()
        stale = data.stale || documents.stale || calendar.stale || conversations.stale
        reload++
    }

    private suspend fun syncDocument(ticket: Int) {
        val opened = editor ?: return
        if (stale || busy) return
        val remote =
            repository.api.request(
                "/api/v1/editor-documents/${opened.kind}/${opened.id}?workspaceId=$workspaceId"
            ) as JSONObject
        val latest = editor ?: return
        if (ticket != workspaceEpoch || latest.kind != opened.kind || latest.id != opened.id) return
        val next = latest.reconcile(remote)
        if (next !== latest) {
            editor = next
            if (!next.dirty) {
                undo.clear()
                redo.clear()
                persist(next)
            }
        }
    }

    fun form(
        id: String,
        initial: JSONObject = JSONObject(),
        query: JSONObject = JSONObject(),
        title: String = "edit",
        hidden: Set<String> = emptySet(),
    ) {
        if (
            !canWrite &&
                id !in listOf("databases:workspaces/create") &&
                repository.contracts[id].method != "GET" &&
                workspace != null
        )
            return
        val endpoint = repository.contracts[id]
        val q =
            (Schema.seed(endpoint.query) as? JSONObject ?: JSONObject()).apply {
                if (endpoint.query.objectOrEmpty("properties").has("workspace_id"))
                    put("workspace_id", workspaceId)
                query.entries().forEach { (k, v) ->
                    if (endpoint.query.objectOrEmpty("properties").has(k)) put(k, v)
                }
            }
        val body =
            (Schema.seed(endpoint.body) as? JSONObject ?: JSONObject()).apply {
                val properties = endpoint.body.objectOrEmpty("properties")
                initial.entries().forEach { (k, v) -> if (properties.has(k)) put(k, v) }
                if (properties.has("expected_revision") && initial.has("revision"))
                    put("expected_revision", initial.get("revision"))
                if (properties.has("expected_updated") && initial.has("updated"))
                    put("expected_updated", initial.get("updated"))
                listOf("command_id", "request_key")
                    .filter { properties.has(it) }
                    .forEach { put(it, java.util.UUID.randomUUID().toString()) }
            }
        form =
            FormRequest(
                endpoint,
                q,
                body,
                title,
                FormRequest(endpoint, q, body, title).hidden + hidden,
            )
    }

    fun closeForm() {
        if (!busy) form = null
    }

    fun submitForm(query: JSONObject, body: JSONObject) = run {
        val current = form ?: return@run
        val errors =
            Schema.errors(current.endpoint.query, query) +
                if (current.endpoint.method != "GET") Schema.errors(current.endpoint.body, body)
                else emptyList()
        require(errors.isEmpty()) { "Check: ${errors.joinToString().trim()}" }
        val result =
            if (current.endpoint.method == "GET") repository.api.call(current.endpoint.id, query)
            else repository.mutate(current.endpoint.id, query, body)
        operationResult = if (current.endpoint.method == "GET") result else null
        if (current.endpoint.route.endsWith("createRecord")) sharedText = ""
        form = null
        if (current.endpoint.route.startsWith("workspaces/")) refreshWorkspaces() else refresh()
        reload++
    }

    fun toggle(record: JSONObject) = run {
        if (!canWrite) return@run
        repository.mutate(
            "databases:workspaceDatabases/updateRecord",
            workspaceQuery.put("id", record.str("id")),
            obj(
                "done" to !record.optBoolean("done"),
                "status" to if (record.optBoolean("done")) "planned" else "done",
                "expected_updated" to record.get("updated"),
            ),
        )
        refresh()
    }

    fun createRecord(kind: String, date: String? = null) {
        val tableType =
            when (kind) {
                "task" -> "action"
                "page" -> "general"
                else -> kind
            }
        val base =
            selectedBase
                ?: bases.firstOrNull { it.str("table_type") == tableType }
                ?: bases.firstOrNull()
        if (base == null) {
            form(
                "databases:workspaceDatabases/createBase",
                obj(
                    "name" to "",
                    "table_type" to tableType,
                    "description" to "",
                    "initial_view" to "table",
                ),
                title = "new_database",
            )
            return
        }
        form(
            "databases:workspaceDatabases/createRecord",
            obj(
                "base_id" to base.str("id"),
                "item_type" to kind,
                "title" to "",
                "content" to "",
                "values" to JSONObject(),
                "description" to sharedText,
                "date" to date,
                "project_id" to selectedProject?.str("id"),
            ),
            title =
                when (kind) {
                    "task" -> "new_action"
                    "project" -> "new_project"
                    "event" -> "new_event"
                    else -> "new_record"
                },
            hidden = setOf("content"),
        )
    }

    fun editRecord(record: JSONObject) =
        form(
            "databases:workspaceDatabases/updateRecord",
            record,
            workspaceQuery.put("id", record.str("id")),
            hidden = setOf("content"),
        )

    fun openDocument(kind: String, id: String) = run {
        val scope = repository.api.session!!.scope
        val workspace = workspaceId
        val ticket = workspaceEpoch
        val draft = localWrite.withLock {
            withContext(Dispatchers.IO) { repository.drafts.get(scope, workspace, kind, id) }
        }
        val path = "/api/v1/editor-documents/$kind/$id?workspaceId=$workspace"
        val remote =
            try {
                repository.api.request(path) as JSONObject
            } catch (cause: ApiFailure) {
                if (cause.status == 404 && canWrite)
                    repository.api.request(
                        "/api/v1/editor-documents/$kind/$id/initialize?workspaceId=$workspace",
                        "POST",
                        JSONObject(),
                    ) as JSONObject
                else if (draft != null && cause.status !in listOf(401, 403)) draft.document
                else throw cause
            } catch (cause: java.io.IOException) {
                draft?.document ?: throw cause
            }
        if (workspaceEpoch != ticket) return@run
        storedGenerations["$scope:$workspace:$kind:$id"] = draft?.generation
        undo.clear()
        redo.clear()
        editor =
            EditorState(
                kind,
                id,
                remote,
                if (draft?.dirty == true) draft.snapshot else remote.getJSONObject("snapshot"),
                draft?.dirty == true,
                draft?.generation ?: 0,
                draft?.dirty == true &&
                    draft.document.optLong("revision") != remote.optLong("revision"),
                readOnly = this.workspace?.str("role") == "viewer",
            )
    }

    fun editDocument(snapshot: JSONObject, history: Boolean = true) {
        val previous = editor ?: return
        if (previous.readOnly) return
        if (history) {
            undo.add(previous.snapshot)
            if (undo.size > 80) undo.removeAt(0)
            redo.clear()
        }
        val next =
            previous.copy(snapshot = snapshot, dirty = true, generation = previous.generation + 1)
        editor = next
        persist(next)
    }

    suspend fun readLocalDraft(scope: String, workspace: String, kind: String, id: String): Draft? =
        localWrite.withLock {
            withContext(Dispatchers.IO) {
                repository.drafts.get(scope, workspace, kind, id).also {
                    storedGenerations["$scope:$workspace:$kind:$id"] = it?.generation
                }
            }
        }

    fun writeLocalDraft(scope: String, workspace: String, kind: String, id: String, value: Draft) {
        val key = "$scope:$workspace:$kind:$id"
        viewModelScope.launch {
            try {
                localWrite.withLock {
                    withContext(Dispatchers.IO) {
                        repository.drafts.write(
                            scope,
                            workspace,
                            kind,
                            id,
                            value,
                            storedGenerations[key],
                        )
                        storedGenerations[key] = value.generation
                    }
                }
            } catch (cause: Throwable) {
                fail(cause)
            }
        }
    }

    private fun persist(
        value: EditorState,
        scope: String = repository.api.session?.scope ?: "",
        workspace: String = workspaceId,
    ) {
        if (scope.isNotBlank())
            writeLocalDraft(
                scope,
                workspace,
                value.kind,
                value.id,
                Draft(value.document, value.snapshot, value.dirty, value.generation),
            )
    }

    private fun persistRecovery(
        scope: String,
        workspace: String,
        original: EditorState,
        recovered: EditorState,
    ) {
        viewModelScope.launch {
            try {
                localWrite.withLock {
                    withContext(Dispatchers.IO) {
                        // A failed destination write must leave the original dirty draft
                        // discoverable.
                        for (value in listOf(recovered, original)) {
                            val key = "$scope:$workspace:${value.kind}:${value.id}"
                            repository.drafts.write(
                                scope,
                                workspace,
                                value.kind,
                                value.id,
                                Draft(
                                    value.document,
                                    value.snapshot,
                                    value.dirty,
                                    value.generation,
                                ),
                                storedGenerations[key],
                            )
                            storedGenerations[key] = value.generation
                        }
                    }
                }
            } catch (cause: Throwable) {
                fail(cause)
            }
        }
    }

    fun undo() {
        val current = editor ?: return
        if (undo.isEmpty()) return
        redo.add(current.snapshot)
        editDocument(undo.removeAt(undo.lastIndex), false)
    }

    fun redo() {
        val current = editor ?: return
        if (redo.isEmpty()) return
        undo.add(current.snapshot)
        editDocument(redo.removeAt(redo.lastIndex), false)
    }

    fun saveDocument(recover: Boolean = false) = run {
        saveLock.withLock {
            val current = editor ?: return@withLock
            if (current.readOnly) return@withLock
            val scope = repository.api.session!!.scope
            val workspace = workspaceId
            val ticket = workspaceEpoch
            val path = "/api/v1/editor-documents/${current.kind}/${current.id}"
            try {
                val result =
                    repository.api.request(
                        path + (if (recover) "/recover" else "") + "?workspaceId=$workspace",
                        if (recover) "POST" else "PUT",
                        if (recover)
                            obj(
                                "snapshot" to current.snapshot,
                                "title" to current.snapshot.getJSONObject("meta").str("title"),
                            )
                        else
                            obj(
                                "snapshot" to current.snapshot,
                                "expectedRevision" to current.document.getLong("revision"),
                            ),
                    ) as JSONObject
                val latest = editor
                if (
                    ticket == workspaceEpoch &&
                        latest?.id == current.id &&
                        latest.kind == current.kind
                ) {
                    if (recover) {
                        val source = result.getJSONObject("source")
                        val previous =
                            readLocalDraft(
                                scope,
                                workspace,
                                source.getString("kind"),
                                source.getString("id"),
                            )
                        val recent = editor
                        if (
                            ticket != workspaceEpoch ||
                                recent?.id != current.id ||
                                recent.kind != current.kind
                        )
                            return@withLock
                        val next =
                            recent.copy(
                                kind = source.getString("kind"),
                                id = source.getString("id"),
                                document = result,
                                dirty = recent.generation != current.generation,
                                conflict = false,
                                generation = (previous?.generation ?: 0) + 1,
                            )
                        // Persist the recovered destination before marking the original draft
                        // clean.
                        persistRecovery(
                            scope,
                            workspace,
                            current.copy(dirty = false, generation = recent.generation + 1),
                            next,
                        )
                        editor = next
                        undo.clear()
                        redo.clear()
                        refresh()
                    } else {
                        val next =
                            latest.copy(
                                document = result,
                                dirty = latest.generation != current.generation,
                                conflict = false,
                                generation = latest.generation + 1,
                            )
                        editor = next
                        persist(next, scope, workspace)
                    }
                }
            } catch (cause: ApiFailure) {
                if (
                    cause.status == 409 &&
                        ticket == workspaceEpoch &&
                        editor?.id == current.id &&
                        editor?.kind == current.kind
                )
                    editor = editor?.copy(conflict = true)
                throw cause
            }
        }
    }

    fun signOut() = run {
        localWrite.withLock { repository.signOut() }
        connected = false
        discovered = false
        challenge = ""
        selectWorkspace(null)
    }
}
