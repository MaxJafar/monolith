package app.monolith.android.editor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import app.monolith.android.ui.*
import org.json.JSONObject

private fun styledText(rich: JSONObject): AnnotatedString = buildAnnotatedString {
    rich.array("delta").objects().forEach { op ->
        val a = op.objectOrEmpty("attributes")
        withStyle(
            SpanStyle(
                fontWeight = if (a.optBoolean("bold")) FontWeight.Bold else null,
                fontStyle = if (a.optBoolean("italic")) FontStyle.Italic else null,
                fontFamily = if (a.optBoolean("code")) FontFamily.Monospace else null,
                textDecoration =
                    when {
                        a.optBoolean("strike") -> TextDecoration.LineThrough
                        a.optBoolean("underline") || a.has("link") -> TextDecoration.Underline
                        else -> null
                    },
            )
        ) {
            append(op.str("insert"))
        }
    }
}

@Composable
fun EditorScreen(model: MainModel) {
    val editor = model.editor ?: return
    var selected by remember(editor.id) { mutableStateOf("") }
    var selection by remember(editor.id) { mutableStateOf(TextRange.Zero) }
    var addMenu by remember { mutableStateOf(false) }
    val blocks = Document.editable(editor.snapshot)
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Caption(
                tr(
                    if (editor.readOnly) "read_only"
                    else if (editor.dirty) "local_draft" else "saved"
                )
            )
            Spacer(Modifier.weight(1f))
            IconAction("undo", Icons.Outlined.Undo, !editor.readOnly) { model.undo() }
            IconAction("redo", Icons.Outlined.Redo, !editor.readOnly) { model.redo() }
            Action(
                "save",
                enabled = editor.dirty && !editor.readOnly && !model.busy && !editor.conflict,
            ) {
                model.saveDocument()
            }
        }
        if (editor.conflict)
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ErrorBanner(tr("conflict"))
                Action("recover_copy", enabled = !model.busy) { model.saveDocument(true) }
            }
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(22.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                BasicTextField(
                    editor.snapshot.getJSONObject("meta").str("title"),
                    { model.editDocument(Document.title(editor.snapshot, it)) },
                    Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    readOnly = editor.readOnly,
                    textStyle =
                        MaterialTheme.typography.titleLarge.copy(
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 34.sp,
                            lineHeight = 40.sp,
                        ),
                    decorationBox = { inner ->
                        if (editor.snapshot.getJSONObject("meta").str("title").isBlank())
                            Text(
                                tr("untitled"),
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        inner()
                    },
                )
            }
            items(blocks, key = { it.str("id") }) { block ->
                val id = block.str("id")
                val props = block.objectOrEmpty("props")
                val flavour = block.str("flavour")
                val type = props.str("type")
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (flavour == "affine:divider")
                        HorizontalDivider(Modifier.padding(vertical = 16.dp))
                    else if (flavour == "monolith:linked-database") {
                        MonoCard(
                            onClick = {
                                model.back()
                                model.navigate("databases")
                                model.selectedBase =
                                    model.bases.firstOrNull { it.str("id") == props.str("baseId") }
                            }
                        ) {
                            Row {
                                Icon(Icons.Outlined.TableChart, null)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    model.bases
                                        .firstOrNull { it.str("id") == props.str("baseId") }
                                        ?.str("name") ?: tr("databases")
                                )
                            }
                            model.records
                                .filter { it.str("base_id") == props.str("baseId") }
                                .take(5)
                                .forEach { Text(it.str("title")) }
                        }
                    } else if (flavour == "monolith:module")
                        MonoCard {
                            Caption(props.str("moduleId").ifBlank { props.str("widget") })
                            NativeValue(props.objectOrEmpty("config"))
                        }
                    else if (flavour == "monolith:group")
                        Text(props.str("title"), style = MaterialTheme.typography.titleMedium)
                    else if (!Document.canEditText(block))
                        MonoCard(Modifier.fillMaxWidth()) {
                            Caption(tr("read_only"))
                            NativeValue(props)
                        }
                    else {
                        Row(verticalAlignment = Alignment.Top) {
                            when {
                                flavour == "affine:list" && type == "todo" ->
                                    Checkbox(
                                        props.optBoolean("checked"),
                                        { checked ->
                                            model.editDocument(
                                                Document.update(editor.snapshot, id) {
                                                    it.getJSONObject("props")
                                                        .put("checked", checked)
                                                }
                                            )
                                        },
                                        enabled = !editor.readOnly,
                                    )
                                flavour == "affine:list" ->
                                    Text(
                                        if (type == "numbered") "${blocks.indexOf(block)+1}."
                                        else "•",
                                        Modifier.padding(end = 12.dp, top = 6.dp),
                                    )
                                flavour == "affine:callout" ->
                                    Icon(
                                        Icons.Outlined.Lightbulb,
                                        null,
                                        Modifier.padding(end = 12.dp, top = 4.dp).size(22.dp),
                                    )
                            }
                            val rich = props.objectOrEmpty("text")
                            var value by
                                remember(id) {
                                    mutableStateOf(TextFieldValue(Document.text(block)))
                                }
                            val plain = Document.text(block)
                            LaunchedEffect(plain) {
                                if (value.text != plain)
                                    value =
                                        value.copy(
                                            text = plain,
                                            selection =
                                                TextRange(
                                                    value.selection.end.coerceAtMost(plain.length)
                                                ),
                                        )
                            }
                            val fontSize =
                                when (type) {
                                    "h1" -> 28.sp
                                    "h2" -> 24.sp
                                    "h3" -> 20.sp
                                    else -> 16.sp
                                }
                            val style =
                                MaterialTheme.typography.bodyLarge.copy(
                                    fontSize = fontSize,
                                    lineHeight = fontSize * 1.5,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontWeight =
                                        if (type.startsWith("h")) FontWeight.SemiBold else null,
                                    fontFamily =
                                        if (flavour == "affine:code") FontFamily.Monospace else null,
                                )
                            if (editor.readOnly)
                                SelectionContainer(Modifier.weight(1f)) {
                                    Text(styledText(rich), style = style)
                                }
                            else
                                BasicTextField(
                                    value,
                                    { next ->
                                        selected = id
                                        selection = next.selection
                                        value = next
                                        if (next.text != plain)
                                            model.editDocument(
                                                Document.update(editor.snapshot, id) {
                                                    it.getJSONObject("props")
                                                        .put(
                                                            "text",
                                                            Document.replaceText(rich, next.text),
                                                        )
                                                }
                                            )
                                    },
                                    Modifier.weight(1f)
                                        .heightIn(min = 48.dp)
                                        .padding(vertical = 6.dp),
                                    textStyle = style,
                                    visualTransformation =
                                        VisualTransformation { input ->
                                            val annotated =
                                                if (input.text == plain) styledText(rich) else input
                                            TransformedText(annotated, OffsetMapping.Identity)
                                        },
                                    decorationBox = { inner ->
                                        if (value.text.isEmpty())
                                            Text(
                                                tr("paragraph"),
                                                style = style,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        inner()
                                    },
                                )
                        }
                    }
                    if (selected == id && !editor.readOnly)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            IconAction("move_up", Icons.Outlined.KeyboardArrowUp) {
                                model.editDocument(Document.move(editor.snapshot, id, -1))
                            }
                            IconAction("move_down", Icons.Outlined.KeyboardArrowDown) {
                                model.editDocument(Document.move(editor.snapshot, id, 1))
                            }
                            IconAction("remove", Icons.Outlined.DeleteOutline) {
                                model.editDocument(Document.remove(editor.snapshot, id))
                            }
                        }
                }
            }
            if (!editor.readOnly)
                item {
                    Action(
                        "add",
                        Icons.Outlined.Add,
                        secondary = true,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        addMenu = true
                    }
                }
        }
        if (!editor.readOnly)
            Surface(color = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                LazyRow(Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    item { IconAction("add", Icons.Outlined.Add) { addMenu = true } }
                    items(
                        listOf(
                            Triple("bold", Icons.Outlined.FormatBold, "bold"),
                            Triple("italic", Icons.Outlined.FormatItalic, "italic"),
                            Triple("underline", Icons.Outlined.FormatUnderlined, "underline"),
                        )
                    ) { (label, icon, attribute) ->
                        IconAction(label, icon, selected.isNotBlank() && !selection.collapsed) {
                            model.editDocument(
                                Document.update(editor.snapshot, selected) { block ->
                                    val p = block.getJSONObject("props")
                                    p.put(
                                        "text",
                                        Document.format(
                                            p.objectOrEmpty("text"),
                                            selection.min,
                                            selection.max,
                                            attribute,
                                            true,
                                        ),
                                    )
                                }
                            )
                        }
                    }
                    item {
                        IconAction("todo", Icons.Outlined.CheckBox) {
                            model.editDocument(
                                Document.append(editor.snapshot, Document.newBlock("todo"))
                            )
                        }
                    }
                    item {
                        IconAction("heading", Icons.Outlined.Title) {
                            model.editDocument(
                                Document.append(editor.snapshot, Document.newBlock("h2"))
                            )
                        }
                    }
                }
            }
    }
    if (addMenu)
        AlertDialog(
            onDismissRequest = { addMenu = false },
            title = { Text(tr("add")) },
            text = {
                Column {
                    listOf(
                            "paragraph",
                            "h1",
                            "h2",
                            "bullet",
                            "numbered",
                            "todo",
                            "code",
                            "divider",
                            "callout",
                        )
                        .forEach { kind ->
                            TextButton({
                                model.editDocument(
                                    Document.append(
                                        editor.snapshot,
                                        Document.newBlock(if (kind == "paragraph") "text" else kind),
                                    )
                                )
                                addMenu = false
                            }) {
                                Text(tr(if (kind.startsWith("h")) "heading" else kind))
                            }
                        }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton({ addMenu = false }) { Text(tr("cancel")) } },
        )
}
