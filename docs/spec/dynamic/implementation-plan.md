# Dynamic Island Timer - Implementation Plan

**Feature Branch**: `feature/dynamic-island`
**Target**: iOS 16.1+ (iPhone 14 Pro/Pro Max/15 Pro/Pro Max)
**Status**: Planning Phase
**Last Updated**: 2025-10-29

---

## Executive Summary

This document outlines the phased implementation of Dynamic Island timer support for TrackPay. The feature surfaces the provider's active work session in the Dynamic Island, allowing them to monitor elapsed time and stop sessions without reopening the app.

**Key Decisions** (confirmed 2025-10-29):
- ✅ **One active session per provider** (not per client) - if data has multiple, show latest by start_time
- ✅ Custom Expo config plugin + Swift ActivityKit code (maintained in `ios/`)
- ✅ ActivityKit `Text.Timer` for automatic background updates (no JS intervals)
- ✅ Client initials: First + Last ("John Doe" → "JD", "Pluto" → "PP")
- ✅ No stop confirmation (matches in-app UX)
- ✅ Silent fallback on unsupported devices (log to PostHog only)
- ✅ **System timer format** (automatic updates, may show seconds initially)
- ✅ Simulator testing first, physical iPhone 14 Pro for pre-release verification
- ✅ Auto-continue session on app relaunch (reconstruct from ActivityKit + DB)
- ✅ Feature flags: `EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED`, `EXPO_PUBLIC_LIVE_ACTIVITY_ENABLED`

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  StyledSessionTrackingScreen / ClientListScreen        │ │
│  │  ├─ handleStartSession()                               │ │
│  │  │  └─ DynamicIslandBridge.startActivity()             │ │
│  │  └─ handleEndSession()                                 │ │
│  │     └─ DynamicIslandBridge.endActivity()               │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DynamicIslandBridge.ts                                │ │
│  │  ├─ startActivity(sessionId, clientName, startTime)    │ │
│  │  ├─ endActivity(sessionId)                             │ │
│  │  └─ getActiveActivities()                              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ NativeModules
┌──────────────────────────▼──────────────────────────────────┐
│           iOS Native (TrackPayActivityKitModule)            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Swift: TrackPayActivityKitModule.swift                │ │
│  │  ├─ @objc startActivity(...)                           │ │
│  │  ├─ @objc endActivity(sessionId)                       │ │
│  │  └─ @objc getActiveActivities()                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ActivityKit (iOS 16.1+)                               │ │
│  │  ├─ TrackPayTimerActivity                              │ │
│  │  ├─ SessionAttributes (immutable)                      │ │
│  │  └─ SessionContentState (mutable)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Dynamic Island                          │
│  ┌─────────────────┬───────────────┬────────────────────┐  │
│  │   Compact       │   Minimal     │     Expanded       │  │
│  │   "JD 01:23"    │   "01:23"     │  John Doe          │  │
│  │                 │               │  01:23             │  │
│  │                 │               │  [Stop Session]    │  │
│  └─────────────────┴───────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Session Start**:
```
User taps "I'm Here"
  → handleStartSession()
  → storageService.startSession(clientId)
  → Supabase INSERT (trackpay_sessions with start_time, status='active')
  → DynamicIslandBridge.startActivity(sessionId, clientName, startTimeMs)
  → Native: Activity<TrackPayTimerActivityAttributes>.request()
  → Dynamic Island appears with Text.Timer
  → PostHog: dynamic_island_started
```

**Session Stop (from Dynamic Island)**:
```
User taps "Stop Session" button in expanded island
  → Swift: StopSessionIntent.perform()
  → Opens deep link: trackpay://stop-session?sessionId=xxx
  → App.tsx: handleDeepLink()
  → storageService.endSession(sessionId)
  → Supabase UPDATE (end_time, duration, amount, status='unpaid')
  → DynamicIslandBridge.endActivity(sessionId)
  → Native: activity.end(dismissalPolicy: .immediate)
  → Island dismisses
  → PostHog: dynamic_island_stop_pressed
```

**App Relaunch Sync**:
```
App launches → App.tsx: syncDynamicIslandState()
  → getActiveActivities() → returns [{sessionId, clientName, startTime}]
  → For each activity:
      → Query Supabase: SELECT * FROM trackpay_sessions WHERE id=sessionId AND status='active'
      → If found: continue (activity is valid)
      → If not found: endActivity(sessionId) to clean up stale island
  → PostHog: dynamic_island_synced_on_launch
```

**Multiple Active Sessions (Anomaly)**:
```
App detects multiple active sessions (status='active')
  → Sort by start_time DESC
  → Select first (most recent)
  → startActivity() for that session
  → PostHog: dynamic_island_failed { error_code: 'MULTIPLE_ACTIVE_SESSIONS' }
```

---

## Phase A: Dynamic Island (Core Implementation)

**Timeline**: 5-7 days
**Goal**: Ship Dynamic Island with timer + stop button

---

### A1. Foundation & Setup (Day 1)

#### Task 1.1: Create Expo Config Plugin

**File**: `ios-app/plugins/withActivityKit.js`

