package app.monolith.android.data

import android.content.Context
import org.json.JSONObject

data class Endpoint(
    val id: String,
    val module: String,
    val route: String,
    val path: String,
    val method: String,
    val encrypted: Boolean,
    val description: String,
    val input: JSONObject,
    val output: JSONObject,
) {
    val query
        get() = input.objectOrEmpty("query")

    val body
        get() = input.objectOrEmpty("body")
}

class Contracts(raw: String) {
    val endpoints =
        JSONObject(raw)
            .getJSONArray("endpoints")
            .objects()
            .map {
                Endpoint(
                    it.getString("id"),
                    it.getString("module"),
                    it.getString("route"),
                    it.getString("path"),
                    it.getString("method"),
                    it.optBoolean("encrypted"),
                    it.str("description"),
                    it.objectOrEmpty("input"),
                    it.objectOrEmpty("output"),
                )
            }
            .associateBy { it.id }

    constructor(
        context: Context
    ) : this(context.assets.open("contracts.json").bufferedReader().use { it.readText() })

    operator fun get(id: String) = endpoints[id] ?: error("Unknown operation: $id")
}

object Schema {
    fun choices(schema: JSONObject) =
        (schema.optJSONArray("anyOf") ?: schema.optJSONArray("oneOf"))?.objects().orEmpty()

    fun resolved(schema: JSONObject, value: Any? = null): JSONObject {
        val choices = choices(schema)
        if (choices.isEmpty()) return schema
        return choices.firstOrNull { choice ->
            val type = choice.str("type")
            when (value) {
                is JSONObject ->
                    type == "object" &&
                        choice.objectOrEmpty("properties").entries().all { (k, s) ->
                            s !is JSONObject || !s.has("const") || s.opt("const") == value.opt(k)
                        }
                is org.json.JSONArray -> type == "array"
                is Boolean -> type == "boolean"
                is Number -> type in listOf("number", "integer")
                is String ->
                    type == "string" && (!choice.has("const") || choice.opt("const") == value)
                else -> false
            }
        } ?: choices.firstOrNull { it.str("type") != "null" } ?: schema
    }

    fun seed(schema: JSONObject, required: Boolean = true): Any? {
        if (schema.has("default")) return schema.get("default")
        if (schema.has("const")) return schema.get("const")
        if (!required) return null
        val s = resolved(schema)
        s.optJSONArray("enum")?.let { if (it.length() > 0) return it.get(0) }
        return when (s.str("type")) {
            "object" ->
                JSONObject().apply {
                    val requiredKeys = s.array("required").values().map { it.toString() }.toSet()
                    s.objectOrEmpty("properties").entries().forEach { (key, child) ->
                        if (child is JSONObject)
                            seed(child, key in requiredKeys)?.let { put(key, it) }
                    }
                }
            "array" ->
                org.json.JSONArray().apply {
                    repeat(s.optInt("minItems", 0).coerceIn(0, 500)) {
                        put(seed(s.objectOrEmpty("items")) ?: JSONObject.NULL)
                    }
                }
            "boolean" -> false
            "integer",
            "number" -> s.opt("minimum") ?: 0
            "null" -> JSONObject.NULL
            else -> ""
        }
    }

    fun errors(schema: JSONObject, value: Any?, path: String = ""): List<String> {
        if (value == null) return listOf(path)
        if (value == JSONObject.NULL)
            return if (
                schema.str("type") == "null" || choices(schema).any { it.str("type") == "null" }
            )
                emptyList()
            else listOf(path)
        val s = resolved(schema, value)
        if (s.has("const") && s.get("const") != value) return listOf(path)
        s.optJSONArray("enum")?.let { if (value !in it.values()) return listOf(path) }
        return when (s.str("type")) {
            "object" ->
                if (value !is JSONObject) listOf(path)
                else {
                    val props = s.objectOrEmpty("properties")
                    val required = s.array("required").values().map { it.toString() }
                    required.filter { !value.has(it) }.map { "$path $it" } +
                        value.entries().flatMap { (k, v) ->
                            props.optJSONObject(k)?.let { errors(it, v, "$path $k") } ?: emptyList()
                        }
                }
            "array" ->
                if (
                    value !is org.json.JSONArray ||
                        value.length() < s.optInt("minItems", 0) ||
                        value.length() > s.optInt("maxItems", Int.MAX_VALUE)
                )
                    listOf(path)
                else
                    value.values().flatMapIndexed { index, v ->
                        errors(s.objectOrEmpty("items"), v, "$path ${index + 1}")
                    }
            "string" ->
                if (
                    value !is String ||
                        value.length < s.optInt("minLength", 0) ||
                        value.length > s.optInt("maxLength", Int.MAX_VALUE) ||
                        (s.str("format") == "uuid" &&
                            runCatching { java.util.UUID.fromString(value) }.isFailure) ||
                        (s.has("pattern") &&
                            runCatching { Regex(s.getString("pattern")).containsMatchIn(value) }
                                .getOrDefault(true)
                                .not())
                )
                    listOf(path)
                else emptyList()
            "integer",
            "number" ->
                if (
                    value !is Number ||
                        !value.toDouble().isFinite() ||
                        value.toDouble() < s.optDouble("minimum", -Double.MAX_VALUE) ||
                        value.toDouble() > s.optDouble("maximum", Double.MAX_VALUE) ||
                        (s.str("type") == "integer" && value.toDouble() % 1 != 0.0)
                )
                    listOf(path)
                else emptyList()
            "boolean" -> if (value !is Boolean) listOf(path) else emptyList()
            else -> emptyList()
        }
    }
}
