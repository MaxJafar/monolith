package app.monolith.android.editor

import app.monolith.android.data.*
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

/** Edits the canonical tree in place by ID, preserving every unedited property. */
object Document {
    const val TEXT_TAG = "\$blocksuite:internal:text\$"

    fun rich(text: String) =
        obj(TEXT_TAG to true, "delta" to JSONArray().put(obj("insert" to text)))

    fun text(block: JSONObject): String =
        block.objectOrEmpty("props").objectOrEmpty("text").array("delta").objects().joinToString(
            ""
        ) {
            it.str("insert")
        }

    fun walk(block: JSONObject): List<JSONObject> =
        listOf(block) + block.array("children").objects().flatMap { walk(it) }

    fun blocks(snapshot: JSONObject) = walk(snapshot.getJSONObject("blocks"))

    fun editable(snapshot: JSONObject) =
        blocks(snapshot).filter {
            it.str("flavour") !in
                listOf(
                    "affine:page",
                    "affine:surface",
                    "affine:note",
                    "monolith:columns",
                    "monolith:column",
                )
        }

    fun canEditText(block: JSONObject) =
        block.str("flavour") in
            setOf("affine:paragraph", "affine:list", "affine:code", "affine:callout") &&
            block.objectOrEmpty("props").objectOrEmpty("text").array("delta").objects().all {
                it.opt("insert") is String
            }

    fun update(snapshot: JSONObject, id: String, transform: (JSONObject) -> Unit): JSONObject =
        snapshot.copy().apply {
            blocks(this).firstOrNull { it.str("id") == id }?.let(transform)
        }

    fun title(snapshot: JSONObject, title: String) =
        snapshot.copy().apply {
            getJSONObject("meta").put("title", title)
            getJSONObject("blocks").objectOrEmpty("props").put("title", rich(title))
        }

    private data class Character(val text: String, val attributes: JSONObject?)

    private fun characters(rich: JSONObject): List<Character> =
        rich.array("delta").objects().flatMap { op ->
            op.str("insert").map { Character(it.toString(), op.optJSONObject("attributes")) }
        }

    private fun compact(chars: List<Character>): JSONObject {
        val delta = JSONArray()
        var attributes: JSONObject? = null
        var buffer = StringBuilder()
        fun flush() {
            if (buffer.isNotEmpty()) {
                delta.put(
                    obj("insert" to buffer.toString()).apply {
                        attributes?.let { put("attributes", it.copy()) }
                    }
                )
                buffer = StringBuilder()
            }
        }
        chars.forEach { char ->
            if (attributes?.toString() != char.attributes?.toString()) {
                flush()
                attributes = char.attributes
            }
            buffer.append(char.text)
        }
        flush()
        return obj(TEXT_TAG to true, "delta" to delta)
    }

    /** A contiguous text edit retains formatting on untouched runs, including links. */
    fun replaceText(rich: JSONObject, next: String): JSONObject {
        require(rich.array("delta").objects().all { it.opt("insert") is String }) {
            "Embedded text objects must be preserved"
        }
        val old = characters(rich)
        val previous = old.joinToString("") { it.text }
        if (previous == next) return rich.copy()
        var start = 0
        while (
            start < minOf(previous.length, next.length) && previous[start] == next[start]
        ) start++
        var end = 0
        while (
            end < previous.length - start &&
                end < next.length - start &&
                previous[previous.length - end - 1] == next[next.length - end - 1]
        ) end++
        val attrs = old.getOrNull((start - 1).coerceAtLeast(0))?.attributes
        return compact(
            old.take(start) +
                next.substring(start, next.length - end).map { Character(it.toString(), attrs) } +
                if (end == 0) emptyList() else old.takeLast(end)
        )
    }