```javascript
const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin to enable ActivityKit (Dynamic Island + Live Activities)
 * - Adds NSSupportsLiveActivities to Info.plist
 */
function withActivityKit(config) {
  // Add NSSupportsLiveActivities to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });

  return config;
}

module.exports = withActivityKit;
```

**Register in app.json**:
```json
{
  "expo": {
    "plugins": [
      "expo-font",
      "expo-localization",
      "./plugins/withActivityKit.js"
    ]
  }
}
```

**Verification**:
```bash
cd ios-app
npx expo prebuild --clean
```

Check `ios/TrackPay/Info.plist` contains:
```xml
<key>NSSupportsLiveActivities</key>
<true/>
```

---

#### Task 1.2: Create Swift Widget Extension Target

**Method**: Manual setup via Xcode (required for Widget Extension)

**Steps**:
1. Open Xcode:
   ```bash
   cd ios-app/ios
   open TrackPay.xcworkspace
   ```

2. Create new target:
   - File → New → Target
   - Choose: **Widget Extension**
   - Product Name: `TrackPayTimerWidget`
   - Include Live Activity: **YES**
   - Language: Swift
   - Deployment Target: iOS 16.1

3. Xcode will create:
   - `TrackPayTimerWidget/` directory
   - `TrackPayTimerWidget.swift` (main widget bundle)
   - `TrackPayTimerWidgetLiveActivity.swift` (Live Activity template)
   - `Assets.xcassets/` (widget assets)
   - `Info.plist`

**Important**: Delete or rename the auto-generated template files. We'll create custom ones.

---

#### Task 1.3: Define Activity Data Model

**File**: `ios-app/ios/TrackPayTimerWidget/TrackPayTimerActivityAttributes.swift`

```swift
import Foundation
import ActivityKit

/// Activity attributes for TrackPay timer Live Activity
@available(iOS 16.1, *)
struct TrackPayTimerActivityAttributes: ActivityAttributes {
    /// Mutable state that can be updated during activity lifetime
    public struct ContentState: Codable, Hashable {
        var sessionId: String
        var clientName: String
        var startTime: Date
        var status: String  // "active" | "stopping"
    }

    // Immutable attributes (set once at activity creation)
    var sessionId: String
    var clientId: String
    var clientName: String
}
```

---

#### Task 1.4: Create Dynamic Island Layouts

**File**: `ios-app/ios/TrackPayTimerWidget/TrackPayTimerLiveActivity.swift`

```swift
import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct TrackPayTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TrackPayTimerActivityAttributes.self) { context in
            // Lock screen banner (Phase B - Live Activities)
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // ========== EXPANDED VIEW ==========
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.state.clientName)
                            .font(.headline)
                            .lineLimit(1)
                    } icon: {
                        Image(systemName: "person.circle.fill")
                            .foregroundColor(.blue)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        // Timer with system format (may show seconds initially, varies by locale)
                        Text(timerInterval: context.state.startTime...Date.distantFuture, countsDown: false)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundColor(.primary)

                        Text("Elapsed")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.status == "stopping" {
                        // Show spinner while stopping
                        HStack {
                            Spacer()
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                            Text("Stopping...")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .padding()
                    } else {
                        // Stop Session button
                        Button(intent: StopSessionIntent(sessionId: context.state.sessionId)) {
                            HStack {
                                Image(systemName: "stop.circle.fill")
                                Text("Stop Session")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                }

            } compactLeading: {
                // ========== COMPACT LEADING: Client Initials ==========
                Text(getInitials(from: context.state.clientName))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.blue)

            } compactTrailing: {
                // ========== COMPACT TRAILING: System Timer ==========
                Text(timerInterval: context.state.startTime...Date.distantFuture, countsDown: false)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.trailing)

            } minimal: {
                // ========== MINIMAL: System Timer Only ==========
                Text(timerInterval: context.state.startTime...Date.distantFuture, countsDown: false)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.primary)
            }
            .widgetURL(URL(string: "trackpay://session?clientId=\(context.attributes.clientId)"))
        }
    }

    /// Extract initials from client name
    /// - "John Doe" → "JD"
    /// - "Pluto" → "PP"
    private func getInitials(from name: String) -> String {
        let components = name.split(separator: " ")

        if components.count >= 2 {
            // First + Last initial
            let first = String(components[0].prefix(1).uppercased())
            let last = String(components[1].prefix(1).uppercased())
            return "\(first)\(last)"
        } else if components.count == 1 {
            // Single word: repeat first letter
            let initial = String(components[0].prefix(1).uppercased())
            return "\(initial)\(initial)"
        }

        // Fallback
        return "TP"
    }
}

// ========== LOCK SCREEN VIEW (Phase B) ==========
@available(iOS 16.1, *)
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<TrackPayTimerActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .foregroundColor(.blue)
                .font(.title2)

            VStack(alignment: .leading, spacing: 2) {
                Text(context.state.clientName)
                    .font(.headline)
                Text("Session in progress")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(timerInterval: context.state.startTime...Date.distantFuture, countsDown: false)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .monospacedDigit()
        }
        .padding()
    }
}
```

