import Foundation
import ActivityKit

/// Activity attributes for TrackPay timer Live Activity
@available(iOS 16.4, *)
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
