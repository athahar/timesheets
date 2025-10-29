import AppIntents
import Foundation

/// App Intent triggered when user taps "Stop Session" in Dynamic Island
@available(iOS 16.4, *)
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

        return .result(opensIntent: OpenURLIntent(url))
    }
}
