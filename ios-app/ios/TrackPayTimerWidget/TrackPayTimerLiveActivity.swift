import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 16.4, *)
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
@available(iOS 16.4, *)
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