**Note**: SwiftUI's `Text(timerInterval:countsDown:)` uses ActivityKit's built-in timer, which automatically updates without JS intervention. Format is controlled by system defaults and may vary by locale. Shows seconds until 1 minute elapsed. This trade-off allows ActivityKit's automatic battery-efficient updates without manual timer management.

---

#### Task 1.5: Create Stop Session App Intent

**File**: `ios-app/ios/TrackPayTimerWidget/StopSessionIntent.swift`

```swift
import AppIntents
import Foundation

/// App Intent triggered when user taps "Stop Session" in Dynamic Island
@available(iOS 16.0, *)
struct StopSessionIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Session"
    static var description = IntentDescription("Stop the active work session")

    @Parameter(title: "Session ID")
    var sessionId: String

    init() {}

    init(sessionId: String) {
        self.sessionId = sessionId
    }

    func perform() async throws -> some IntentResult {
        // Return result that opens app with deep link
        let urlString = "trackpay://stop-session?sessionId=\(sessionId)"
        guard let url = URL(string: urlString) else {
            return .result()
        }

        return .result(opening: url)
    }
}
```

---

#### Task 1.6: Create Native Module Bridge

**File**: `ios-app/ios/TrackPay/TrackPayActivityKitModule.swift`

```swift
import Foundation
import ActivityKit
import React

@objc(TrackPayActivityKitModule)
class TrackPayActivityKitModule: NSObject {

    /// Store active activities by sessionId for easy lookup
    private var activeActivities: [String: Activity<TrackPayTimerActivityAttributes>] = [:]

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    /// Start a Dynamic Island activity for a session
    @objc
    func startActivity(
        _ sessionId: String,
        clientId: String,
        clientName: String,
        startTimeMs: Double,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        // Check iOS version support
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED_VERSION", "ActivityKit requires iOS 16.1+", nil)
            return
        }

        // Check if Live Activities are enabled
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            rejecter("ACTIVITIES_DISABLED", "Live Activities are disabled in Settings", nil)
            return
        }

        // Convert timestamp
        let startTime = Date(timeIntervalSince1970: startTimeMs / 1000)

        // Create attributes and initial state
        let attributes = TrackPayTimerActivityAttributes(
            sessionId: sessionId,
            clientId: clientId,
            clientName: clientName
        )

        let initialState = TrackPayTimerActivityAttributes.ContentState(
            sessionId: sessionId,
            clientName: clientName,
            startTime: startTime,
            status: "active"
        )

        do {
            // Request activity from ActivityKit
            let activity = try Activity<TrackPayTimerActivityAttributes>.request(
                attributes: attributes,
                contentState: initialState,
                pushType: nil  // No remote push updates for now
            )

            // Store reference
            activeActivities[sessionId] = activity

            resolver([
                "success": true,
                "activityId": activity.id
            ])
        } catch {
            rejecter("START_FAILED", "Failed to start activity: \(error.localizedDescription)", error)
        }
    }

    /// End a Dynamic Island activity
    @objc
    func endActivity(
        _ sessionId: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolver(["success": false, "reason": "unsupported"])
            return
        }

        guard let activity = activeActivities[sessionId] else {
            rejecter("NOT_FOUND", "No active activity found for session \(sessionId)", nil)
            return
        }

        Task {
            // Update to "stopping" state briefly
            let stoppingState = TrackPayTimerActivityAttributes.ContentState(
                sessionId: sessionId,
                clientName: activity.attributes.clientName,
                startTime: activity.contentState.startTime,
                status: "stopping"
            )

            await activity.update(using: stoppingState)

            // Dismiss after brief delay
            try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
            await activity.end(dismissalPolicy: .immediate)

            // Clean up
            activeActivities.removeValue(forKey: sessionId)

            resolver(["success": true])
        }
    }

    /// Get all currently active ActivityKit activities
    /// Used for state sync on app relaunch
    @objc
    func getActiveActivities(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolver([])
            return
        }

        // Query all active activities from ActivityKit
        let activities = Activity<TrackPayTimerActivityAttributes>.activities

        let activeData = activities.map { activity in
            return [
                "sessionId": activity.attributes.sessionId,
                "clientId": activity.attributes.clientId,
                "clientName": activity.attributes.clientName,
                "startTime": activity.contentState.startTime.timeIntervalSince1970 * 1000  // milliseconds
            ]
        }

        resolver(activeData)
    }
}
```

---

**Objective-C Bridge**: `ios-app/ios/TrackPay/TrackPayActivityKitModule.m`

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TrackPayActivityKitModule, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSString *)sessionId
                  clientId:(NSString *)clientId
                  clientName:(NSString *)clientName
                  startTimeMs:(double)startTimeMs
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endActivity:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getActiveActivities:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
```

---

**Bridging Header** (if not exists): `ios-app/ios/TrackPay/TrackPay-Bridging-Header.h`

```objc
#import <React/RCTBridgeModule.h>
```

**Checkpoint**: Build in Xcode → verify no compilation errors.

---

### A2. JavaScript Bridge Wrapper (Day 2)

**File**: `ios-app/src/services/native/DynamicIslandBridge.ts`

```typescript
import { NativeModules, Platform } from 'react-native';
import { capture } from '../analytics/posthog';

