import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { TP } from '../../styles/themeV2';

export interface TPHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  testID?: string;
}

/**
 * TPHeader - TrackPay v2 Standard Header Component
 *
 * Features:
 * - Centered title with balanced left/right rails
 * - Left back button (chevron-left)
 * - Optional right action slot
 * - Safe area aware
 * - Matches Settings screen header pattern
 *
 * @example
 * <TPHeader title="Create Account" onBack={() => navigation.goBack()} />
 * <TPHeader title="Settings" onBack={() => navigation.goBack()} right={<SignOutButton />} />
 */
export const TPHeader: React.FC<TPHeaderProps> = ({
  title,
  onBack,
  right,
  testID = 'tp-header',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        {/* Left: Back button */}
        <View style={styles.leftRail}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color={TP.color.ink} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center: Title */}
        <View style={styles.centerRail}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right: Optional action */}
        <View style={styles.rightRail}>{right ?? null}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TP.color.appBg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TP.spacing.x16,
  },
  leftRail: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Offset the 44px left rail so title stays centered
    marginLeft: -44,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TP.color.ink,
    textAlign: 'center',
  },
  rightRail: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
