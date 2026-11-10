package app.monolith.android

import app.monolith.android.data.*
import java.time.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CalendarTest {
    private fun record(date: String) =
        obj(
            "id" to "event",
            "item_type" to "event",
            "date" to date,
            "done" to false,
            "values" to JSONObject(),
        )

    private fun schedule(frequency: String, count: Int, zone: String = "UTC") =
        obj(
            "revision" to 1,
            "settings" to
                obj(
                    "time_zone" to zone,
                    "all_day" to false,
                    "start_field" to "date",
                    "end_field" to "end_date",
                    "exceptions" to JSONObject(),
                    "recurrence" to
                        obj(
                            "frequency" to frequency,
                            "interval" to 1,
                            "count" to count,
                            "weekdays" to JSONArray(),
                        ),
                ),
        )

    @Test
    fun monthlyRulesSkipMissingDaysWithoutConsumingCount() {
        val items =
            Calendar.expand(
                record("2026-01-31T10:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-07-01T00:00:00Z"),
                emptyList(),
                schedule("monthly", 3),
            )
        assertEquals(
            listOf("2026-01-31", "2026-03-31", "2026-05-31"),
            items.map { it.start.toString().take(10) },
        )
    }

    @Test
    fun civilTimeSkipsDstGapWithoutConsumingCount() {
        val items =
            Calendar.expand(
                record("2026-03-07T07:30:00Z"),
                Instant.parse("2026-03-07T00:00:00Z"),
                Instant.parse("2026-03-12T00:00:00Z"),
                emptyList(),
                schedule("daily", 3, "America/New_York"),
            )
        assertEquals(
            listOf("2026-03-07T07:30:00Z", "2026-03-09T06:30:00Z", "2026-03-10T06:30:00Z"),
            items.map { it.start.toString() },
        )
    }

    @Test
    fun movedExceptionEntersWindowAndCancelledEventDisappears() {
        val s = schedule("daily", 2)
        s.getJSONObject("settings")
            .getJSONObject("exceptions")
            .put(
                "2026-01-01T10:00:00.000Z",
                obj("start" to "2026-05-02T10:00:00Z", "end" to "2026-05-02T11:00:00Z"),
            )
        val items =
            Calendar.expand(
                record("2026-01-01T10:00:00Z"),
                Instant.parse("2026-05-01T00:00:00Z"),
                Instant.parse("2026-05-04T00:00:00Z"),
                emptyList(),
                s,
            )
        assertEquals(1, items.size)
        assertEquals("2026-01-01T10:00:00.000Z", items.single().original)
        s.getJSONObject("settings")
            .getJSONObject("exceptions")
            .getJSONObject(items.single().original)
            .put("cancelled", true)
        assertTrue(
            Calendar.expand(
                    record("2026-01-01T10:00:00Z"),
                    Instant.parse("2026-05-01T00:00:00Z"),
                    Instant.parse("2026-05-04T00:00:00Z"),
                    emptyList(),
                    s,
                )
                .isEmpty()
        )
    }
}
