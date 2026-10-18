---
title: Updates and recovery
description: Signed releases, download progress, installation choices and rollback boundaries.
section: Host & build
order: 31
---

Monolith’s Windows client, universal macOS client and single-host Linux Docker deployment have update support built around signed GitHub Releases. This requires the signed update manifest and an updater-enabled installation; it is not activated by publishing this website.

Starting with 0.1.4, automatic updates are enabled while installers remain unsigned. Update manifests and archives are authenticated with Monolith’s pinned release key. Existing 0.1.3 and preview desktop clients need the new installer once to receive that key. See [release availability](/docs/availability) for the current distribution status.

## See available updates

Open **Settings → Updates** to see the installed version, release notes, downloaded bytes and installation or recovery state. Notifications appear when a release is available or an installation needs attention. Desktop onboarding also has an Updates button.

Checks run at supervisor startup and every six hours, with a manual check available. Errors back off. Stable uses GitHub’s latest stable release; Beta selects the highest eligible version among the latest 30 published releases. The updater does not automatically downgrade.

## Control download and installation separately

Automatic downloads are enabled by default once signing is configured. Automatic installation starts **on** for new updater-enabled installations and can be disabled separately for each desktop client and the hosted server. Existing configured preferences are preserved.

- **Desktop:** automatic installation waits for the app to be in the background and idle for two minutes. Save and persisted-draft guards must pass.
- **Server:** installation uses the chosen one-hour UTC maintenance window. Host administrators can also install immediately.
- **Browser:** when server automatic installation is enabled, an outdated tab can reload after two idle minutes in the background, subject to save guards.

A failed version is not repeatedly installed automatically. Read the reported error and resolve the cause before trying again.

## Verification and rollback

Signed metadata binds the version, platform, byte size, checksum and download URL. The updater verifies the package before activation.

Desktop updates retain the previous application. The new client must start and acknowledge readiness; an early exit, launch failure or missing acknowledgement restores the previous version. **Restore previous version** provides a manual recovery action after success. User settings, credentials and drafts live outside the replaceable app files.

The server supervisor retains previous image IDs and checks both Compose health and application health. It restores the old runtime if activation fails. Single-host replacement involves a short service interruption. An interrupted transaction is recovered from its journal before another update proceeds.

## Schema changes need a planned release

Automatic server installation requires the same database schema fingerprint and updater protocol. A changed schema is shown as requiring a planned migration. Back up, migrate and verify deliberately before configuring a new baseline.

Rollback is startup and health recovery. It does not reverse a database migration or guarantee recovery from every later application regression.

## Configure the release system

Maintainers configure the release signing key in the release workflow. Windows publisher certificates and macOS Developer ID/notarization can be added later without changing the update key or feed. The unsigned mode still verifies every archive and Mac bundle. Public clients receive only the trusted public key. The updater currently reads public GitHub release assets; private GitHub and mirrored transports need an explicit extension.

The repository’s `docs/UPDATES.md` contains the exact signing variables, supervisor service configuration and platform rollout checks. The supervisor runs outside the containers and currently targets one Linux Docker host, not Kubernetes or a multi-host deployment.

Before a first public release, rehearse signed upgrades and rollback on the actual supported platforms. See [development and releases](/docs/development).
