package app.monolith.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import app.monolith.android.editor.Draft
import java.util.UUID
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

fun blankDrawing() =
    obj(
        "version" to 1,
        "pages" to
            JSONArray()
                .put(
                    obj(
                        "id" to UUID.randomUUID().toString(),
                        "name" to "1",
                        "mode" to "canvas",
                        "background" to "#ffffff",
                        "elements" to JSONArray(),
                        "connectors" to JSONArray(),
                    )
                ),
    )

fun blankFlow() =
    obj(
        "version" to 1,
        "nodes" to
            JSONArray()
                .put(
                    obj(
                        "id" to UUID.randomUUID().toString(),
                        "name" to "Start",
                        "kind" to "trigger",
                        "x" to 80,
                        "y" to 80,
                        "config" to JSONObject(),
                    )
                ),
        "edges" to JSONArray(),
    )

private fun color(value: String, fallback: Color = Color.Gray) = runCatching {
    Color(android.graphics.Color.parseColor(value))
}.getOrDefault(fallback)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DrawingScreen(model: MainModel, id: String) {
    val accountScope = model.repository.api.session!!.scope
    val workspace = model.workspaceId
    var project by remember(id) { mutableStateOf<JSONObject?>(null) }
    var document by remember(id) { mutableStateOf<JSONObject?>(null) }
    var dirty by remember(id) { mutableStateOf(false) }
    var generation by remember(id) { mutableLongStateOf(0) }
    var pageIndex by remember(id) { mutableIntStateOf(0) }
    var selected by remember(id) { mutableStateOf("") }
    var inspector by remember { mutableStateOf(false) }
    var scale by remember { mutableFloatStateOf(1f) }
    var pan by remember { mutableStateOf(Offset(30f, 50f)) }
    val undo = remember(id) { mutableListOf<JSONObject>() }
    val redo = remember(id) { mutableListOf<JSONObject>() }
    val text = rememberTextMeasurer()
    fun persist() {
        val loaded = project ?: return
        val snapshot = document ?: return
        generation++
        model.writeLocalDraft(
            accountScope,
            workspace,
            "redraw",
            id,
            Draft(loaded, snapshot, dirty, generation),
        )
    }
    fun change(next: JSONObject, history: Boolean = true) {
        if (!model.canWrite) return
        if (history) {
            document?.let { undo.add(it.copy()) }
            if (undo.size > 80) undo.removeAt(0)
            redo.clear()
        }
        document = next
        dirty = true
        persist()
    }
    LaunchedEffect(id) {
        try {
            val cached = model.readLocalDraft(accountScope, workspace, "redraw", id)
            val result =
                try {
                    model.repository.api.call(
                        "redraw:projects/get",
                        obj("workspace_id" to workspace, "id" to id),
                    ) as JSONObject
                } catch (cause: java.io.IOException) {
                    if (cause is ApiFailure && cause.status in 400..499) throw cause
                    cached?.document ?: throw cause
                }
            project = result
            generation = cached?.generation ?: 0
            if (cached?.dirty == true) {
                document = cached.snapshot
                dirty = true
                if (cached.document.optInt("revision") != result.optInt("revision"))
                    project = result.copy().put("revision", cached.document.optInt("revision"))
            } else document = result.getJSONObject("document")
        } catch (cause: Throwable) {
            model.fail(cause)
        }
    }
    val current = document
    if (current == null) {
        LinearProgressIndicator(Modifier.fillMaxWidth())
        return
    }
    val page =
        current
            .getJSONArray("pages")
            .getJSONObject(pageIndex.coerceAtMost(current.getJSONArray("pages").length() - 1))
    val elements = page.array("elements").objects()
    fun updateElement(next: JSONObject, preview: Boolean = false) {
        val doc = current.copy()
        val p = doc.getJSONArray("pages").getJSONObject(pageIndex)
        p.put(
            "elements",
            JSONArray(elements.map { if (it.str("id") == next.str("id")) next else it }),
        )
        if (preview) document = doc else change(doc)
    }
    val latestElements by rememberUpdatedState(elements)
    val updateLatest by rememberUpdatedState<(JSONObject) -> Unit>({ updateElement(it, true) })
    val latestDocument by rememberUpdatedState(current)
    fun elementAt(point: Offset): JSONObject? {
        val logical = (point - pan) / scale
        return elements.asReversed().firstOrNull {
            !it.optBoolean("hidden") &&
                logical.x >= it.optDouble("x") &&
                logical.x <= it.optDouble("x") + it.optDouble("width") &&
                logical.y >= it.optDouble("y") &&
                logical.y <= it.optDouble("y") + it.optDouble("height")
        }
    }
    val hitTest by rememberUpdatedState<(Offset) -> JSONObject?>({ elementAt(it) })
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconAction("back", Icons.Outlined.ArrowBack) { model.navigate("redraw") }
            Text(
                project?.str("title").orEmpty(),
                Modifier.weight(1f),
                style = MaterialTheme.typography.titleMedium,
            )
            IconAction("undo", Icons.Outlined.Undo, undo.isNotEmpty()) {
                redo.add(current.copy())
                change(undo.removeAt(undo.lastIndex), false)
            }
            IconAction("redo", Icons.Outlined.Redo, redo.isNotEmpty()) {
                undo.add(current.copy())
                change(redo.removeAt(redo.lastIndex), false)
            }
            Action("save", enabled = dirty && model.canWrite && !model.busy) {
                model.run {
                    val sent = current.copy()
                    val saved =
                        model.repository.mutate(
                            "redraw:projects/save",
                            obj("workspace_id" to workspace),
                            obj(
                                "id" to id,
                                "expected_revision" to project!!.getInt("revision"),
                                "title" to project!!.getString("title"),
                                "document" to sent,
                            ),
                        ) as JSONObject
                    project = saved
                    dirty = document?.toString() != sent.toString()
                    persist()
                }
            }
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(current.array("pages").objects().mapIndexed { index, p -> index to p }) {
                (index, p) ->
                FilterChip(
                    pageIndex == index,
                    {
                        pageIndex = index
                        selected = ""
                    },
                    label = { Text(p.str("name")) },
                )
            }
            item {
                IconAction("add", Icons.Outlined.Add, model.canWrite) {
                    change(
                        current.copy().apply {
                            getJSONArray("pages")
                                .put(blankDrawing().getJSONArray("pages").getJSONObject(0))
                        }
                    )
                }
            }
        }
        Canvas(
            Modifier.weight(1f)
                .fillMaxWidth()
                .pointerInput(elements, scale, pan) {
                    detectTapGestures(
                        onDoubleTap = { point ->
                            selected = elementAt(point)?.str("id").orEmpty()
                            inspector = selected.isNotEmpty()
                        },
                        onTap = { point -> selected = elementAt(point)?.str("id").orEmpty() },
                    )
                }
                .pointerInput(id, scale, model.canWrite) {
                    var before: JSONObject? = null
                    var previousPan = pan
                    detectDragGestures(
                        onDragStart = { point ->
                            selected = hitTest(point)?.str("id").orEmpty()
                            previousPan = pan
                            if (selected.isNotBlank() && model.canWrite)
                                before = latestDocument.copy()
                        },
                        onDragEnd = {
                            before?.let {
                                if (it.toString() != document?.toString()) {
                                    undo.add(it)
                                    if (undo.size > 80) undo.removeAt(0)
                                    redo.clear()
                                    dirty = true
                                    persist()
                                }
                            }
                            before = null
                        },
                        onDragCancel = {
                            before?.let { document = it }
                            pan = previousPan
                            before = null
                        },
                    ) { change, amount ->
                        val found = latestElements.firstOrNull { it.str("id") == selected }
                        if (found != null && !found.optBoolean("locked") && model.canWrite) {
                            change.consume()
                            val next =
                                found
                                    .copy()
                                    .put("x", found.optDouble("x") + amount.x / scale)
                                    .put("y", found.optDouble("y") + amount.y / scale)
                            updateLatest(next)
                        } else {
                            pan += amount
                        }
                    }
                }
                .pointerInput(Unit) {
                    detectTransformGestures { _, p, z, _ ->
                        pan += p
                        scale = (scale * z).coerceIn(.1f, 4f)
                    }
                }
        ) {
            drawRect(color(page.str("background"), Color.White))
            withTransform({
                translate(pan.x, pan.y)
                scale(scale, scale, Offset.Zero)
            }) {
                page.array("connectors").objects().forEach { edge ->
                    val from = elements.firstOrNull { it.str("id") == edge.str("source") }
                    val to = elements.firstOrNull { it.str("id") == edge.str("target") }
                    if (from != null && to != null)
                        drawLine(
                            color(edge.str("color")),
                            Offset(
                                (from.optDouble("x") + from.optDouble("width") / 2).toFloat(),
                                (from.optDouble("y") + from.optDouble("height") / 2).toFloat(),
                            ),
                            Offset(
                                (to.optDouble("x") + to.optDouble("width") / 2).toFloat(),
                                (to.optDouble("y") + to.optDouble("height") / 2).toFloat(),
                            ),
                            2f,
                        )
                }
                elements
                    .filterNot { it.optBoolean("hidden") }
                    .forEach { e ->
                        val x = e.optDouble("x").toFloat()
                        val y = e.optDouble("y").toFloat()
                        val width = e.optDouble("width").toFloat()
                        val height = e.optDouble("height").toFloat()
                        val position = Offset(x, y)
                        val size = Size(width, height)
                        val fill =
                            color(e.str("fill"))
                                .copy(
                                    alpha =
                                        (e.optDouble("opacity", 1.0) *
                                                e.optDouble("fillOpacity", 1.0))
                                            .toFloat()
                                            .coerceIn(0f, 1f)
                                )
                        val stroke = color(e.str("stroke"))
                        val thickness = e.optDouble("strokeWidth", 1.0).toFloat()
                        rotate(
                            e.optDouble("rotation").toFloat(),
                            Offset(x + width / 2, y + height / 2),
                        ) {
                            when (e.str("kind")) {
                                "ellipse" -> {
                                    drawOval(fill, position, size)
                                    if (thickness > 0)
                                        drawOval(stroke, position, size, style = Stroke(thickness))
                                }
                                "diamond" -> {
                                    val path =
                                        Path().apply {
                                            moveTo(x + width / 2, y)
                                            lineTo(x + width, y + height / 2)
                                            lineTo(x + width / 2, y + height)
                                            lineTo(x, y + height / 2)
                                            close()
                                        }
                                    drawPath(path, fill)
                                    if (thickness > 0)
                                        drawPath(path, stroke, style = Stroke(thickness))
                                }
                                "path" -> {
                                    val points = e.array("points").objects()
                                    val path = Path()
                                    points.forEachIndexed { index, p ->
                                        if (index == 0)
                                            path.moveTo(
                                                x + p.optDouble("x").toFloat(),
                                                y + p.optDouble("y").toFloat(),
                                            )
                                        else
                                            path.lineTo(
                                                x + p.optDouble("x").toFloat(),
                                                y + p.optDouble("y").toFloat(),
                                            )
                                    }
                                    drawPath(
                                        path,
                                        stroke,
                                        style = Stroke(thickness.coerceAtLeast(1f)),
                                    )
                                }
                                "text" -> Unit
                                else -> {
                                    drawRect(fill, position, size)
                                    if (thickness > 0)
                                        drawRect(stroke, position, size, style = Stroke(thickness))
                                }
                            }
                            if (e.str("text").isNotBlank())
                                drawText(
                                    text,
                                    e.str("text"),
                                    topLeft = position + Offset(8f, 8f),
                                    style =
                                        TextStyle(
                                            color = color(e.str("textColor"), Color.Black),
                                            fontSize = e.optDouble("fontSize", 18.0).toFloat().sp,
                                        ),
                                    size =
                                        Size(
                                            (width - 16).coerceAtLeast(1f),
                                            (height - 16).coerceAtLeast(1f),
                                        ),
                                )
                        }
                        if (e.str("id") == selected)
                            drawRect(
                                Color(0xff777777),
                                position - Offset(4f, 4f),
                                Size(width + 8f, height + 8f),
                                style = Stroke(1.5f / scale),
                            )
                    }
            }
        }
        LazyRow(Modifier.padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf("rectangle", "ellipse", "diamond", "text", "sticky", "frame")) { kind ->
                Action(kind, secondary = true, enabled = model.canWrite) {
                    val element =
                        obj(
                            "id" to UUID.randomUUID().toString(),
                            "kind" to kind,
                            "name" to kind,
                            "x" to 40,
                            "y" to 40,
                            "width" to 180,
                            "height" to 120,
                            "rotation" to 0,
                            "fill" to if (kind == "sticky") "#f6e8a7" else "#ededeb",
                            "stroke" to "#333333",
                            "strokeWidth" to 1,
                            "opacity" to 1,
                            "radius" to 8,
                            "text" to if (kind == "text") "Text" else "",
                            "fontSize" to 20,
                            "fontWeight" to "400",
                            "textColor" to "#242424",
                            "align" to "left",
                            "locked" to false,
                            "hidden" to false,
                            "group" to null,
                            "points" to JSONArray(),
                            "image" to "",
                        )
                    change(
                        current.copy().apply {
                            getJSONArray("pages")
                                .getJSONObject(pageIndex)
                                .getJSONArray("elements")
                                .put(element)
                        }
                    )
                    selected = element.str("id")
                }
            }
            item {
                Action("properties", secondary = true, enabled = selected.isNotBlank()) {
                    inspector = true
                }
            }
            item {
                IconAction(
                    "remove",
                    Icons.Outlined.DeleteOutline,
                    selected.isNotBlank() && model.canWrite,
                ) {
                    change(
                        current.copy().apply {
                            getJSONArray("pages")
                                .getJSONObject(pageIndex)
                                .put(
                                    "elements",
                                    JSONArray(elements.filterNot { it.str("id") == selected }),
                                )
                            getJSONArray("pages")
                                .getJSONObject(pageIndex)
                                .put(
                                    "connectors",
                                    JSONArray(
                                        page.array("connectors").objects().filterNot {
                                            it.str("source") == selected ||
                                                it.str("target") == selected
                                        }
                                    ),
                                )
                        }
                    )
                    selected = ""
                }
            }
        }
    }
    val element = elements.firstOrNull { it.str("id") == selected }
    if (inspector && element != null)
        ModalBottomSheet(
            onDismissRequest = { inspector = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            val schema =
                model.repository.contracts["redraw:projects/save"]
                    .body
                    .getJSONObject("properties")
                    .getJSONObject("document")
                    .getJSONObject("properties")
                    .getJSONObject("pages")
                    .getJSONObject("items")
                    .getJSONObject("properties")
                    .getJSONObject("elements")
                    .getJSONObject("items")
            Column(
                Modifier.verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(tr("properties"), style = MaterialTheme.typography.titleLarge)
                ObjectFields(schema, element, setOf("id")) { updateElement(it) }
            }
        }
}
