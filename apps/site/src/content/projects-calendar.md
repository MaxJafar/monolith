---
title: Projects, Actions and Calendar
description: Turn a plan into actionable work and see it in time.
section: Your workspace
order: 13
---

Projects, Actions and Calendar are different ways of looking at work. Use the section that best answers the question in front of you.

## Plan with Projects

Projects provides board, list, timeline and Gantt views. Create a project, organize tasks and use columns or statuses to describe progress. Linked records retain their original identities.

A board is useful for workflow stages. A timeline or Gantt view is useful for work arranged in time. Choose the view that helps you plan; changing perspective does not mean maintaining another set of tasks.

## Focus with Actions

Actions gathers actionable records into **Today**, **Upcoming**, **High priority**, **All actions** and **Completed**. Changing a status updates the underlying record.

Use Today for immediate work and Upcoming for what comes next. Review the original record when you need its full context or properties.

## See dates in Calendar

The workspace Calendar shows dated records in Month, Week and Day agenda. Drag a timed event to move it, or drag its bottom handle to change its duration in 15-minute steps. Overlapping events appear side by side. Click an event for a compact time editor, then choose **Open full page** for its body, properties and schedule.

Date properties in databases include **Open in Calendar**. Moving an entry edits its original date property. Custom Date properties are all-day values; native event dates include time. Choose a separate end property to enable duration editing. Calendar views keep their configured property bindings and colors.

## Repeat and share work

Open a dated task or event and use **Schedule & guests** to choose daily, weekly, monthly or yearly repeats, intervals, weekdays and an end date or count. Recurrence follows the selected time zone. Editing or completing an occurrence affects that occurrence; the full record represents the series. Actions shows recurring occurrences from the previous 30 days through the next 31 days.

Invite existing workspace members and track Accepted, Tentative or Declined responses. Viewers can answer their own invitation; owners and editors can change events. The app-bar bell shows invitations, changes and reminders. Email reminders and changes are opt-in and require server configuration; in-app delivery works without it.

See the [calendar and email setup guide](https://github.com/MaxJafar/monolith/blob/main/docs/CALENDAR.md) for provider configuration, delivery behavior and deployment requirements. External email-only invitations, Google/Apple account sync and operating-system push are not included. ICS subscriptions remain available through **Calendars & integrations**.

Calendar widgets bring compact views into a dashboard or sidebar. Choose the available view and filters in the widget’s configuration overlay. Permissions remain attached to the underlying data.

## Keep useful views close

Add **Action agenda**, **Project focus**, **Project board**, **Upcoming events** or a Calendar widget where available. These widgets query the existing workspace data. They do not store separate task or project copies.

See [widgets and dashboards](/docs/widgets) for placement and configuration.
