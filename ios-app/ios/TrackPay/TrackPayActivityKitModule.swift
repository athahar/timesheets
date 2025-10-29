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
        guard #available(iOS 16.4, *) else {
            rejecter("UNSUPPORTED_VERSION", "ActivityKit requires iOS 16.4+", nil)
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
        guard #available(iOS 16.4, *) else {
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
        guard #available(iOS 16.4, *) else {
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
