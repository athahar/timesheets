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
