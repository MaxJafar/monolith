package app.monolith.android.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import java.util.UUID
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun RoomsScreen(model: MainModel) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val identityKey = "rooms:${model.repository.api.session?.scope}"
    var identity by remember(identityKey) { mutableStateOf<RoomIdentity?>(null) }
    var unlock by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var backup by remember { mutableStateOf<JSONObject?>(null) }
    var messages by
        remember(model.selectedRoom?.str("id")) { mutableStateOf<List<JSONObject>>(emptyList()) }
    var text by remember(model.selectedRoom?.str("id")) { mutableStateOf("") }
    var thread by remember(model.selectedRoom?.str("id")) { mutableStateOf<String?>(null) }
    var keys by remember { mutableStateOf(JSONObject()) }
    var reload by remember { mutableIntStateOf(0) }
    var transaction by
        remember(model.selectedRoom?.str("id")) { mutableStateOf(UUID.randomUUID().toString()) }
    val room = model.selectedRoom
    val roomId = room?.str("id")
    LaunchedEffect(identityKey) {
        withContext(Dispatchers.IO) {
                model.repository.vault.read(identityKey)?.let {
                    RoomCrypto.fromSecret(JSONObject(it))
                }
            }
            .let { identity = it }
    }
    val import =
        rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null)
                scope.launch {
                    try {
                        backup =
                            withContext(Dispatchers.IO) {
                                context.contentResolver.openInputStream(uri)!!.use { stream ->
                                    val buffer = ByteArray(16385)
                                    var total = 0
                                    while (total < buffer.size) {
                                        val n = stream.read(buffer, total, buffer.size - total)
                                        if (n < 0) break
                                        total += n
                                    }
                                    require(total <= 16384)
                                    JSONObject(buffer.copyOf(total).toString(Charsets.UTF_8))
                                }
                            }
                        unlock = true
                    } catch (cause: Throwable) {
                        model.fail(cause)
                    }
                }
        }
    val export =
        rememberLauncherForActivityResult(
            ActivityResultContracts.CreateDocument("application/json")
        ) { uri ->
            if (uri != null)
                scope.launch {
                    try {
                        val saved = identity?.backup ?: return@launch
                        withContext(Dispatchers.IO) {
                            context.contentResolver.openOutputStream(uri)!!.use {
                                it.write(saved.toString(2).toByteArray())
                            }
                        }
                    } catch (cause: Throwable) {
                        model.fail(cause)
                    }
                }
        }
    LaunchedEffect(roomId, thread, identity, reload, model.reload) {
        if (roomId == null) return@LaunchedEffect
        while (isActive) {
            try {
                val query = model.workspaceQuery.put("room_id", roomId)
                keys = model.repository.api.call("core:rooms/keys", query) as JSONObject
                val result =
                    model.repository.api.call(
                        "core:rooms/timeline",
                        query
                            .copy()
                            .put("q", "")
                            .put("all_threads", false)
                            .put("pinned", false)
                            .apply { thread?.let { put("thread_id", it) } },
                    ) as JSONObject
                val current = identity
                messages =
                    withContext(Dispatchers.Default) {
                        result.array("messages").objects().map { message ->
                            val envelope = message.optJSONObject("sealed")
                            if (envelope == null || current == null) message
                            else {
                                runCatching {
                                    val sender =
                                        RoomCrypto.senderFor(
                                            envelope,
                                            message.str("author_id"),
                                            keys.array("identities").objects() +
                                                keys.array("historical").objects(),
                                        )
                                    val payload =
                                        RoomCrypto.open(
                                            current,
                                            envelope,
                                            sender,
                                            model.workspaceId,
                                            roomId,
                                        )
                                    message.copy().put("plain", payload)
                                }
                                    .getOrElse { message.copy().put("decrypt_error", it.message) }
                            }
                        }
                    }
                val seq = messages.maxOfOrNull { it.optLong("seq") } ?: 0
                if (seq > 0)
                    model.repository.api.call("core:rooms/receipt", query, obj("read_seq" to seq))
            } catch (cause: Throwable) {
                model.fail(cause)
                break
            }
            delay(5000)
        }
    }
    if (room == null)
        LazyColumn(
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Heading(tr("rooms")) {
                    IconAction("new_room", Icons.Outlined.Add, model.canWrite) {
                        model.form(
                            "core:rooms/create",
                            obj(
                                "id" to UUID.randomUUID().toString(),
                                "workspace_id" to model.workspaceId,
                                "name" to "",
                                "topic" to "",
                                "kind" to "channel",
                                "member_ids" to JSONArray(),
                            ),
                            title = "new_room",
                        )
                    }
                }
            }
            item { Action("room_keys", Icons.Outlined.Key, secondary = true) { unlock = true } }
            items(model.rooms, key = { it.str("id") }) { entry ->
                MonoCard(onClick = { model.selectedRoom = entry }) {
                    Row {
                        Text(
                            entry.str("name"),
                            Modifier.weight(1f),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        if (entry.optInt("unread") > 0)
                            Badge { Text(entry.optInt("unread").toString()) }
                    }
                    if (entry.str("topic").isNotBlank()) Caption(entry.str("topic"))
                }
            }
            if (model.rooms.isEmpty()) item { EmptyState("empty", icon = Icons.Outlined.Forum) }
        }
    else
        Column(Modifier.fillMaxSize().imePadding()) {
            Row(
                Modifier.padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Heading(room.str("name"), room.str("topic")) {
                    IconAction("edit", Icons.Outlined.MoreHoriz, room.optBoolean("can_manage")) {
                        model.form(
                            "core:rooms/update",
                            room,
                            model.workspaceQuery.put("room_id", roomId),
                            title = "properties",
                        )
                    }
                }
            }
            if (thread != null) TextButton({ thread = null }) { Text(tr("back")) }
            LazyColumn(
                Modifier.weight(1f),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(messages, key = { it.str("id") }) { message ->
                    MonoCard {
                        Caption(
                            "${message.str("author_name")} · ${message.str("created").take(16).replace('T',' ')}"
                        )
                        val body =
                            message.optJSONObject("plain")?.str("body") ?: message.str("body")
                        Text(
                            if (message.optBoolean("deleted")) tr("remove")
                            else if (body.isNotBlank()) body
                            else message.str("decrypt_error").ifBlank { tr("encrypted_message") }
                        )
                        Row {
                            TextButton({
                                thread = message.str("thread_id").ifBlank { message.str("id") }
                            }) {
                                Text("${tr("thread")} ${message.optInt("replies")}")
                            }
                            IconAction("pinned", Icons.Outlined.PushPin, model.canWrite) {
                                model.run {
                                    model.repository.mutate(
                                        "core:rooms/pin",
                                        model.workspaceQuery.put("room_id", roomId),
                                        obj(
                                            "id" to message.str("id"),
                                            "pinned" to !message.optBoolean("pinned"),
                                            "expected_revision" to message.getInt("revision"),
                                        ),
                                    )
                                    reload++
                                }
                            }
                            TextButton(
                                {
                                    model.run {
                                        model.repository.mutate(
                                            "core:rooms/react",
                                            model.workspaceQuery.put("room_id", roomId),
                                            obj(
                                                "id" to message.str("id"),
                                                "emoji" to "👍",
                                                "active" to true,
                                            ),
                                        )
                                        reload++
                                    }
                                },
                                enabled = model.canWrite,
                            ) {
                                Text("👍")
                            }
                        }
                    }
                }
            }
            if (identity == null)
                Action(
                    "room_keys",
                    Icons.Outlined.Lock,
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                ) {
                    unlock = true
                }
            else
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        text,
                        {
                            text = it.take(16000)
                            transaction = UUID.randomUUID().toString()
                        },
                        Modifier.weight(1f),
                        placeholder = { Text(tr("message")) },
                        maxLines = 5,
                        enabled = !model.busy,
                    )
                    IconAction(
                        "send",
                        Icons.Outlined.Send,
                        !model.busy && text.isNotBlank() && room.optBoolean("can_write"),
                    ) {
                        val content = text
                        val current = identity!!
                        model.run {
                            require(keys.array("missing").length() == 0) {
                                "Every participant must set up a Rooms identity first"
                            }
                            val messageContext =
                                obj(
                                    "workspace_id" to model.workspaceId,
                                    "room_id" to roomId,
                                    "author_id" to current.public.getString("owner_id"),
                                    "transaction_id" to transaction,
                                    "thread_id" to thread,
                                    "content_revision" to 1,
                                    "references" to JSONArray(),
                                    "attachment_ids" to JSONArray(),
                                )
                            val envelope =
                                withContext(Dispatchers.Default) {
                                    RoomCrypto.seal(
                                        current,
                                        messageContext,
                                        obj("body" to content, "attachments" to JSONArray()),
                                        keys.array("identities").objects(),
                                    )
                                }
                            model.repository.mutate(
                                "core:rooms/send",
                                model.workspaceQuery.put("room_id", roomId),
                                obj(
                                    "body" to "",
                                    "sealed" to envelope,
                                    "references" to JSONArray(),
                                    "transaction_id" to transaction,
                                    "thread_id" to thread,
                                ),
                            )
                            if (text == content) text = ""
                            transaction = UUID.randomUUID().toString()
                            reload++
                        }
                    }
                }
        }
    if (unlock)
        AlertDialog(
            onDismissRequest = { if (!model.busy) unlock = false },
            title = { Text(tr("room_keys")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (identity != null) {
                        Action("save", Icons.Outlined.FileDownload) {
                            export.launch("monolith-rooms-recovery.json")
                        }
                    } else {
                        Text(tr("password"))
                        OutlinedTextField(
                            password,
                            { password = it },
                            visualTransformation = PasswordVisualTransformation(),
                            label = { Text(tr("password")) },
                        )
                        Action("open_document", Icons.Outlined.FileOpen, secondary = true) {
                            import.launch("application/json")
                        }
                        backup?.let { Caption(it.getJSONObject("identity").str("owner_id")) }
                    }
                }
            },
            confirmButton = {
                if (identity == null)
                    TextButton(
                        {
                            model.run {
                                val owner = model.repository.api.session!!.accountId
                                val existing = model.repository.api.call("core:rooms/myIdentity")
                                require(backup != null || existing == JSONObject.NULL) {
                                    "Import your existing Rooms recovery file"
                                }
                                val created =
                                    withContext(Dispatchers.Default) {
                                        backup?.let { RoomCrypto.restore(it, password, owner) }
                                            ?: RoomCrypto.create(owner, password)
                                    }
                                if (existing is JSONObject)
                                    require(
                                        RoomCrypto.canonical(existing) ==
                                            RoomCrypto.canonical(created.public)
                                    ) {
                                        "Recovery identity does not match this account"
                                    }
                                model.repository.mutate(
                                    "core:rooms/registerIdentity",
                                    JSONObject(),
                                    obj(
                                        "identity" to created.public,
                                        "proof" to
                                            RoomCrypto.sign(
                                                created,
                                                obj(
                                                    "purpose" to "monolith/rooms/enroll/v1",
                                                    "identity" to created.public,
                                                ),
                                            ),
                                    ),
                                )
                                withContext(Dispatchers.IO) {
                                    model.repository.vault.write(
                                        identityKey,
                                        created.secret().toString(),
                                    )
                                }
                                identity = created
                                password = ""
                                backup = null
                            }
                        },
                        enabled = !model.busy,
                    ) {
                        Text(tr("confirm"))
                    }
            },
            dismissButton = { TextButton({ unlock = false }) { Text(tr("close")) } },
        )
}