const { TrackPayActivityKitModule } = NativeModules;

interface ActivityKitModule {
  startActivity(
    sessionId: string,
    clientId: string,
    clientName: string,
    startTimeMs: number
  ): Promise<{ success: boolean; activityId: string }>;

  endActivity(sessionId: string): Promise<{ success: boolean }>;

  getActiveActivities(): Promise<Array<{
    sessionId: string;
    clientId: string;
    clientName: string;
    startTime: number;  // milliseconds
  }>>;
}

const nativeModule: ActivityKitModule | null =
  Platform.OS === 'ios' && TrackPayActivityKitModule
    ? TrackPayActivityKitModule
    : null;

/**
 * Check if Dynamic Island is supported on this device
 * Requires iOS 16.1+ and ActivityKit module availability
 */
export function isDynamicIslandSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (!nativeModule) return false;

  // iOS 16.1+ required
  const iosVersion = parseInt(Platform.Version as string, 10);
  return iosVersion >= 16;
}

/**
 * Check if feature is enabled via environment variable
 */
export function isDynamicIslandEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED === 'true';
}

/**
 * Start a Dynamic Island activity for an active session
 *
 * @param sessionId - Session UUID
 * @param clientId - Client UUID (for deep linking)
 * @param clientName - Client display name
 * @param startTime - Session start time
 * @returns true on success, false on failure
 */
export async function startDynamicIslandActivity(
  sessionId: string,
  clientId: string,
  clientName: string,
  startTime: Date
): Promise<boolean> {
  // Check feature flag
  if (!isDynamicIslandEnabled()) {
    if (__DEV__) {
      console.log('[DynamicIsland] Feature disabled via env flag');
    }
    return false;
  }

  // Check module availability
  if (!nativeModule) {
    if (__DEV__) {
      console.log('[DynamicIsland] Module not available, skipping');
    }
    return false;
  }

  try {
    const startTimeMs = startTime.getTime();
    const result = await nativeModule.startActivity(
      sessionId,
      clientId,
      clientName,
      startTimeMs
    );

    if (__DEV__) {
      console.log('[DynamicIsland] Activity started:', result);
    }

    // Analytics
    capture('dynamic_island_started', {
      session_id: sessionId,
      client_id: clientId,
      start_time: startTime.toISOString(),
    });

    return true;
  } catch (error: any) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to start activity:', error);
    }

    // Analytics - silent failure
    capture('dynamic_island_failed', {
      session_id: sessionId,
      client_id: clientId,
      error_code: error.code || 'UNKNOWN',
      error_message: error.message || String(error),
      operation: 'start',
    });

    return false;
  }
}

/**
 * End a Dynamic Island activity
 *
 * @param sessionId - Session UUID
 * @returns true on success, false on failure
 */
export async function endDynamicIslandActivity(sessionId: string): Promise<boolean> {
  if (!nativeModule) return false;

  try {
    await nativeModule.endActivity(sessionId);

    if (__DEV__) {
      console.log('[DynamicIsland] Activity ended:', sessionId);
    }

    return true;
  } catch (error: any) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to end activity:', error);
    }

    capture('dynamic_island_failed', {
      session_id: sessionId,
      error_code: error.code || 'UNKNOWN',
      error_message: error.message || String(error),
      operation: 'end',
    });

    return false;
  }
}

/**
 * Get all active Dynamic Island activities
 * Used for state sync on app relaunch
 *
 * @returns Array of active activities
 */
export async function getActiveActivities(): Promise<Array<{
  sessionId: string;
  clientId: string;
  clientName: string;
  startTime: Date;
}>> {
  if (!nativeModule) return [];

  try {
    const activities = await nativeModule.getActiveActivities();

    return activities.map(a => ({
      ...a,
      startTime: new Date(a.startTime),
    }));
  } catch (error) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to get activities:', error);
    }
    return [];
  }
}
```

**Checkpoint**: Import in a test screen → call `isDynamicIslandSupported()` → verify no crashes.

---

### A3. Session Timer Integration (Day 3)

#### Task 3.1: Integrate into StyledSessionTrackingScreen

**File**: `ios-app/src/screens/StyledSessionTrackingScreen.tsx`

```typescript
// Add import at top
import {
  startDynamicIslandActivity,
  endDynamicIslandActivity
} from '../services/native/DynamicIslandBridge';

