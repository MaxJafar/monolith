---
title: Rooms and collaboration
description: Keep conversations in the context of your workspace.
section: Your workspace
order: 14
---

Rooms provides workspace conversations and collaboration surfaces alongside your documents and projects. Membership and unread indicators help you keep track of the conversations you can access.

## Work in the right space

Select the intended workspace before opening Rooms. Room membership and workspace access determine what appears. Use clear room names so people can find the conversation related to a project or shared activity.

## Conversations and calls

The Rooms interface includes calling surfaces. Network and relay services must be configured on your own host for the corresponding functionality. An available call button does not mean a public relay service is included with Monolith.

Test communication between the actual devices and networks you intend to support before relying on calls. Your host’s connectivity and configuration are part of that setup.

## Shared work is still permissioned

Workspace content retains owner, editor and viewer rules. A conversation does not grant access to every linked document or database. Keep membership and content permissions aligned with the people who need them.

Monolith does not currently promise simultaneous live document co-editing. Review [pages and knowledge](/docs/pages) for document save and conflict behavior.

## Agent boundaries

The public MCP and CLI tool catalog does not expose outbound messaging or room administration. Connecting an agent does not automatically authorize it to send messages to other people. See [MCP and CLI](/docs/agents) for the supported operations.
