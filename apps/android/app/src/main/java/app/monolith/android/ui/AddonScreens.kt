package app.monolith.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import kotlin.math.*
import org.json.JSONArray
import org.json.JSONObject

/** Native rendering of structured results; never evaluates addon JS or HTML. */
@Composable
fun NativeValue(value: Any?, depth: Int = 0) {
    when (value) {
        null,
        JSONObject.NULL -> Unit
        is JSONObject ->
            value
                .entries()
                .filterNot { (k, _) ->
                    k in
                        setOf(
                            "accessToken",
                            "refreshToken",
                            "key",
                            "secret",
                            "clientSecret",
                            "sealed",
                            "content",
                            "document",
                            "snapshot",
                        )
                }
                .forEach { (key, child) ->
                    Column(
                        Modifier.padding(start = if (depth > 0) 8.dp else 0.dp, bottom = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Caption(tr(key))
                        if (depth < 4 && child is JSONObject || depth < 3 && child is JSONArray)
                            NativeValue(child, depth + 1)
                        else Text(child.displayText(), style = MaterialTheme.typography.bodyMedium)
                    }
                }
        is JSONArray -> value.values().forEach { child -> NativeValue(child, depth + 1) }
        else -> Text(value.displayText(), style = MaterialTheme.typography.bodyMedium)
    }
}

private fun landing(section: String): String? =
    when (section) {
        "atlas" -> "atlas:snapshot"
        "automations" -> "automations:flows/list"
        "agents" -> "agents:snapshot"
        "redraw" -> "redraw:projects/list"
        "gym" -> "gym:snapshot"
        "tech_lab" -> "tech-lab:snapshot"
        "urpg" -> "databases:urpg/snapshot"
        "calendar_tools" -> "databases:calendar/notifications"
        "account_tools" -> "core:user/me"
        "workspace_tools" -> "databases:workspaces/members"
        "shop" -> "core:modules/shop/catalog"
        else -> null
    }

private fun operations(model: MainModel, section: String): List<Endpoint> =
    model.repository.contracts.endpoints.values
        .filter { e ->
            when (section) {
                "tools" ->
                    e.module in listOf("core", "databases") &&
                        !e.route.startsWith("auth/") &&
                        !e.route.startsWith("rooms/") &&
                        !e.route.startsWith("ai/") &&
                        !e.route.startsWith("user/auth/") &&
                        !e.route.startsWith("search/clear")
                "account_tools" ->
                    e.module == "core" &&
                        (e.route.startsWith("user/settings/") ||
                            e.route.startsWith("user/personalization/") ||
                            e.route.startsWith("auth/2fa/"))
                "workspace_tools" -> e.module == "databases" && e.route.startsWith("workspaces/")
                "calendar_tools" -> e.module == "databases" && e.route.startsWith("calendar/")
                "shop" -> e.module == "core" && e.route.startsWith("modules/")
                "urpg" ->
                    e.module == "databases" &&
                        (e.route.startsWith("urpg/") || e.route.startsWith("workspaceWidgets/"))
                else -> e.module == section.replace('_', '-') && !e.route.startsWith("runtime/")
            }
        }
        .filterNot { it.route == "workspaces" }
        .sortedBy { it.route }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddonScreen(model: MainModel, section: String) {
    val endpoint = landing(section)
    var data by remember(section, model.workspaceId) { mutableStateOf<Any?>(null) }
    var loadError by remember(section) { mutableStateOf("") }
    var collection by remember(section) { mutableStateOf("") }
    var selected by remember(section, model.workspaceId) { mutableStateOf<JSONObject?>(null) }
    var tools by remember(section) { mutableStateOf(endpoint == null) }
    var graph by remember(section) { mutableStateOf(section == "atlas") }
    var reload by remember { mutableIntStateOf(0) }
    val available = remember(section) { operations(model, section) }
    LaunchedEffect(endpoint, model.workspaceId, model.reload, reload) {
        if (endpoint == null) return@LaunchedEffect
        try {
            loadError = ""
            val q =
                Schema.seed(model.repository.contracts[endpoint].query) as? JSONObject
                    ?: JSONObject()
            if (
                model.repository.contracts[endpoint]
                    .query
                    .objectOrEmpty("properties")
                    .has("workspace_id")
            )
                q.put("workspace_id", model.workspaceId)
            if (section == "gym") q.put("today", java.time.LocalDate.now().toString())
            data = model.repository.load(endpoint, q).value
        } catch (cause: Throwable) {
            if (cause is kotlinx.coroutines.CancellationException) throw cause
            loadError = cause.message.orEmpty()
        }
    }
    val groups =
        (data as? JSONObject)
            ?.entries()
            ?.filter { it.second is JSONArray && it.first !in listOf("edges", "links") }
            .orEmpty()
    val group = collection.ifBlank { groups.firstOrNull()?.first ?: "" }
    val rawRows =
        if (data is JSONArray) (data as JSONArray).objects()
        else (data as? JSONObject)?.array(group)?.objects().orEmpty()
    val rows =
        if (section == "tech_lab" && group == "health") {
            val services =
                (data as? JSONObject)
                    ?.array("services")
                    ?.objects()
                    ?.associateBy { it.str("id") }
                    .orEmpty()
            rawRows.map { health ->
                val name =
                    services[health.str("service_id")]
                        ?.str("name")
                        .orEmpty()
                        .ifBlank { health.objectOrEmpty("latest").str("service_name") }
                        .ifBlank { health.str("service_id") }
                health.withValue("name", name)
            }
        } else rawRows
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Heading(tr(section)) {
                if (section == "redraw")
                    IconAction("new_project", Icons.Outlined.Add, model.canWrite) {
                        model.form(
                            "redraw:projects/create",
                            obj("document" to blankDrawing()),
                            title = "new_project",
                            hidden = setOf("document"),
                        )
                    }
                IconAction("refresh", Icons.Outlined.Refresh) { reload++ }
                IconAction("options", Icons.Outlined.Tune) { tools = !tools }
            }
            if (loadError.isNotBlank()) ErrorBanner(loadError) { loadError = "" }
            if (groups.size > 1)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(groups.map { it.first }) { key ->
                        FilterChip(
                            group == key,
                            {
                                collection = key
                                graph = false
                            },
                            label = { Text(tr(key)) },
                        )
                    }
                }
            if (section == "atlas")
                Row {
                    FilterChip(graph, { graph = true }, label = { Text(tr("atlas")) })
                    Spacer(Modifier.width(8.dp))
                    FilterChip(!graph, { graph = false }, label = { Text(tr("list")) })
                }
        }
        if (section == "atlas" && graph && data is JSONObject)
            KnowledgeGraph(data as JSONObject) { selected = it }
        else
            LazyColumn(
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (tools)
                    items(available, key = { it.id }) { operation ->
                        MonoCard(
                            onClick = {
                                val initial =
                                    when (operation.id) {
                                        "redraw:projects/create" ->
                                            obj("document" to blankDrawing())
                                        "automations:flows/create" -> obj("graph" to blankFlow())
                                        else -> JSONObject()
                                    }
                                model.form(
                                    operation.id,
                                    initial,
                                    title = operation.route.substringAfterLast('/'),
                                    hidden =
                                        if (operation.id == "redraw:projects/create")
                                            setOf("document")
                                        else emptySet(),
                                )
                            }
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    tr(operation.route.substringAfterLast('/')),
                                    Modifier.weight(1f),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Icon(
                                    if (operation.method == "GET") Icons.Outlined.ChevronRight
                                    else Icons.Outlined.Add,
                                    null,
                                )
                            }
                            if (operation.description.isNotBlank())
                                Text(
                                    operation.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                        }
                    }
                items(rows) { item ->
                    MonoCard(onClick = { selected = item }) {
                        Text(
                            item.str("title").ifBlank {
                                item.str("name").ifBlank {
                                    item.str("task_title").ifBlank { item.str("id") }
                                }
                            },
                            style = MaterialTheme.typography.titleMedium,
                        )
                        val caption =
                            listOf(
                                    item.str("status"),
                                    item.str("role"),
                                    item.str("date"),
                                    item.str("description"),
                                )
                                .filter { it.isNotBlank() }
                        if (caption.isNotEmpty())
                            Text(
                                caption.joinToString(" · "),
                                maxLines = 3,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        if (item.has("enabled"))
                            Caption(tr(if (item.optBoolean("enabled")) "enabled" else "planned"))
                    }
                }
                if (data is JSONObject && groups.isEmpty()) item { MonoCard { NativeValue(data) } }
                if (rows.isEmpty() && (data is JSONArray || groups.isNotEmpty()))
                    item { EmptyState("empty") }
                if (data == null && loadError.isBlank() && endpoint != null)
                    item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                if (!tools)
                    item {
                        Action(
                            "manage",
                            Icons.Outlined.Tune,
                            secondary = true,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            tools = true
                        }
                    }
            }
    }
    val item = selected
    if (item != null)
        ModalBottomSheet(
            onDismissRequest = { selected = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            LazyColumn(
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item { Heading(item.displayText()) }
                if (section == "redraw")
                    item {
                        Action("edit", Icons.Outlined.Draw, enabled = model.canWrite) {
                            model.navigate("redraw_editor:${item.str("id")}")
                            selected = null
                        }
                    }
                if (section == "automations") item { FlowDiagram(item.objectOrEmpty("graph")) }
                item { NativeValue(item) }
                items(
                    available.filter {
                        it.method != "GET" ||
                            it.route.endsWith("history") ||
                            it.route.endsWith("get")
                    }
                ) { operation ->
                    Action(
                        operation.route.substringAfterLast('/'),
                        secondary = true,
                        enabled = operation.method == "GET" || model.canWrite,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        val query = obj("id" to item.str("id"), "workspace_id" to model.workspaceId)
                        val initial = item.copy()
                        if (section == "automations" && operation.route.endsWith("run")) {
                            initial.put("input", JSONObject())
                            initial.put("trigger", "manual")
                        }
                        model.form(
                            operation.id,
                            initial,
                            query,
                            title = operation.route.substringAfterLast('/'),
                        )
                        selected = null
                    }
                }
            }
        }
}