// Inside component, modify handleStartSession:
const handleStartSession = async () => {
  try {
    const crewSize = parseInt(crewCount, 10);
    const newSession = await startSession(clientId, crewSize);
    setActiveSession(newSession);
    setSessionTime(0);

    // Start Dynamic Island activity
    if (client) {
      await startDynamicIslandActivity(
        newSession.id,
        clientId,
        client.name,
        new Date(newSession.startTime)
      );
    }

    // Analytics (existing)
    capture('action_session_started', {
      client_id: clientId,
      crew_size: crewSize,
      hourly_rate: client?.hourlyRate,
      start_time: newSession.startTime,
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Error starting session:', error);
    }
    Alert.alert('Error', 'Failed to start session');
  }
};

// Modify handleEndSession:
const handleEndSession = async () => {
  if (!activeSession) return;

  try {
    // End Dynamic Island activity first
    await endDynamicIslandActivity(activeSession.id);

    // Then end session in backend
    await endSession(activeSession.id);

    setActiveSession(null);
    setSessionTime(0);
    loadData(); // Refresh summary data

    // Analytics (existing)
    capture('action_session_stopped', {
      session_id: activeSession.id,
      client_id: clientId,
      total_duration_minutes: Math.round(sessionTime / 60),
      crew_size: activeSession.crewSize || 1,
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Error ending session:', error);
    }
    Alert.alert('Error', 'Failed to end session');
  }
};
```

---

#### Task 3.2: Integrate into ClientListScreen

**File**: `ios-app/src/screens/ClientListScreen.tsx` (around line 325)

Find existing `handleStartSession` / `handleStopSession`, add same Dynamic Island calls:

```typescript
import {
  startDynamicIslandActivity,
  endDynamicIslandActivity
} from '../services/native/DynamicIslandBridge';

// In handleStartSession:
const session = await startSession(client.id, 1);
await startDynamicIslandActivity(
  session.id,
  client.id,
  client.name,
  new Date(session.startTime)
);

// In handleStopSession:
await endDynamicIslandActivity(activeSession.id);
await endSession(activeSession.id);
```

**Checkpoint**: Start session → verify Dynamic Island appears with timer ticking.

---

### A4. Deep Linking (Day 3-4)

#### Task 4.1: Add URL Scheme Handler in App.tsx

**File**: `ios-app/App.tsx`

```typescript
import { Linking } from 'react-native';
import { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { endSession, getSessions } from './src/services/storageService';
import { endDynamicIslandActivity } from './src/services/native/DynamicIslandBridge';
import { capture } from './src/services/analytics/posthog';

// Create navigation ref for deep linking
export const navigationRef = useRef<NavigationContainerRef<any>>(null);

// Inside App component:
useEffect(() => {
  /**
   * Handle deep links from Dynamic Island
   * - trackpay://stop-session?sessionId=xxx → Stop session
   * - trackpay://session?clientId=xxx → Navigate to SessionTracking screen
   */
  const handleDeepLink = async (event: { url: string }) => {
    const url = event.url;

    if (__DEV__) {
      console.log('[DeepLink] Received:', url);
    }

    // Handle stop-session deep link (from Stop Session button)
    if (url.startsWith('trackpay://stop-session')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const sessionId = params.get('sessionId');

      if (sessionId) {
        try {
          if (__DEV__) {
            console.log('[DeepLink] Stopping session from Dynamic Island:', sessionId);
          }

          // End session in backend
          await endSession(sessionId);

          // End Dynamic Island activity
          await endDynamicIslandActivity(sessionId);

          // Analytics
          capture('dynamic_island_stop_pressed', {
            session_id: sessionId,
          });

          // Optional: Show toast notification
          // Toast.show('Session stopped');
        } catch (error) {
          if (__DEV__) {
            console.error('[DeepLink] Failed to stop session:', error);
          }
        }
      }
    }

    // Handle navigation deep link (tap compact/minimal island)
    if (url.startsWith('trackpay://session')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const clientId = params.get('clientId');

      if (clientId && navigationRef.current?.isReady()) {
        // Navigate to SessionTracking screen
        navigationRef.current.navigate('SessionTracking', { clientId });

        if (__DEV__) {
          console.log('[DeepLink] Navigating to SessionTracking:', clientId);
        }
      }
    }
  };

  // Listen for deep links while app is open
  const subscription = Linking.addEventListener('url', handleDeepLink);

  // Handle initial URL (if app was closed and opened via deep link)
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink({ url });
    }
  });

  return () => {
    subscription.remove();
  };
}, []);

// Update NavigationContainer to use ref:
return (
  <NavigationContainer ref={navigationRef}>
    {/* ... existing navigation */}
  </NavigationContainer>
);
```

**Checkpoint**: Tap compact island → app opens to SessionTracking screen.

---

### A5. State Sync on App Relaunch (Day 4)

**File**: `ios-app/App.tsx` (add after deep link handler)

```typescript
import { getActiveActivities } from './src/services/native/DynamicIslandBridge';
import { getSessions } from './src/services/storageService';

