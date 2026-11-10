package app.monolith.android.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import org.json.JSONObject

@Composable
fun Heading(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            subtitle?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        action?.invoke()
    }
}

@Composable
fun HomeScreen(model: MainModel) {
    val today = LocalDate.now().toString()
    val actions = model.records.filter { it.str("item_type") == "task" && !it.optBoolean("done") }
    val upcoming =
        model.records
            .filter { it.str("date").take(10) >= today && it.str("date").isNotEmpty() }
            .sortedBy { it.str("date") }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Caption(
                LocalDate.now()
                    .format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.getDefault()))
                    .uppercase()
            )
            Spacer(Modifier.height(10.dp))
            Heading(tr("today"), tr("focus")) {
                IconAction("refresh", Icons.Outlined.Refresh, action = model::refresh)
            }
        }
        item {
            MonoCard(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Caption(tr("actions"))
                        Text(
                            actions.size.toString().padStart(2, '0'),
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Light,
                            letterSpacing = (-2).sp,
                        )
                    }
                    Column {
                        Caption(tr("projects"))
                        Text(
                            model.records
                                .count {
                                    it.str("item_type") == "project" && !it.optBoolean("done")
                                }
                                .toString()
                                .padStart(2, '0'),
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Light,
                            letterSpacing = (-2).sp,
                        )
                    }
                    Column {
                        Caption(tr("docs"))
                        Text(
                            model.pages.size.toString().padStart(2, '0'),
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Light,
                            letterSpacing = (-2).sp,
                        )
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Action(
                        "new_action",
                        Icons.Outlined.Add,
                        model.canWrite,
                        modifier = Modifier.weight(1f),
                    ) {
                        model.createRecord("task")
                    }
                    IconAction("new_page", Icons.Outlined.NoteAdd, model.canWrite) {
                        model.form(
                            "databases:workspaces/createPage",
                            obj("title" to "", "parent_id" to null),
                            title = "new_page",
                        )
                    }
                }
            }
        }
        if (model.sharedText.isNotBlank())
            item {
                MonoCard(onClick = { model.createRecord("note") }) {
                    Caption(tr("quick_capture"))
                    Text(model.sharedText, maxLines = 4)
                    Text(tr("save"), fontWeight = FontWeight.SemiBold)
                }
            }
        item {
            Heading(tr("actions")) { TextButton({ model.navigate("actions") }) { Text(tr("all")) } }
        }
        if (actions.isEmpty())
            item { EmptyState("empty", icon = Icons.Outlined.CheckCircleOutline) }
        items(actions.take(4), key = { it.str("id") }) { RecordCard(model, it) }
        item {
            Heading(tr("upcoming")) {
                IconAction("calendar", Icons.Outlined.ArrowForward) { model.navigate("calendar") }
            }
        }
        items(upcoming.take(3), key = { "upcoming:${it.str("id")}" }) { record ->
            MonoCard(
                Modifier.fillMaxWidth(),
                onClick = { model.openDocument("record", record.str("id")) },
            ) {
                Caption(record.str("date").replace('T', ' ').take(16))
                Text(record.str("title"), fontWeight = FontWeight.Medium)
            }
        }
        item { Heading(tr("recent_pages")) }
        items(model.pages.take(5), key = { "page:${it.str("id")}" }) { page ->
            MonoCard(onClick = { model.openDocument("page", page.str("id")) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Description, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(page.str("title"), Modifier.weight(1f))
                    Icon(Icons.Outlined.ArrowOutward, null, Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
fun RecordCard(model: MainModel, record: JSONObject, onClick: (() -> Unit)? = null) {
    val strings = LocalStrings.current
    MonoCard(
        Modifier.fillMaxWidth(),
        onClick = onClick ?: { model.openDocument("record", record.str("id")) },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (record.str("item_type") == "task")
                Checkbox(
                    record.optBoolean("done"),
                    onCheckedChange = { model.toggle(record) },
                    enabled = model.canWrite && !model.busy,
                )
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(
                    record.str("title").ifBlank { tr("untitled") },
                    fontWeight = FontWeight.Medium,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                val caption =
                    listOf(
                            record.str("date").take(10),
                            record.str("status"),
                            record.str("priority").takeIf { it !in listOf("normal", "") } ?: "",
                        )
                        .filter(String::isNotBlank)
                if (caption.isNotEmpty()) Caption(caption.joinToString(" · ") { strings(it) })
            }
            if (model.canWrite)
                IconAction("properties", Icons.Outlined.MoreHoriz) { model.editRecord(record) }
        }
    }
}

@Composable
fun RecordsScreen(model: MainModel) {
    var filter by remember(model.section) { mutableStateOf("all") }
    var layout by
        remember(model.section) {
            mutableStateOf(if (model.section == "projects") "board" else "list")
        }
    var search by remember(model.section) { mutableStateOf("") }
    val base = model.selectedBase
    val project = model.selectedProject
    val kind =
        when (model.section) {
            "actions" -> "task"
            "projects" -> if (project == null) "project" else "task"
            "journal" -> "note"
            else -> null
        }
    val filtered =
        model.records
            .filter { record ->
                (kind == null || record.str("item_type") == kind) &&
                    (base == null || record.str("base_id") == base.str("id")) &&
                    (project == null || record.str("project_id") == project.str("id")) &&
                    record.str("title").contains(search, true) &&
                    when (filter) {
                        "today" ->
                            record.str("date").take(10) == LocalDate.now().toString() &&
                                !record.optBoolean("done")
                        "upcoming" ->
                            record.str("date").take(10) > LocalDate.now().toString() &&
                                !record.optBoolean("done")
                        "completed" -> record.optBoolean("done")
                        "high_priority" ->
                            record.str("priority") in listOf("high", "urgent") &&
                                !record.optBoolean("done")
                        else -> true
                    }
            }
            .sortedWith(
                compareBy<JSONObject> { it.optBoolean("done") }.thenBy { it.str("date", "9999") }
            )
    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Heading(base?.str("name") ?: project?.str("title") ?: tr(model.section)) {
                IconAction("add", Icons.Outlined.Add, model.canWrite) {
                    if (model.section == "databases" && base == null)
                        model.form(
                            "databases:workspaceDatabases/createBase",
                            title = "new_database",
                        )
                    else model.createRecord(kind ?: "page")
                }
            }
            if (model.section == "databases" && base != null)
                Row {
                    Action("fields", secondary = true, enabled = model.canWrite) {
                        model.form(
                            "databases:workspaceDatabases/createField",
                            obj("base_id" to base.str("id")),
                            title = "fields",
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Action("views", secondary = true, enabled = model.canWrite) {
                        model.form(
                            "databases:workspaceDatabases/createView",
                            obj("base_id" to base.str("id")),
                            title = "views",
                        )
                    }
                }
            OutlinedTextField(
                search,
                { search = it },
                Modifier.fillMaxWidth(),
                placeholder = { Text(tr("search")) },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                singleLine = true,
            )
            if (model.section == "actions")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("all", "today", "upcoming", "high_priority", "completed")) { key ->
                        FilterChip(filter == key, { filter = key }, label = { Text(tr(key)) })
                    }
                }
            else if (model.section != "journal" && (model.section != "databases" || base != null))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("list", "board", "table", "timeline").forEach { key ->
                        FilterChip(layout == key, { layout = key }, label = { Text(tr(key)) })
                    }
                }
        }
        if (model.section == "databases" && base == null)
            LazyColumn(
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(model.bases, key = { it.str("id") }) { item ->
                    MonoCard(onClick = { model.selectedBase = item }) {
                        Icon(Icons.Outlined.TableChart, null)
                        Text(item.str("name"), style = MaterialTheme.typography.titleMedium)
                        Caption(
                            "${model.records.count{it.str("base_id")==item.str("id")}} ${tr("records")}"
                        )
                    }
                }
                if (model.bases.isEmpty()) item { EmptyState("empty") }
            }
        else if (layout == "board") {
            val groups = filtered.groupBy {
                it.str("status").ifBlank { if (it.optBoolean("done")) "done" else "planned" }
            }
            LazyRow(
                contentPadding = PaddingValues(20.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items((listOf("planned", "active", "done") + groups.keys).distinct()) { group ->
                    LazyColumn(
                        Modifier.width(292.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item { Caption("${tr(group)}  ${groups[group].orEmpty().size}") }
                        items(groups[group].orEmpty(), key = { it.str("id") }) { record ->
                            RecordCard(
                                model,
                                record,
                                if (kind == "project") ({ model.selectedProject = record })
                                else null,
                            )
                        }
                    }
                }
            }
        } else if (layout == "table") {
            val fields =
                model.snapshot.array("fields").objects().filter {
                    base == null || it.str("base_id") == base.str("id")
                }
            Column(Modifier.horizontalScroll(rememberScrollState())) {
                Row(Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
                    (listOf("title", "status", "date") + fields.map { it.str("name") }).forEach {
                        Text(tr(it), Modifier.width(180.dp), fontWeight = FontWeight.SemiBold)
                    }
                }
                LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp)) {
                    items(filtered, key = { it.str("id") }) { record ->
                        Row(
                            Modifier.clickable { model.openDocument("record", record.str("id")) }
                                .padding(vertical = 16.dp)
                        ) {
                            listOf("title", "status", "date").forEach {
                                Text(record.str(it), Modifier.width(180.dp), maxLines = 2)
                            }
                            fields.forEach { field ->
                                Text(
                                    record
                                        .objectOrEmpty("values")
                                        .opt(field.str("id"))
                                        .displayText(),
                                    Modifier.width(180.dp),
                                    maxLines = 2,
                                )
                            }
                        }
                        HorizontalDivider()
                    }
                }
            }
        } else
            LazyColumn(
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (filtered.isEmpty()) item { EmptyState("empty") }
                items(filtered, key = { it.str("id") }) { record ->
                    if (layout == "timeline")
                        Caption(record.str("date").take(10).ifBlank { tr("upcoming") })
                    RecordCard(
                        model,
                        record,
                        if (kind == "project") ({ model.selectedProject = record }) else null,
                    )
                }
            }
    }
}

