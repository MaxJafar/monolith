# Monolith feature guide

Monolith separates permanent workspace features, optional applications, and compact widgets. **Addons and Widgets** is the collection and download shop. Installing a package makes it available on the host; enabling it chooses the workspaces that use it. Widgets live on the dashboard or in the sidebar and have compact preview/configuration overlays.

## Native workspace

| Feature                | Overview                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar               | A workspace-wide view of dated records, with month, week and agenda layouts. Create and resize native events, edit recurring schedules and manage workspace invitations and reminders.                                                                                                                                     |
| Projects               | Organize projects with board, list, timeline and Gantt views. Linked records and tasks share their original identities rather than becoming disconnected copies.                                                                                                                                                             |
| Journal | Dated writing, a searchable timeline, activity history and the native page editor. Included in the platform; no addon installation. |
| Actions                | Collect actionable records into Today, Upcoming, High priority, All actions and Completed. Status changes update the underlying record.                                                                                                                                                                                      |
| Rooms                  | Workspace conversations and collaboration, with room membership, unread indicators and calling surfaces. Relay services require your own host configuration.                                                                                                                                                                 |
| Docs                   | Nested pages and notes, rich blocks, references and linked knowledge. The canonical BlockSuite editor supports revision-protected saves, conversion recovery and inline databases.                                                                                                                                           |
| Dashboard              | Arrange connected widgets, choose layouts and resize/reorder blocks. Add widgets directly from the shop's preview overlay.                                                                                                                                                                                                   |
| Databases              | Structured records, typed properties, relations, saved filters/sorts, and table, board and calendar views. Records can appear across the other native sections without duplication.                                                                                                                                          |
| Sidebar                | Drag the native section handles to reorder Calendar, Projects and the other sections. Arrow keys and settings buttons provide keyboard alternatives. Pin compact widgets, hide sections, organize page/addon groups and resize the sidebar. Section order and pinned widgets are stored per account/workspace on the device. |
| Search and connections | Search accessible workspace content and follow references, backlinks and record relationships. Optional AI providers require host configuration. Atlas adds a dedicated visual exploration application.                                                                                                                      |
| Workspaces and access  | Switch personal/collaborative workspaces and use owner/editor/viewer roles. Workspace ownership and host package-administration rights are separate.                                                                                                                                                                         |
| Appearance             | Shared monochrome foundations, light/dark modes, page icons, covers and appearance controls, with reduced-motion support.                                                                                                                                                                                                    |
| Web and desktop        | A shared workspace UI in the browser, Windows WebView2/Tauri shell and macOS AppKit/WKWebView shell. Native connections use the configured HTTPS host and native credential storage.                                                                                                                                         |

## Optional addons

| Addon                                                     | Overview                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Atlas](../modules/monolith--atlas/)                      | A visual knowledge space for maps, backlinks, linked pages and discovery. It is an optional package and has no permanent native sidebar entry.                                                                                |
| [Automations](../modules/monolith--automations/README.md) | Create visual workflows from triggers and actions, connect nodes, run them, and inspect step outputs. Includes field assignment, branching, HTTP requests, delays and import/export. Scheduled execution requires its worker. |
| [Agents](../modules/monolith--agents/)                    | Agent profiles, reporting lines, project assignments, execution leases, review and usage history. Configured local/OpenAI/CLI workers execute tasks against granted project context.                                          |
| [Redraw](../modules/monolith--redraw/)                    | A visual studio for designs, whiteboards and connected ideas, with work represented inside the workspace's content model.                                                                                                     |
| [Gym](../modules/monolith--gym/)                          | Training plans, workout sessions, exercise and strength history. Training widgets bring the current plan and activity summary into the dashboard.                                                                             |
| [Tech Lab](../modules/monolith--tech-lab/)                | Track devices, hosted services, game servers and observed health. Monitoring widgets use the configured host collectors.                                                                                                      |
| uRPG                                                      | An optional workspace experience for characters, habits, quests and progress. It is currently included in the main workspace client; it is not an independently downloadable release package.                                 |

## Included and addon-provided widgets

| Widget                         | Overview                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Calendar                       | Month, week or agenda next to your pages, with configurable view and filters.                                    |
| Weather                        | Local conditions and forecast for the chosen city. Requires the configured weather integration.                  |
| Habit tracker                  | Daily habits and check-ins without leaving your dashboard or sidebar.                                            |
| Stocks & crypto                | A configurable market watchlist using available price integrations.                                              |
| Workspace pulse                | A summary of the current workspace's records and activity.                                                       |
| Action agenda                  | Relevant upcoming/today actions from the workspace's existing records.                                           |
| Project focus                  | Project progress and a path back to the connected project.                                                       |
| Quick links                    | Shortcuts to native workspace sections.                                                                          |
| Upcoming events                | The next events from connected workspace dates.                                                                  |
| Linked database                | A live view of an existing database inside a page or dashboard. Configure it through the canvas database picker. |
| Training pulse / Training plan | Gym summaries and plan views, available when Gym is enabled.                                                     |
| Services / Health / Device / Uptime / Machines | Tech Lab live monitoring views, available when Tech Lab is enabled.                              |
| Character / Vitals / XP        | uRPG character and progression widgets when that workspace experience is active.                                 |

The shop only exposes widget implementations available to the current workspace. Sidebar preferences never grant access to data that the user's workspace role cannot read. Preview controls that change shared data use the same permissions as the underlying widget.

See [release preparation](RELEASING.md) for catalog signing, independent package versions, installation recovery and the current update-system limits.