useEffect(() => {
  /**
   * Sync Dynamic Island state on app relaunch
   * - Query ActivityKit for active activities
   * - Verify each activity has a matching active session in Supabase
   * - Clean up stale activities (session no longer active)
   */
  const syncDynamicIslandState = async () => {
    try {
      const activities = await getActiveActivities();

      if (activities.length === 0) {
        if (__DEV__) {
          console.log('[DynamicIsland] No active activities found');
        }
        return;
      }

      if (__DEV__) {
        console.log('[DynamicIsland] Found active activities:', activities.length);
      }

      // Fetch all sessions with status='active'
      const allSessions = await getSessions();
      const activeSessions = allSessions.filter(s => s.status === 'active');
      const activeSessionIds = new Set(activeSessions.map(s => s.id));

      // Check each activity
      for (const activity of activities) {
        if (activeSessionIds.has(activity.sessionId)) {
          // Valid session - log successful sync
          if (__DEV__) {
            console.log('[DynamicIsland] Synced active session:', activity.sessionId);
          }

          capture('dynamic_island_synced_on_launch', {
            session_id: activity.sessionId,
            client_id: activity.clientId,
          });
        } else {
          // Stale activity - clean up
          if (__DEV__) {
            console.log('[DynamicIsland] Cleaning up stale activity:', activity.sessionId);
          }

          await endDynamicIslandActivity(activity.sessionId);

          capture('dynamic_island_failed', {
            session_id: activity.sessionId,
            error_code: 'STALE_ACTIVITY',
            error_message: 'Activity exists but session is not active',
            operation: 'sync',
          });
        }
      }

      // Check for multiple active sessions (anomaly)
      if (activeSessions.length > 1) {
        if (__DEV__) {
          console.warn('[DynamicIsland] ANOMALY: Multiple active sessions detected:', activeSessions.length);
        }

        capture('dynamic_island_failed', {
          error_code: 'MULTIPLE_ACTIVE_SESSIONS',
          error_message: `Found ${activeSessions.length} active sessions`,
          operation: 'sync',
        });

        // Show most recent session in island (if no activity exists yet)
        if (activities.length === 0) {
          const mostRecent = activeSessions.sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )[0];

          // Get client name (need to fetch client data)
          const clients = await getClients();
          const client = clients.find(c => c.id === mostRecent.clientId);

          if (client) {
            await startDynamicIslandActivity(
              mostRecent.id,
              mostRecent.clientId,
              client.name,
              new Date(mostRecent.startTime)
            );
          }
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[DynamicIsland] State sync failed:', error);
      }
    }
  };

  // Run sync after a brief delay (let app initialize)
  const timer = setTimeout(() => {
    syncDynamicIslandState();
  }, 1000);

  return () => clearTimeout(timer);
}, []);
```

**Checkpoint**: Force-quit app with active session → Relaunch → Verify session continues or cleans up.

---

### A6. Logout Cleanup (Day 4)

**File**: `ios-app/src/contexts/AuthContext.tsx`

```typescript
import {
  getActiveActivities,
  endDynamicIslandActivity
} from '../services/native/DynamicIslandBridge';

// Inside AuthContext, modify logout function:
const logout = async () => {
  try {
    // Clean up any active Dynamic Island activities
    const activities = await getActiveActivities();

    if (__DEV__) {
      console.log('[Auth] Cleaning up Dynamic Island activities on logout:', activities.length);
    }

    for (const activity of activities) {
      await endDynamicIslandActivity(activity.sessionId);
    }

    // ... existing logout logic (Supabase signOut, etc.)
  } catch (error) {
    if (__DEV__) {
      console.error('[Auth] Logout error:', error);
    }
  }
};
```

**Checkpoint**: Start session → logout → verify island dismisses.

---

### A7. Analytics Integration (Day 5)

**File**: `ios-app/src/services/analytics/events.ts`

Add new event schemas:

```typescript
import { z } from 'zod';

// Dynamic Island Events
export const dynamicIslandStartedSchema = z.object({
  session_id: z.string().uuid(),
  client_id: z.string().uuid(),
  start_time: z.string().datetime(),
});

export const dynamicIslandStopPressedSchema = z.object({
  session_id: z.string().uuid(),
});

export const dynamicIslandFailedSchema = z.object({
  session_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  error_code: z.string(),
  error_message: z.string(),
  operation: z.enum(['start', 'end', 'sync']),
});

export const dynamicIslandSyncedOnLaunchSchema = z.object({
  session_id: z.string().uuid(),
  client_id: z.string().uuid(),
});

// Event name constants
export const E = {
  // ... existing events
  DYNAMIC_ISLAND_STARTED: 'dynamic_island_started',
  DYNAMIC_ISLAND_STOP_PRESSED: 'dynamic_island_stop_pressed',
  DYNAMIC_ISLAND_FAILED: 'dynamic_island_failed',
  DYNAMIC_ISLAND_SYNCED_ON_LAUNCH: 'dynamic_island_synced_on_launch',
} as const;

// Add to schemaMap
export const schemaMap: Record<string, z.ZodSchema> = {
  // ... existing schemas
  [E.DYNAMIC_ISLAND_STARTED]: dynamicIslandStartedSchema,
  [E.DYNAMIC_ISLAND_STOP_PRESSED]: dynamicIslandStopPressedSchema,
  [E.DYNAMIC_ISLAND_FAILED]: dynamicIslandFailedSchema,
  [E.DYNAMIC_ISLAND_SYNCED_ON_LAUNCH]: dynamicIslandSyncedOnLaunchSchema,
};
```

**Checkpoint**: Trigger events → verify validation passes → check PostHog dashboard (dry-run mode).

---

### A8. Feature Flags & Environment Variables (Day 5)

**File**: `ios-app/.env.development`

```bash
# ... existing env vars
EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=true
```

**File**: `ios-app/.env.production`

```bash
# ... existing env vars
EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=false  # Default off until QA complete
```

**File**: `ios-app/.env.sample`

```bash
# ... existing env vars

