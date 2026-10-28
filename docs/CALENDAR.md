# Calendar, recurring work and reminders

Monolith's workspace Calendar displays the original workspace records. Week and Day agenda use an hourly time grid; Month gives an overview. Drag a timed event to move it, or drag its bottom handle to change its duration in 15-minute steps. Overlapping appointments occupy separate columns. Escape cancels a gesture; failed saves restore the previous time.

Click an event for its time editor, completion controls and **Open full page**. The full page contains the same record body, properties, recurrence and guests. Keyboard users can move a focused timed event with Alt + arrow keys, or resize with up/down arrows on its duration handle. All-day entries can move between days by dragging their card or editing their date.

## Database dates

Add a Date property to a database, enter a date and choose its calendar icon. Calendar opens on that date with the property selected. The Start property selector switches back to automatic dates or another property. Saved database calendar views retain their own start/end property bindings and colors.

Dragging a database entry updates that property on the original record. Custom Date properties are all-day values; optional end dates are inclusive. Native event start/end properties carry date and time, with an exclusive end. Choose an end property to enable duration editing. Properties referenced by schedules cannot be deleted or converted until the schedule is rebound.

## Repeating events and tasks

Open a dated record and use its **Repeat**, **Reminders**, **Guests** and **Time zone** properties. Each opens a small editor and saves when it closes; **Hide properties** hides them with the rest of the page properties. Choose daily, weekly, monthly or yearly repeats, an interval, optional weekdays, and either a final date or occurrence count. The IANA time zone preserves local start time across daylight-saving changes. Invalid dates, such as February 31, and nonexistent DST times are skipped.

Moving, resizing, skipping or completing a calendar occurrence changes only that occurrence. The record page edits the series. Once a series has individual changes, changing its recurrence pattern, time zone or seed dates is rejected to preserve those changes; create a new series for a different pattern. Marking the original task complete stops reminders for the whole series.

Actions expands recurring tasks from the previous 30 days through the next 31 days. Its completion checkbox completes one occurrence. Use Calendar to browse other dates.

## Sharing and notifications

Guests must already be members of the same workspace. Owners and editors can schedule and move records. Viewers can read events and answer their own invitation with Accepted, Tentative or Declined. Workspace permissions still govern the underlying page; removing a member revokes access.

The app-bar bell holds invitations, changes and reminders. Notifications persist while the app is closed and appear when it opens. The client polls every 30 seconds while open. The API worker checks due reminders every 30 seconds in bounded batches, so delivery is approximate and can be later on large installations. It catches up reminders due within the preceding 24 hours, excluding reminders from before the schedule was created. Completed, cancelled and declined occurrences do not produce reminders.

Email is optional. Organizers opt in to their own reminders; each guest controls their email preference when responding. Initial invitations appear in the app. Subsequent changes and reminders can be emailed after that guest opts in. External email-only guests, Google/Apple account sync and operating-system push notifications are not part of this implementation.

## Set up outgoing email

The included adapter uses Resend. In-app delivery works without an email provider, and the event settings show when email is unconfigured.

1. Create a Resend account and verify a domain you control using its [domain setup instructions](https://resend.com/docs/dashboard/domains/introduction). Choose a sender, for example `Monolith <calendar@your-domain.example>`.
2. Create a sending API key for that domain. Set these values in the **API server's private environment**, never in a `VITE_` variable, frontend bundle, Git commit or chat:

   ```dotenv
   MONOLITH_RESEND_API_KEY=re_your_private_key
   MONOLITH_EMAIL_FROM="Monolith <calendar@your-domain.example>"
   MONOLITH_PUBLIC_URL=https://your-monolith-host.example
   ```

3. Set `MONOLITH_PUBLIC_URL` to the HTTPS address recipients can reach. A private Tailscale deployment requires recipients to have access to that network. Restart the API service after updating its environment.
4. Create a future event, save a reminder and enable email for the organizer. For shared events, let each guest accept and opt in. Verify the notification in Monolith and the accepted message in the provider's dashboard. The app's “sent” state means provider acceptance, not guaranteed inbox delivery.

The database outbox records a unique notification and immutable message payload before making a network request. Retries use the same idempotency key and payload. The worker retries up to eight times with backoff and stops at 23 hours, inside Resend's documented [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys). Failed email appears in the recipient's notification entry; the in-app notification remains available. Delivery rechecks membership, email consent and reminder validity before each attempt. Credentials and provider responses are not logged.

## Deployment and verification

This change adds calendar schedule and notification tables to the Databases schema. Back up the database, apply the repository's schema procedure (`pnpm db:push` in a source deployment), then deploy matching API and web/desktop assets. Follow the existing schema-approval process for managed server updates. No background email service or client installation is needed beyond the running Monolith API.

Scheduling unit tests run with `pnpm --filter @monolith/databases test`. Database integration tests use the isolated local PostgreSQL on port 55432 with `MONOLITH_WORKSPACE_INTEGRATION=1` and `pnpm --filter @monolith/server exec vitest run src/tests/workspace-calendar.integration.test.ts`. Their email transport is synthetic; they never send real mail.
