package app.monolith.android

import app.monolith.android.data.obj
import org.junit.Assert.*
import org.junit.Test

class EditorSyncTest {
    private fun document(revision: Int, title: String) =
        obj("revision" to revision, "snapshot" to obj("meta" to obj("title" to title)))

    @Test
    fun remoteChangesUpdateCleanDocuments() {
        val old = document(1, "Desktop")
        val editor = EditorState("page", "test", old, old.getJSONObject("snapshot"), generation = 4)
        val next = editor.reconcile(document(2, "Changed on desktop"))
        assertEquals("Changed on desktop", next.snapshot.getJSONObject("meta").getString("title"))
        assertEquals(5, next.generation)
        assertFalse(next.dirty)
    }

    @Test
    fun remoteChangesPreserveDirtySnapshotAndBaseRevision() {
        val old = document(1, "Desktop")
        val draft = document(1, "Unsaved phone edit").getJSONObject("snapshot")
        val editor = EditorState("page", "test", old, draft, dirty = true, generation = 3)
        val next = editor.reconcile(document(2, "Changed on desktop"))
        assertSame(draft, next.snapshot)
        assertEquals(1, next.document.getInt("revision"))
        assertEquals(3, next.generation)
        assertTrue(next.dirty)
        assertTrue(next.conflict)
    }

    @Test
    fun readStartedBeforeSaveCannotRegressTheSavedRevision() {
        val saved = document(3, "Just saved from phone")
        val editor = EditorState("page", "test", saved, saved.getJSONObject("snapshot"))
        assertSame(editor, editor.reconcile(document(2, "Old server read")))
        assertSame(editor, editor.reconcile(saved))
    }
}