# Dynamic Island / Live Activities
EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=true
EXPO_PUBLIC_LIVE_ACTIVITY_ENABLED=false  # Phase B
```

**Usage**: Already integrated in `DynamicIslandBridge.ts` via `isDynamicIslandEnabled()`.

**Checkpoint**: Toggle flag → rebuild app → verify feature enables/disables.

---

### A9. Testing & QA (Day 6-7)

#### Manual Test Cases

**Test 1: Basic Flow** ✅
- [ ] Start session → Dynamic Island appears
- [ ] Verify timer shows elapsed time (system format, may include seconds)
- [ ] Verify client initials in compact view ("John Doe" → "JD")
- [ ] Timer updates automatically (watch for 60+ seconds)
- [ ] Tap compact island → app opens to SessionTracking screen
- [ ] Long-press island → expanded view shows client name, timer, stop button

**Test 2: Stop from Island** ✅
- [ ] Tap "Stop Session" button in expanded view
- [ ] Verify button shows spinner briefly
- [ ] Session ends in app (verify in Supabase)
- [ ] Dynamic Island dismisses
- [ ] Analytics event `dynamic_island_stop_pressed` captured

**Test 3: Stop from App** ✅
- [ ] Start session → Dynamic Island active
- [ ] Stop session from within app (not island)
- [ ] Verify island dismisses within 1-2 seconds

**Test 4: Background/Foreground** ✅
- [ ] Start session → background app (Home Screen)
- [ ] Verify timer continues in island
- [ ] Wait 5+ minutes → reopen app → verify elapsed time matches

**Test 5: App Relaunch** ✅
- [ ] Start session → force-quit app
- [ ] Tap Dynamic Island → app relaunches
- [ ] Verify session screen shows correct elapsed time
- [ ] Analytics event `dynamic_island_synced_on_launch` captured

**Test 6: Stale Activity Cleanup** ✅
- [ ] Start session → manually end session in Supabase (UPDATE status='unpaid')
- [ ] Force-quit app → relaunch
- [ ] Verify island dismisses automatically (stale activity cleanup)

**Test 7: Multiple Active Sessions (Anomaly)** ⚠️
- [ ] Manually create 2 active sessions in Supabase (bypass UI)
- [ ] Force-quit app → relaunch
- [ ] Verify only most recent session shown in island
- [ ] Check logs for `MULTIPLE_ACTIVE_SESSIONS` error

**Test 8: Logout Cleanup** ✅
- [ ] Start session → logout
- [ ] Verify island dismisses
- [ ] Re-login as different user → verify no stale islands

**Test 9: Unsupported Device** ✅
- [ ] Run on iPhone 13 or simulator without Dynamic Island
- [ ] Verify app works normally (no crashes)
- [ ] Check logs for "Module not available" message
- [ ] Verify no analytics errors

**Test 10: Feature Flag** ✅
- [ ] Set `EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=false`
- [ ] Rebuild app
- [ ] Start session → verify island does NOT appear
- [ ] Session still works normally in app

**Test 11: Single-Word Client Name** ✅
- [ ] Create client named "Pluto"
- [ ] Start session → verify initials show "PP"

**Test 12: Analytics** ✅
- [ ] Enable PostHog dry-run mode
- [ ] Perform all actions → verify events logged:
  - `dynamic_island_started` (with session_id, client_id, start_time)
  - `dynamic_island_stop_pressed` (with session_id)
  - `dynamic_island_synced_on_launch` (with session_id, client_id)
  - `dynamic_island_failed` (on errors)

---

## Phase B: Live Activities (Lock Screen)

**Timeline**: 2-3 days
**Goal**: Extend to lock screen banner with same functionality

### B1. Feature Flag Setup

**File**: `ios-app/.env.development`

```bash
EXPO_PUBLIC_LIVE_ACTIVITY_ENABLED=true
```

**File**: `ios-app/.env.production`

```bash
EXPO_PUBLIC_LIVE_ACTIVITY_ENABLED=false
```

---

### B2. Lock Screen Layout (Already Implemented)

The `LockScreenLiveActivityView` is already created in `TrackPayTimerLiveActivity.swift` (A1 Task 1.4).

No additional changes needed - ActivityKit automatically displays lock screen banner when activity is active.

---

### B3. Testing

**Test 1: Lock Screen Display** ✅
- [ ] Start session → lock device
- [ ] Verify banner appears on lock screen
- [ ] Shows client name, "Session in progress", timer (system format)
- [ ] Timer updates automatically

**Test 2: Lock Screen Tap** ✅
- [ ] Swipe banner → unlocks and opens app to SessionTracking screen

**Test 3: Lock Screen Persistence** ✅
- [ ] Start session → lock device → wait 10 minutes
- [ ] Unlock → verify banner still shows correct elapsed time

---

## Phase C: Future Enhancements

**Not in scope for initial release:**

1. **Pause/Resume Sessions**
   - Add pause button in expanded island
   - Track pause timestamps in Supabase
   - Resume timer from paused state

2. **Multi-Client Support**
   - Allow multiple concurrent sessions
   - Island shows aggregated timer ("3 active")
   - Tap opens picker

3. **Remote Push Updates**
   - ActivityKit push token registration
   - Update island from backend (e.g., client confirms payment)

4. **Haptic Feedback**
   - Haptics when stop button pressed

5. **Billing Display**
   - Show hourly rate in expanded view
   - Real-time earnings counter

---

## Technical Reference

### Native Bridge API

```typescript
// DynamicIslandBridge.ts

