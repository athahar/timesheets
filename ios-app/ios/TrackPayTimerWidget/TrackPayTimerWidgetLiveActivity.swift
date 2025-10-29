//
//  TrackPayTimerWidgetLiveActivity.swift
//  TrackPayTimerWidget
//
//  Created by Athahar on 10/29/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct TrackPayTimerWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct TrackPayTimerWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TrackPayTimerWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension TrackPayTimerWidgetAttributes {
    fileprivate static var preview: TrackPayTimerWidgetAttributes {
        TrackPayTimerWidgetAttributes(name: "World")
    }
}

extension TrackPayTimerWidgetAttributes.ContentState {
    fileprivate static var smiley: TrackPayTimerWidgetAttributes.ContentState {
        TrackPayTimerWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: TrackPayTimerWidgetAttributes.ContentState {
         TrackPayTimerWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: TrackPayTimerWidgetAttributes.preview) {
   TrackPayTimerWidgetLiveActivity()
} contentStates: {
    TrackPayTimerWidgetAttributes.ContentState.smiley
    TrackPayTimerWidgetAttributes.ContentState.starEyes
}
