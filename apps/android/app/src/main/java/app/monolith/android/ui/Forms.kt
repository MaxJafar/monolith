package app.monolith.android.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.monolith.android.MainModel
import app.monolith.android.data.*
import org.json.JSONArray
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OperationSheet(model: MainModel) {
    val request = model.form ?: return
    val jsonSaver =
        Saver<JSONObject, String>(save = { it.toString() }, restore = { JSONObject(it) })
    var query by
        rememberSaveable(request, stateSaver = jsonSaver) { mutableStateOf(request.query.copy()) }
    var body by
        rememberSaveable(request, stateSaver = jsonSaver) { mutableStateOf(request.body.copy()) }
    val references = model.bases + model.records + model.pages + model.workspaces
    ModalBottomSheet(
        onDismissRequest = model::closeForm,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier.fillMaxWidth()
                .fillMaxHeight(.92f)
                .imePadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(tr(request.title), style = MaterialTheme.typography.titleLarge)
            if (model.error.isNotBlank()) ErrorBanner(model.error, model::dismissError)
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                ObjectFields(request.endpoint.query, query, request.hidden, references) {
                    query = it
                }
                if (request.endpoint.method != "GET") {
                    val record =
                        request.endpoint.route.endsWith("createRecord") ||
                            request.endpoint.route.endsWith("updateRecord")
                    ObjectFields(
                        request.endpoint.body,
                        body,
                        request.hidden +
                            if (record) setOf("appearance", "values", "item_type", "content")
                            else emptySet(),
                        references,
                    ) {
                        body = it
                    }
                    if (record) RecordFields(model, body) { body = it }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Action(
                    "cancel",
                    secondary = true,
                    enabled = !model.busy,
                    modifier = Modifier.weight(1f),
                    onClick = model::closeForm,
                )
                Action(
                    if (model.busy) "saving" else "save",
                    enabled = !model.busy,
                    modifier = Modifier.weight(1f),
                ) {
                    model.submitForm(query, body)
                }
            }
        }
    }
}

@Composable
fun ObjectFields(
    schema: JSONObject,
    value: JSONObject,
    hidden: Set<String> = emptySet(),
    references: List<JSONObject> = emptyList(),
    onChange: (JSONObject) -> Unit,
) {
    val properties = schema.objectOrEmpty("properties")
    val required = schema.array("required").values().map { it.toString() }
    val order =
        listOf(
            "title",
            "name",
            "description",
            "email",
            "status",
            "priority",
            "done",
            "date",
            "end_date",
        )
    properties
        .entries()
        .sortedBy { (name, _) -> order.indexOf(name).takeIf { it >= 0 } ?: 100 }
        .forEach { (name, raw) ->
            if (name !in hidden && raw is JSONObject) {
                key(name) {
                    val requiredField = name in required
                    val child = value.opt(name)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (!requiredField && child == null) {
                            TextButton({ onChange(value.withValue(name, Schema.seed(raw))) }) {
                                Icon(Icons.Outlined.Add, null, Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(tr(name))
                            }
                        } else {
                            ValueField(name, raw, child, references) {
                                onChange(value.withValue(name, it))
                            }
                            if (!requiredField)
                                TextButton(
                                    { onChange(value.withValue(name, null)) },
                                    Modifier.align(Alignment.End),
                                ) {
                                    Text(tr("remove"))
                                }
                        }
                    }
                }
            }
        }
    if (properties.length() == 0 && schema.optJSONObject("additionalProperties") != null) {
        val childSchema = schema.getJSONObject("additionalProperties")
        value.entries().forEach { (name, v) ->
            ValueField(name, childSchema, v, references) { onChange(value.withValue(name, it)) }
        }
        var newKey by remember { mutableStateOf("") }
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                newKey,
                { newKey = it },
                Modifier.weight(1f),
                label = { Text(tr("name")) },
                singleLine = true,
            )
            IconAction("add", Icons.Outlined.Add, newKey.isNotBlank()) {
                onChange(value.withValue(newKey, Schema.seed(childSchema)))
                newKey = ""
            }
        }
    }
}