isDynamicIslandSupported(): boolean
  // Returns true if iOS 16.1+ and ActivityKit available

isDynamicIslandEnabled(): boolean
  // Returns true if EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=true

startDynamicIslandActivity(
  sessionId: string,
  clientId: string,
  clientName: string,
  startTime: Date
): Promise<boolean>
  // Creates Dynamic Island activity
  // Returns true on success, false on failure (logs to PostHog)

endDynamicIslandActivity(sessionId: string): Promise<boolean>
  // Dismisses Dynamic Island activity

getActiveActivities(): Promise<Array<{
  sessionId: string,
  clientId: string,
  clientName: string,
  startTime: Date
}>>
  // Returns all active ActivityKit activities
```

---

### Analytics Events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `dynamic_island_started` | `session_id`, `client_id`, `start_time` | Activity created |
| `dynamic_island_stop_pressed` | `session_id` | Stop button tapped |
| `dynamic_island_failed` | `session_id`, `client_id`, `error_code`, `error_message`, `operation` | Error occurred |
| `dynamic_island_synced_on_launch` | `session_id`, `client_id` | App relaunched with active activity |

---

## Rollout Strategy

### Week 1: Development
- Feature flag: `EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED=true` in dev
- Test on simulator + physical iPhone 14 Pro
- Iterate on layouts and UX

### Week 2: Internal TestFlight
- Build with flag enabled
- Team testing (5-10 people)
- Monitor PostHog for errors

### Week 3: Beta TestFlight
- Expand to beta testers (20-50 providers)
- Feature flag still OFF in production build
- Collect feedback

### Week 4: Production Rollout
- Enable flag in production: 10% → 50% → 100%
- Monitor error rates
- Rollback plan: Set flag to false if critical issues

---

## Success Metrics

**Adoption**:
- % of sessions started with Dynamic Island active
- % of sessions stopped via island vs in-app

**Reliability**:
- Error rate on `dynamic_island_started` (target: <1%)
- Stale activity cleanup rate

---

## Dependencies

### iOS Requirements
- iOS 16.1+ (ActivityKit)
- iPhone 14 Pro/Pro Max/15 Pro/Pro Max (Dynamic Island hardware)

### Development Tools
- Xcode 14+
- Swift 5.5+
- EAS Build (custom native code)

### Backend
- No changes required (uses existing session schema)

---

## Files Created / Modified

### New Files (Phase A)

**Config Plugin**:
- `ios-app/plugins/withActivityKit.js`

**Swift (Native)**:
- `ios-app/ios/TrackPay/TrackPayActivityKitModule.swift`
- `ios-app/ios/TrackPay/TrackPayActivityKitModule.m`
- `ios-app/ios/TrackPayTimerWidget/TrackPayTimerActivityAttributes.swift`
- `ios-app/ios/TrackPayTimerWidget/TrackPayTimerLiveActivity.swift`
- `ios-app/ios/TrackPayTimerWidget/StopSessionIntent.swift`

**TypeScript**:
- `ios-app/src/services/native/DynamicIslandBridge.ts`

### Modified Files (Phase A)

- `ios-app/app.json` (add config plugin)
- `ios-app/App.tsx` (deep linking, state sync)
- `ios-app/src/screens/StyledSessionTrackingScreen.tsx` (start/stop integration)
- `ios-app/src/screens/ClientListScreen.tsx` (start/stop integration)
- `ios-app/src/contexts/AuthContext.tsx` (logout cleanup)
- `ios-app/src/services/analytics/events.ts` (new event schemas)
- `ios-app/.env.development` (feature flag)
- `ios-app/.env.production` (feature flag)
- `ios-app/.env.sample` (feature flag docs)

---

## Open Questions & Decisions Log

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| 2025-10-29 | Single vs multi-session constraint? | One per provider | Frontend assumes this; backend will enforce later |
| 2025-10-29 | Config plugin or managed library? | Config plugin + custom Swift | No reliable managed library |
| 2025-10-29 | Background timer updates? | Text.Timer (automatic) | Battery efficient, no JS |
| 2025-10-29 | Client initials format? | First+Last ("JD") or repeat ("PP") | Space constraint in compact |
| 2025-10-29 | Stop confirmation? | No confirmation | Match in-app UX |
| 2025-10-29 | Error handling? | Silent + PostHog | Most devices will support |
| 2025-10-29 | Time format? | System format (Text.Timer) | Battery efficiency over format control |

---

**END OF IMPLEMENTATION PLAN**