    fun format(rich: JSONObject, start: Int, end: Int, attribute: String, value: Any): JSONObject {
        val chars = characters(rich)
        val a = start.coerceIn(0, chars.size)
        val b = end.coerceIn(a, chars.size)
        val remove =
            chars.subList(a, b).isNotEmpty() &&
                chars.subList(a, b).all { it.attributes?.opt(attribute) == value }
        return compact(
            chars.mapIndexed { index, char ->
                if (index in a until b)
                    char.copy(
                        attributes =
                            (char.attributes?.copy() ?: JSONObject()).apply {
                                if (remove) remove(attribute) else put(attribute, value)
                            }
                    )
                else char
            }
        )
    }

    fun newBlock(kind: String, text: String = ""): JSONObject {
        val flavour =
            when (kind) {
                "bullet",
                "numbered",
                "todo" -> "affine:list"
                "code" -> "affine:code"
                "divider" -> "affine:divider"
                "callout" -> "affine:callout"
                else -> "affine:paragraph"
            }
        return obj(
            "type" to "block",
            "id" to UUID.randomUUID().toString(),
            "flavour" to flavour,
            "version" to 1,
            "props" to
                obj("type" to kind, "text" to rich(text)).apply {
                    if (kind == "todo") put("checked", false)
                    if (kind == "code") put("language", "plain text")
                },
            "children" to JSONArray(),
        )
    }

    fun append(snapshot: JSONObject, block: JSONObject): JSONObject =
        snapshot.copy().apply {
            val note =
                blocks(this).firstOrNull { it.str("flavour") == "affine:note" }
                    ?: error("Document has no note container")
            note.getJSONArray("children").put(block)
        }

    fun move(snapshot: JSONObject, id: String, offset: Int): JSONObject =
        snapshot.copy().apply {
            blocks(this).forEach { parent ->
                val children = parent.array("children").objects().toMutableList()
                val index = children.indexOfFirst { it.str("id") == id }
                if (index >= 0 && index + offset in children.indices) {
                    val item = children.removeAt(index)
                    children.add(index + offset, item)
                    parent.put("children", JSONArray(children))
                }
            }
        }

    fun remove(snapshot: JSONObject, id: String): JSONObject =
        snapshot.copy().apply {
            blocks(this).forEach { parent ->
                parent.put(
                    "children",
                    JSONArray(parent.array("children").objects().filterNot { it.str("id") == id }),
                )
            }
        }
}

data class Draft(
    val document: JSONObject,
    val snapshot: JSONObject,
    val dirty: Boolean,
    val generation: Long,
) {
    fun json() =
        obj(
            "document" to document,
            "snapshot" to snapshot,
            "dirty" to dirty,
            "generation" to generation,
        )
}

class Drafts(private val vault: Vault) {
    @Synchronized
    fun get(scope: String, workspace: String, kind: String, id: String): Draft? =
        vault.read(key(scope, workspace, kind, id))?.let {
            val j = JSONObject(it)
            Draft(
                j.getJSONObject("document"),
                j.getJSONObject("snapshot"),
                j.getBoolean("dirty"),
                j.getLong("generation"),
            )
        }

    private fun key(scope: String, workspace: String, kind: String, id: String) =
        "draft:$scope:$workspace:$kind:$id"

    @Synchronized
    fun write(
        scope: String,
        workspace: String,
        kind: String,
        id: String,
        draft: Draft,
        expected: Long?,
    ) {
        val previous = get(scope, workspace, kind, id)
        if (previous?.generation != expected)
            throw ApiFailure(409, "local_conflict", "This draft changed in another editor")
        val key = key(scope, workspace, kind, id)
        val index = vault.read("draft-index:$scope")?.let(::JSONArray) ?: JSONArray()
        // Index first: after a crash an absent draft can be ignored, but a dirty draft is never
        // hidden.
        if (key !in index.values()) {
            index.put(key)
            vault.write("draft-index:$scope", index.toString())
        }
        vault.write(key, draft.json().toString())
    }

    @Synchronized
    fun dirty(scope: String): List<JSONObject> =
        (vault.read("draft-index:$scope")?.let(::JSONArray) ?: JSONArray()).values().mapNotNull {
            key ->
            vault.read(key.toString())?.let(::JSONObject)?.takeIf { it.optBoolean("dirty") }
        }
}