@Composable
fun PagesScreen(model: MainModel) {
    var search by remember { mutableStateOf("") }
    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Heading(tr("docs")) {
                IconAction("new_page", Icons.Outlined.Add, model.canWrite) {
                    model.form(
                        "databases:workspaces/createPage",
                        obj("title" to "", "parent_id" to null),
                        title = "new_page",
                    )
                }
            }
        }
        item {
            OutlinedTextField(
                search,
                { search = it },
                Modifier.fillMaxWidth(),
                placeholder = { Text(tr("search_hint")) },
                singleLine = true,
            )
        }
        items(
            model.pages.filter { it.str("title").contains(search, true) },
            key = { it.str("id") },
        ) { page ->
            val parent = model.pages.firstOrNull { it.str("id") == page.str("parent_id") }
            MonoCard(onClick = { model.openDocument("page", page.str("id")) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Description, null, Modifier.size(22.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            page.str("title").ifBlank { tr("untitled") },
                            fontWeight = FontWeight.Medium,
                        )
                        parent?.let { Caption(it.str("title")) }
                    }
                    IconAction("edit", Icons.Outlined.MoreHoriz, model.canWrite) {
                        model.form(
                            "databases:workspaces/updatePageMetadata",
                            page,
                            obj("id" to page.str("id")),
                            title = "properties",
                        )
                    }
                }
            }
        }
        if (model.pages.isEmpty()) item { EmptyState("empty") }
    }
}

