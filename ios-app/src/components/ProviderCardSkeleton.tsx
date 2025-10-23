/**
 * ProviderCardSkeleton
 *
 * Loading skeleton for provider cards in the client home screen.
 * Shows shimmer animation while data is loading to prevent layout jumps.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { TP } from '../styles/themeV2';

type Props = {
  testID?: string;
};

export default function ProviderCardSkeleton({ testID = 'providerCardSkeleton' }: Props) {
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
      {/* Row 1: Avatar + Name */}
      <View style={styles.row}>
        <Animated.View style={[styles.avatar, { opacity }]} />
        <View style={styles.textColumn}>
          <Animated.View style={[styles.textLine, styles.nameText, { opacity }]} />
          <Animated.View style={[styles.textLine, styles.roleText, { opacity }]} />
        </View>
      </View>

      {/* Row 2: Balance label */}
      <Animated.View
        style={[styles.textLine, styles.balanceLabel, { opacity, marginTop: TP.spacing.x16 }]}
      />

      {/* Row 3: Balance amount */}
      <Animated.View
        style={[styles.textLine, styles.balanceAmount, { opacity, marginTop: TP.spacing.x8 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x12,
    ...TP.shadow.card.ios,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TP.color.border,
    marginRight: TP.spacing.x12,
  },
  textColumn: {
    flex: 1,
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
  roleText: {
    height: 14,
    width: '40%',
  },
  balanceLabel: {
    height: 14,
    width: '30%',
  },
  balanceAmount: {
    height: 24,
    width: '50%',
  },
});