@OptIn(ExperimentalTextApi::class)
@Composable
fun KnowledgeGraph(data: JSONObject, onSelect: (JSONObject) -> Unit) {
    val nodes = data.array("nodes").objects()
    var scale by remember { mutableFloatStateOf(1f) }
    var pan by remember { mutableStateOf(Offset.Zero) }
    val text = rememberTextMeasurer()
    val color = MaterialTheme.colorScheme.onSurface
    val border = MaterialTheme.colorScheme.outlineVariant
    val points =
        remember(nodes.toString()) {
            nodes
                .mapIndexed { index, node ->
                    node.str("key").ifBlank { node.str("id") } to
                        Offset(
                            cos(index * 2 * PI / maxOf(nodes.size, 1)).toFloat() * 220,
                            sin(index * 2 * PI / maxOf(nodes.size, 1)).toFloat() * 220,
                        )
                }
                .toMap()
        }
    Canvas(
        Modifier.fillMaxWidth()
            .height(440.dp)
            .pointerInput(Unit) {
                detectTransformGestures { _, p, z, _ ->
                    pan += p
                    scale = (scale * z).coerceIn(.2f, 4f)
                }
            }
            .pointerInput(nodes, scale, pan) {
                detectTapGestures { tap ->
                    val selected = nodes.minByOrNull { node ->
                        val p =
                            (points[node.str("key").ifBlank { node.str("id") }] ?: Offset.Zero) *
                                scale + pan + Offset(size.width / 2f, size.height / 2f)
                        (tap - p).getDistance()
                    }
                    if (selected != null) onSelect(selected)
                }
            }
    ) {
        fun position(key: String) = (points[key] ?: Offset.Zero) * scale + pan + center
        data.array("edges").objects().forEach { edge ->
            drawLine(border, position(edge.str("source")), position(edge.str("target")), 1.5f)
        }
        nodes.forEach { node ->
            val p = position(node.str("key").ifBlank { node.str("id") })
            drawCircle(color, 7f * scale, p)
            drawText(
                text,
                node.str("title").take(28),
                topLeft = p + Offset(12f, 5f),
                style =
                    androidx.compose.ui.text.TextStyle(
                        color = color,
                        fontSize =
                            androidx.compose.ui.unit.TextUnit(
                                11f,
                                androidx.compose.ui.unit.TextUnitType.Sp,
                            ),
                    ),
            )
        }
    }
}

@Composable
fun FlowDiagram(graph: JSONObject) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        graph.array("nodes").objects().forEach { node ->
            MonoCard(Modifier.fillMaxWidth()) {
                Caption(node.str("kind"))
                Text(node.str("name"))
                graph
                    .array("edges")
                    .objects()
                    .filter { it.str("source") == node.str("id") }
                    .forEach { edge ->
                        Caption(
                            "↓ ${edge.str("port")} · ${graph.array("nodes").objects().firstOrNull{it.str("id")==edge.str("target")}?.str("name") ?: ""}"
                        )
                    }
            }
        }
    }
}
