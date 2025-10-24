/**
 * ClientCardSkeleton
 *
 * Loading skeleton for client cards in the provider home screen.
 * Shows shimmer animation while data is loading to prevent layout jumps.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { TP } from '../styles/themeV2';

type Props = {
  testID?: string;
};

export default function ClientCardSkeleton({ testID = 'clientCardSkeleton' }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.card} testID={testID}>
      {/* Top row: Client name and action button */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <Animated.View style={[styles.textLine, styles.nameText, { opacity }]} />
          <Animated.View style={[styles.textLine, styles.hoursText, { opacity }]} />
        </View>
        <Animated.View style={[styles.actionButton, { opacity }]} />
      </View>

      {/* Bottom row: Balance info */}
      <View style={styles.bottomRow}>
        <Animated.View style={[styles.textLine, styles.balanceLabel, { opacity }]} />
        <Animated.View style={[styles.textLine, styles.balanceAmount, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x12,
    marginHorizontal: TP.spacing.x16,
    ...TP.shadow.card.ios,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TP.spacing.x12,
  },
  leftSection: {
    flex: 1,
    marginRight: TP.spacing.x12,
  },
  textLine: {
    backgroundColor: TP.color.border,
    borderRadius: 4,
  },
  nameText: {
    height: 18,
    width: '60%',
    marginBottom: TP.spacing.x8,
  },
  hoursText: {
    height: 14,
    width: '40%',
  },
  actionButton: {
    width: 80,
    height: 36,
    borderRadius: TP.radius.button,
    backgroundColor: TP.color.border,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    height: 14,
    width: '30%',
  },
  balanceAmount: {
    height: 20,
    width: '35%',
  },
});