@Composable
private fun RecordFields(model: MainModel, body: JSONObject, onChange: (JSONObject) -> Unit) {
    val recordId = model.form?.query?.str("id")
    val base =
        body.str("base_id").ifBlank {
            model.records.firstOrNull { it.str("id") == recordId }?.str("base_id").orEmpty()
        }
    val values = body.objectOrEmpty("values")
    model.snapshot
        .array("fields")
        .objects()
        .filter { it.str("base_id") == base }
        .forEach { field ->
            val kind = field.str("kind")
            val config = field.objectOrEmpty("config")
            val key = field.str("id")
            if (
                kind !in
                    listOf(
                        "formula",
                        "rollup",
                        "progress",
                        "created-time",
                        "last-edited-time",
                        "created-by",
                        "last-edited-by",
                        "unique-id",
                        "button",
                        "files",
                    )
            ) {
                if (kind == "relation") {
                    val linked =
                        model.snapshot
                            .array("links")
                            .objects()
                            .filter { it.str("record_id") == recordId && it.str("field_id") == key }
                            .map { it.str("target_id") }
                    Caption(field.str("name"))
                    Text(
                        model.records
                            .filter { it.str("id") in linked }
                            .joinToString { it.str("title") }
                            .ifBlank { tr("empty") }
                    )
                    return@forEach
                }
                val schema =
                    when (kind) {
                        "number" -> obj("type" to "number")
                        "checkbox" -> obj("type" to "boolean")
                        "select",
                        "status" ->
                            obj("type" to "string").apply {
                                if (config.array("options").length() > 0)
                                    put("enum", config.array("options"))
                            }
                        "multi-select",
                        "person" ->
                            obj(
                                "type" to "array",
                                "items" to
                                    obj("type" to "string").apply {
                                        if (config.array("options").length() > 0)
                                            put("enum", config.array("options"))
                                    },
                            )
                        else -> obj("type" to "string")
                    }
                ValueField(
                    field.str("name"),
                    schema,
                    values.opt(key) ?: Schema.seed(schema),
                    model.records,
                ) { next ->
                    onChange(body.withValue("values", values.withValue(key, next)))
                }
            }
        }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ValueField(
    name: String,
    schema: JSONObject,
    value: Any?,
    references: List<JSONObject>,
    onChange: (Any?) -> Unit,
) {
    val choices = Schema.choices(schema)
    val nullable = choices.any { it.str("type") == "null" }
    if (nullable && value == JSONObject.NULL) {
        OutlinedButton(
            { onChange(Schema.seed(Schema.resolved(schema))) },
            Modifier.fillMaxWidth(),
        ) {
            Text(tr(name))
            Spacer(Modifier.weight(1f))
            Icon(Icons.Outlined.Add, null)
        }
        return
    }
    val selected = Schema.resolved(schema, value)
    val enums =
        selected.optJSONArray("enum")?.values()
            ?: choices
                .takeIf { it.isNotEmpty() && it.all { c -> c.has("const") } }
                ?.map { it.get("const") }
    val label = tr(name)
    if (!enums.isNullOrEmpty()) {
        var expanded by remember { mutableStateOf(false) }
        Column {
            Caption(label)
            OutlinedButton({ expanded = true }, Modifier.fillMaxWidth()) {
                Text(tr(value?.toString() ?: enums.first().toString()), Modifier.weight(1f))
                Icon(Icons.Outlined.ExpandMore, null)
            }
            DropdownMenu(expanded, { expanded = false }) {
                enums.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(tr(option.toString())) },
                        onClick = {
                            onChange(option)
                            expanded = false
                        },
                    )
                }
            }
        }
        return
    }
    if (choices.size > 1 && choices.count { it.str("type") == "object" } > 1) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            choices
                .filter { it.str("type") == "object" }
                .forEachIndexed { index, variant ->
                    val marker =
                        variant
                            .objectOrEmpty("properties")
                            .entries()
                            .firstOrNull { (_, s) -> s is JSONObject && s.has("const") }
                            ?.second as? JSONObject
                    FilterChip(
                        selected === variant,
                        onClick = { onChange(Schema.seed(variant)) },
                        label = {
                            Text(tr(marker?.get("const")?.toString() ?: "${name}_${index+1}"))
                        },
                    )
                }
        }
    }
    when (selected.str("type")) {
        "object" ->
            MonoCard(Modifier.fillMaxWidth()) {
                Text(label, style = MaterialTheme.typography.titleMedium)
                ObjectFields(
                    selected,
                    value as? JSONObject ?: JSONObject(),
                    references = references,
                ) {
                    onChange(it)
                }
            }
        "array" -> {
            val array = value as? JSONArray ?: JSONArray()
            val item = selected.objectOrEmpty("items")
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Caption(label)
                array.values().forEachIndexed { index, element ->
                    Row(verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f)) {
                            ValueField("${name}_${index+1}", item, element, references) {
                                replacement ->
                                onChange(array.copy().put(index, replacement ?: JSONObject.NULL))
                            }
                        }
                        IconAction("remove", Icons.Outlined.RemoveCircleOutline) {
                            onChange(array.copy().apply { remove(index) })
                        }
                    }
                }
                Action(
                    "add_item",
                    Icons.Outlined.Add,
                    secondary = true,
                    enabled = array.length() < selected.optInt("maxItems", 1000),
                ) {
                    onChange(array.copy().put(Schema.seed(item)))
                }
            }
        }
        "boolean" ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(label, Modifier.weight(1f))
                Switch(value == true, { onChange(it) })
            }
        "number",
        "integer" -> {
            var input by remember(value) { mutableStateOf(value?.toString() ?: "") }
            OutlinedTextField(
                input,
                {
                    input = it
                    onChange(
                        if (selected.str("type") == "integer") it.toLongOrNull() ?: it
                        else it.toDoubleOrNull() ?: it
                    )
                },
                Modifier.fillMaxWidth(),
                label = { Text(label) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
            )
        }
        else -> {
            if (
                selected.str("format") == "uuid" &&
                    references.isNotEmpty() &&
                    name !in listOf("id", "transaction_id", "setup_id")
            ) {
                var expanded by remember { mutableStateOf(false) }
                val candidates =
                    when (name) {
                        "workspace_id" -> references.filter { it.has("role") }
                        "base_id",
                        "target_base_id" -> references.filter { it.has("table_type") }
                        "project_id" -> references.filter { it.str("item_type") == "project" }
                        else -> references
                    }
                Column {
                    Caption(label)
                    OutlinedButton({ expanded = true }, Modifier.fillMaxWidth()) {
                        Text(
                            candidates.firstOrNull { it.str("id") == value }?.displayText()
                                ?: value.displayText().ifBlank { tr("optional") },
                            Modifier.weight(1f),
                        )
                        Icon(Icons.Outlined.ExpandMore, null)
                    }
                    DropdownMenu(expanded, { expanded = false }) {
                        candidates.forEach { candidate ->
                            DropdownMenuItem(
                                text = { Text(candidate.displayText()) },
                                onClick = {
                                    onChange(candidate.str("id"))
                                    expanded = false
                                },
                            )
                        }
                    }
                    if (candidates.isEmpty())
                        OutlinedTextField(
                            value.displayText(),
                            { onChange(it) },
                            Modifier.fillMaxWidth(),
                            label = { Text(label) },
                        )
                }
            } else {
                val multiline =
                    name in
                        listOf(
                            "description",
                            "content",
                            "notes",
                            "instructions",
                            "text",
                            "body",
                            "prompt",
                            "message",
                        )
                OutlinedTextField(
                    value.displayText(),
                    { onChange(it) },
                    Modifier.fillMaxWidth(),
                    label = { Text(label) },
                    minLines = if (multiline) 3 else 1,
                    maxLines = if (multiline) 8 else 1,
                    singleLine = !multiline,
                )
            }
        }
    }
    if (nullable) TextButton({ onChange(JSONObject.NULL) }) { Text(tr("remove")) }
}
