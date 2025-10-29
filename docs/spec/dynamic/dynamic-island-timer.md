# Dynamic Island Timer (TrackPay)

## Overview
- **Audience**: TrackPay service providers using iPhone 14 Pro/Max running iOS 16.1+.
- **Purpose**: Surface the active session timer in the Dynamic Island (and eventually Live Activities) so providers can monitor elapsed time and stop a session without reopening the app.
- **Source of truth**: Existing React Native session timer (local device state). No new backend calls required.

## Goals
- Show client name and elapsed time in the Dynamic Island for the latest active session.
- Provide a quick action to stop the active session from the expanded island.
- Maintain exactly one active timer presentation at a time (matching app constraint of a single active session).
- Ensure the feature is resilient across foreground/background transitions and app restarts.

## Non-Goals
- Starting sessions from the island.
- Supporting multiple simultaneous sessions.
- Remote ActivityKit push updates (no push token plumbing).
- Devices below iOS 16.1 or without Dynamic Island hardware.

## User Experience
- **Compact island**: client initials + elapsed time (MM:SS); tap opens the app’s active session screen.
- **Minimal island**: elapsed time only.
- **Expanded island / Live Activity** (long-press): client name, elapsed time (HH:MM), “Stop session” button. Button ends the session and dismisses the island on success.
- **Live Activities (lock screen)**: mirrors expanded view content; shipped when ready (behind feature flag).
- When the session is stopped elsewhere, the island / Live Activity ends automatically within 2 seconds.

## Functional Requirements
1. TrackPay must start the island presentation immediately after an active session begins.
2. Timer display must tick at least every 5 seconds while backgrounded; 1-second cadence while foregrounded.
3. Stopping the session via island triggers existing JS stop flow; island shows spinner/disabled state until completion.
4. On app relaunch, if ActivityKit reports an active activity, sync state and resume timer display.
5. On logout or app crash recovery, close any stray activities.
6. Instrument analytics events for start/stop/failure paths.

## Technical Approach
- **Expo workflow**: Stay on managed workflow with config plugin.
  - Add custom config plugin enabling ActivityKit capability, embedding `ActivityKitWidgetExtension`.
  - Provide Swift widget/Live Activity target with `DynamicIsland` layouts described above.
- **Native bridge**:
  - `startDynamicIslandActivity(sessionId, clientName, startTimestampMs)`.
  - `updateDynamicIslandElapsed(sessionId, elapsedSeconds)`.
  - `endDynamicIslandActivity(sessionId)`.
  - Bridge exposes callbacks/promises for JS to handle success/errors.
- **JS integration**:
  - Wrap session state machine to call bridge functions.
  - Schedule foreground timer (existing) plus background-safe updates (use `setInterval` guarded by AppState events).
- **Error handling**:
  - If bridge throws (unsupported device/version), fall back silently; log error.
  - If stop action fails, keep island active and show error toast in-app once app regains focus.
- **Feature flagging**:
  - `EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED` env flag to toggle.
  - Prepare Live Activity layout but gate behind `EXPO_PUBLIC_LIVE_ACTIVITY_ENABLED`.

## Testing & Validation
- Manual QA on iPhone 14 Pro simulator & physical device: start, stop, background, lock screen, device reboot scenarios.
- Automated unit tests for JS timer manager where feasible.
- Beta rollout via TestFlight with analytics monitoring.

## Dependencies
- iOS 16.1+ (ActivityKit).
- Expo config plugin + native Swift code in `ios` directory (requires EAS build).
- Existing session timer logic must guarantee “single active session” invariant.

## Open Questions
- Do we need haptic feedback when the island stop button is pressed?
- Should we surface billing rate or other metadata in the expanded layout?
- Any enterprise MDM policies that disable ActivityKit for clients?

## Timeline & Phasing
1. **Phase A – Dynamic Island** (1 sprint):
   - Config plugin, bridge, island layout, analytics.
2. **Phase B – Live Activities** (0.5 sprint):
   - Lock screen layout, feature flag enablement.
3. **Phase C – Enhancements** (future):
   - Add pause/resume, multi-client, push updates if needed.

## Rollout & Support
- Ship as optional feature flag; default off in production until QA complete.
- Update release notes and provider onboarding docs.
- Monitor analytics for stop failures or unsupported-device usage spikes post release.
