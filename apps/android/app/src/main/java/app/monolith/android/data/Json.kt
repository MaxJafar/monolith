package app.monolith.android.data

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

fun obj(vararg pairs: Pair<String, Any?>) =
    JSONObject().apply { pairs.forEach { (k, v) -> put(k, v ?: JSONObject.NULL) } }

fun JSONObject.copy() = JSONObject(toString())

fun JSONArray.copy() = JSONArray(toString())

fun JSONObject.str(key: String, default: String = "") =
    if (isNull(key)) default else optString(key, default)

fun JSONObject.array(key: String) = optJSONArray(key) ?: JSONArray()

fun JSONObject.objectOrEmpty(key: String) = optJSONObject(key) ?: JSONObject()

fun JSONArray.values(): List<Any> = (0 until length()).map { get(it) }

fun JSONArray.objects(): List<JSONObject> = values().filterIsInstance<JSONObject>()

fun JSONObject.entries(): List<Pair<String, Any>> =
    keys().asSequence().map { it to get(it) }.toList()

fun jsonValue(text: String): Any = JSONTokener(text).nextValue()

fun Any?.jsonText(): String =
    when (this) {
        null -> "null"
        is String -> JSONObject.quote(this)
        else -> toString()
    }

fun Any?.displayText(): String =
    when (this) {
        null,
        JSONObject.NULL -> ""
        is JSONArray -> values().joinToString(", ") { it.displayText() }
        is JSONObject ->
            listOf("title", "name", "label", "text", "message").firstNotNullOfOrNull { k ->
                str(k).takeIf { it.isNotBlank() }
            } ?: entries().take(3).joinToString(" · ") { "${it.first}: ${it.second.displayText()}" }
        else -> toString()
    }

fun JSONObject.withValue(key: String, value: Any?) =
    copy().apply { if (value == null) remove(key) else put(key, value) }