@Composable
fun CalendarScreen(model: MainModel) {
    var selected by remember { mutableStateOf(LocalDate.now()) }
    var month by remember { mutableStateOf(YearMonth.now()) }
    var mode by remember { mutableStateOf("month") }
    var detail by remember { mutableStateOf<CalendarOccurrence?>(null) }
    val zone = java.time.ZoneId.systemDefault()
    val from =
        if (mode == "agenda") LocalDate.now().atStartOfDay(zone).toInstant()
        else month.atDay(1).minusDays(7).atStartOfDay(zone).toInstant()
    val to =
        if (mode == "agenda") LocalDate.now().plusMonths(3).atStartOfDay(zone).toInstant()
        else month.atEndOfMonth().plusDays(8).atStartOfDay(zone).toInstant()
    val occurrences =
        remember(model.snapshot, model.schedules, from, to) {
            model.records
                .flatMap { record ->
                    Calendar.expand(
                        record,
                        from,
                        to,
                        model.snapshot.array("fields").objects(),
                        model.schedules.firstOrNull { it.str("record_id") == record.str("id") },
                    )
                }
                .sortedBy { it.start }
        }
    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Heading(tr("calendar")) {
                IconAction("new_event", Icons.Outlined.Add, model.canWrite) {
                    model.createRecord("event", selected.toString())
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("month", "week", "agenda").forEach { key ->
                    FilterChip(mode == key, { mode = key }, label = { Text(tr(key)) })
                }
            }
        }
        if (mode != "agenda")
            item {
                MonoCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconAction("back", Icons.Outlined.ChevronLeft) {
                            if (mode == "week") {
                                selected = selected.minusWeeks(1)
                                month = YearMonth.from(selected)
                            } else {
                                month = month.minusMonths(1)
                                selected = month.atDay(1)
                            }
                        }
                        Text(
                            month.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                            Modifier.weight(1f),
                            fontWeight = FontWeight.SemiBold,
                        )
                        IconAction("upcoming", Icons.Outlined.ChevronRight) {
                            if (mode == "week") {
                                selected = selected.plusWeeks(1)
                                month = YearMonth.from(selected)
                            } else {
                                month = month.plusMonths(1)
                                selected = month.atDay(1)
                            }
                        }
                    }
                    val start =
                        if (mode == "week")
                            selected.minusDays((selected.dayOfWeek.value - 1).toLong())
                        else month.atDay(1).minusDays((month.atDay(1).dayOfWeek.value - 1).toLong())
                    val days = if (mode == "week") 7 else 42
                    (0 until days).chunked(7).forEach { week ->
                        Row(Modifier.fillMaxWidth()) {
                            week.forEach { offset ->
                                val date = start.plusDays(offset.toLong())
                                val marked = occurrences.any {
                                    it.start.atZone(zone).toLocalDate() == date
                                }
                                Column(
                                    Modifier.weight(1f)
                                        .heightIn(min = 52.dp)
                                        .background(
                                            if (date == selected) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.surface,
                                            RoundedCornerShape(9.dp),
                                        )
                                        .clickable { selected = date }
                                        .padding(vertical = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        date.dayOfMonth.toString(),
                                        color =
                                            if (date == selected)
                                                MaterialTheme.colorScheme.onPrimary
                                            else if (YearMonth.from(date) == month)
                                                MaterialTheme.colorScheme.onSurface
                                            else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        if (marked) "·" else " ",
                                        color =
                                            if (date == selected)
                                                MaterialTheme.colorScheme.onPrimary
                                            else MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        item {
            Caption(
                if (mode == "agenda") tr("upcoming")
                else selected.format(DateTimeFormatter.ofPattern("EEEE, d MMMM"))
            )
        }
        val shown = occurrences.filter {
            mode == "agenda" ||
                (it.start.atZone(zone).toLocalDate() <= selected &&
                    it.end.minusMillis(1).atZone(zone).toLocalDate() >= selected)
        }
        items(shown, key = { it.id }) { occurrence ->
            MonoCard(onClick = { detail = occurrence }) {
                Caption(
                    occurrence.start
                        .atZone(zone)
                        .format(
                            DateTimeFormatter.ofPattern(
                                if (occurrence.allDay) "EEE, d MMM" else "EEE, d MMM · HH:mm"
                            )
                        )
                )
                Text(occurrence.record.str("title"), style = MaterialTheme.typography.titleMedium)
            }
        }
        if (shown.isEmpty()) item { EmptyState("empty", icon = Icons.Outlined.EventAvailable) }
        item {
            Action("notifications", Icons.Outlined.NotificationsNone, secondary = true) {
                model.navigate("calendar_tools")
            }
        }
    }
    detail?.let { occurrence ->
        AlertDialog(
            onDismissRequest = { detail = null },
            title = { Text(occurrence.record.str("title")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(occurrence.start.atZone(zone).toString())
                    Action("open_document", secondary = true) {
                        detail = null
                        model.openDocument("record", occurrence.record.str("id"))
                    }
                    if (model.canWrite) {
                        Action("properties", secondary = true) {
                            detail = null
                            model.editRecord(occurrence.record)
                        }
                        Action("calendar", secondary = true) {
                            val initial = occurrence.schedule?.copy() ?: obj("revision" to 0)
                            if (!initial.has("settings"))
                                initial.put(
                                    "settings",
                                    Schema.seed(
                                        model.repository.contracts["databases:calendar/save"]
                                            .body
                                            .getJSONObject("properties")
                                            .getJSONObject("settings")
                                    ),
                                )
                            detail = null
                            model.form(
                                "databases:calendar/save",
                                initial,
                                model.workspaceQuery.put("record_id", occurrence.record.str("id")),
                                title = "calendar",
                            )
                        }
                        if (occurrence.schedule != null)
                            Action("edit", secondary = true) {
                                detail = null
                                model.form(
                                    "databases:calendar/occurrence",
                                    obj(
                                        "revision" to occurrence.schedule.getInt("revision"),
                                        "original" to occurrence.original,
                                        "change" to
                                            obj(
                                                "start" to occurrence.start.toString(),
                                                "end" to occurrence.end.toString(),
                                            ),
                                    ),
                                    model.workspaceQuery.put(
                                        "record_id",
                                        occurrence.record.str("id"),
                                    ),
                                    title = "edit",
                                )
                            }
                    }
                }
            },
            confirmButton = { TextButton({ detail = null }) { Text(tr("close")) } },
        )
    }
}

@Composable
fun SearchScreen(model: MainModel) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    LaunchedEffect(query, model.workspaceId) {
        if (query.isBlank()) {
            results = emptyList()
            return@LaunchedEffect
        }
        delay(350)
        searching = true
        try {
            val result =
                model.repository.api.call(
                    "core:search/query",
                    body =
                        obj(
                            "workspace_id" to model.workspaceId,
                            "query" to query,
                            "mode" to "keyword",
                            "answer" to false,
                        ),
                ) as JSONObject
            results = result.array("hits").objects()
        } catch (cause: Throwable) {
            model.fail(cause)
        } finally {
            searching = false
        }
    }
    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Heading(tr("search")) }
        item {
            OutlinedTextField(
                query,
                { query = it },
                Modifier.fillMaxWidth(),
                placeholder = { Text(tr("search_hint")) },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                singleLine = true,
            )
        }
        if (searching) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        items(results) { hit ->
            MonoCard(
                onClick = {
                    val source = hit.str("source_id")
                    val kind = source.substringBefore(':')
                    val id = source.substringAfter(':', "")
                    if (
                        kind in listOf("page", "record", "note") &&
                            runCatching { java.util.UUID.fromString(id) }.isSuccess
                    )
                        model.openDocument(kind, id)
                    else model.operationResult = hit
                }
            ) {
                Text(hit.str("title"), fontWeight = FontWeight.SemiBold)
                Text(
                    hit.str("excerpt").ifBlank { hit.str("text") },
                    maxLines = 4,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (query.isNotBlank() && !searching && results.isEmpty()) item { EmptyState("no_results") }
    }
}

@Composable
fun SettingsScreen(model: MainModel) {
    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Heading(tr("settings")) }
        item {
            MonoCard {
                Text(tr("appearance"), style = MaterialTheme.typography.titleMedium)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(tr("dark_mode"), Modifier.weight(1f))
                    Switch(
                        model.preferences.optBoolean("dark", isSystemInDarkTheme()),
                        { model.updatePreference("dark", it) },
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(tr("reduced_motion"), Modifier.weight(1f))
                    Switch(
                        model.preferences.optBoolean("reduced_motion"),
                        { model.updatePreference("reduced_motion", it) },
                    )
                }
            }
        }
        item {
            MonoCard {
                Text(tr("connection"), style = MaterialTheme.typography.titleMedium)
                Caption(model.server)
                Action(
                    "sign_out",
                    Icons.Outlined.Logout,
                    secondary = true,
                    enabled = !model.busy,
                    onClick = model::signOut,
                )
            }
        }
        item {
            Action(
                "account",
                Icons.Outlined.PersonOutline,
                secondary = true,
                modifier = Modifier.fillMaxWidth(),
            ) {
                model.navigate("account_tools")
            }
        }
        item {
            Action(
                "members",
                Icons.Outlined.Group,
                secondary = true,
                modifier = Modifier.fillMaxWidth(),
            ) {
                model.navigate("workspace_tools")
            }
        }
        item {
            Action(
                "addons",
                Icons.Outlined.Extension,
                secondary = true,
                modifier = Modifier.fillMaxWidth(),
            ) {
                model.navigate("shop")
            }
        }
        item {
            Action(
                "tools",
                Icons.Outlined.Widgets,
                secondary = true,
                modifier = Modifier.fillMaxWidth(),
            ) {
                model.navigate("tools")
            }
        }
    }
}
