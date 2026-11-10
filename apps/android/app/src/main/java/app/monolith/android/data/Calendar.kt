package app.monolith.android.data

import java.time.*
import java.time.format.DateTimeFormatterBuilder
import java.time.temporal.ChronoUnit
import kotlin.math.*
import org.json.JSONObject

data class CalendarOccurrence(
    val record: JSONObject,
    val original: String,
    val start: Instant,
    val end: Instant,
    val allDay: Boolean,
    val done: Boolean,
    val schedule: JSONObject?,
    val startField: String,
    val endField: String?,
) {
    val id
        get() = "${record.str("id")}:$original"
}

/** Civil-time recurrence matches calendarShared.ts, including DST gaps and moved exceptions. */
object Calendar {
    private val iso = DateTimeFormatterBuilder().appendInstant(3).toFormatter()

    private fun dateOnly(value: String) = Regex("\\d{4}-\\d{2}-\\d{2}").matches(value)

    private fun instant(value: String, zone: ZoneId): ZonedDateTime =
        if (dateOnly(value)) LocalDate.parse(value).atStartOfDay(zone)
        else Instant.parse(value).atZone(zone)

    fun expand(
        record: JSONObject,
        from: Instant,
        to: Instant,
        fields: List<JSONObject>,
        schedule: JSONObject?,
        defaultZone: ZoneId = ZoneId.systemDefault(),
    ): List<CalendarOccurrence> {
        val settings = schedule?.objectOrEmpty("settings")
        val zone = runCatching {
            ZoneId.of(settings?.str("time_zone")?.takeIf { it.isNotBlank() } ?: defaultZone.id)
        }.getOrDefault(defaultZone)
        val values = record.objectOrEmpty("values")
        val startField =
            settings?.str("start_field")?.takeIf { it.isNotBlank() }
                ?: if (record.str("date").isNotBlank()) "date"
                else
                    fields
                        .firstOrNull {
                            it.str("base_id") == record.str("base_id") &&
                                it.str("kind") == "date" &&
                                dateOnly(values.str(it.str("id")))
                        }
                        ?.str("id") ?: "date"
        val endField =
            if (settings != null) settings.str("end_field").takeIf { it.isNotBlank() }
            else if (startField == "date") "end_date" else null
        val rawStart = if (startField == "date") record.str("date") else values.str(startField)
        if (rawStart.isBlank() || startField != "date" && !dateOnly(rawStart)) return emptyList()
        var start = runCatching { instant(rawStart, zone) }.getOrNull() ?: return emptyList()
        val allDay =
            dateOnly(rawStart) ||
                (settings?.optBoolean("all_day") ?: (record.str("item_type") != "event"))
        if (allDay) start = start.toLocalDate().atStartOfDay(zone)
        val rawEnd =
            if (endField == "end_date") record.str("end_date")
            else endField?.let { values.str(it) }.orEmpty()
        var end =
            runCatching { instant(rawEnd, zone) }.getOrNull()
                ?: if (allDay) start.plusDays(1) else start.plusHours(1)
        if (dateOnly(rawEnd)) end = LocalDate.parse(rawEnd).plusDays(1).atStartOfDay(zone)
        else if (allDay && rawEnd.isNotBlank())
            end =
                end.toLocalDate()
                    .plusDays(if (end.hour != 0 || end.minute != 0) 1 else 0)
                    .atStartOfDay(zone)
        if (!end.isAfter(start)) end = if (allDay) start.plusDays(1) else start.plusHours(1)
        val duration = Duration.between(start, end).toMinutes()
        val result = mutableListOf<CalendarOccurrence>()
        val seen = mutableSetOf<String>()
        val exceptions = settings?.objectOrEmpty("exceptions") ?: JSONObject()
        fun add(original: String, s: Instant, e: Instant) {
            seen.add(original)
            val change = exceptions.optJSONObject(original)
            if (change?.optBoolean("cancelled") == true) return
            val actualStart =
                change?.str("start")?.takeIf { it.isNotBlank() }?.let(Instant::parse) ?: s
            val actualEnd = change?.str("end")?.takeIf { it.isNotBlank() }?.let(Instant::parse) ?: e
            if (actualStart >= to || actualEnd <= from) return
            result.add(
                CalendarOccurrence(
                    record,
                    original,
                    actualStart,
                    actualEnd,
                    allDay,
                    if (change?.has("done") == true) change.optBoolean("done")
                    else record.optBoolean("done"),
                    schedule,
                    startField,
                    endField,
                )
            )
        }
        val rule = settings?.optJSONObject("recurrence")
        if (rule == null) add(iso.format(start.toInstant()), start.toInstant(), end.toInstant())
        else {
            val seed = start.toLocalDate()
            val countLimit =
                rule.optInt("count", Int.MAX_VALUE).let { if (it <= 0) Int.MAX_VALUE else it }
            var count = 0
            val interval = rule.optInt("interval", 1).coerceAtLeast(1)
            val first =
                if (countLimit != Int.MAX_VALUE) 0
                else
                    (ChronoUnit.DAYS.between(seed, from.atZone(zone).toLocalDate()) -
                            ceil(duration / 1440.0).toLong() -
                            2)
                        .coerceAtLeast(0)
            val limit =
                ChronoUnit.DAYS.between(seed, to.atZone(zone).toLocalDate()).coerceAtMost(366000) +
                    1
            val weekdays =
                rule
                    .array("weekdays")
                    .values()
                    .map { (it as Number).toInt() }
                    .ifEmpty { listOf(seed.dayOfWeek.value % 7) }
            for (offset in first..limit) {
                val day = seed.plusDays(offset)
                if (rule.str("until").isNotBlank() && day.toString() > rule.str("until")) break
                val months = (day.year - seed.year) * 12 + day.monthValue - seed.monthValue
                val week = (offset + seed.dayOfWeek.value - 1) / 7
                val matches =
                    offset == 0L ||
                        when (rule.str("frequency")) {
                            "daily" -> offset % interval == 0L
                            "weekly" -> week % interval == 0L && day.dayOfWeek.value % 7 in weekdays
                            "monthly" -> months % interval == 0 && day.dayOfMonth == seed.dayOfMonth
                            "yearly" ->
                                (day.year - seed.year) % interval == 0 &&
                                    day.month == seed.month &&
                                    day.dayOfMonth == seed.dayOfMonth
                            else -> false
                        }
                if (!matches) continue
                val civil = day.atTime(start.toLocalTime())
                val occurrence = civil.atZone(zone)
                if (occurrence.toLocalDateTime() != civil) continue
                if (++count > countLimit) break
                val until =
                    if (allDay)
                        day.plusDays(maxOf(1, round(duration / 1440.0).toLong()))
                            .atStartOfDay(zone)
                            .toInstant()
                    else occurrence.toInstant().plusSeconds(duration * 60)
                add(iso.format(occurrence.toInstant()), occurrence.toInstant(), until)
            }
            exceptions.entries().forEach { (original, value) ->
                if (
                    original !in seen &&
                        value is JSONObject &&
                        value.str("start").isNotBlank() &&
                        value.str("end").isNotBlank()
                )
                    add(
                        original,
                        Instant.parse(value.getString("start")),
                        Instant.parse(value.getString("end")),
                    )
            }
        }
        return result.sortedBy { it.start }
    }
}
