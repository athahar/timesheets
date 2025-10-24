/**
 * DetailPageSkeleton
 *
 * Loading skeleton for detail pages (ServiceProviderSummaryScreen, ClientHistoryScreen).
 * Shows shimmer animation for summary card and timeline items while data is loading.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { TP } from '../styles/themeV2';

type Props = {
  testID?: string;
};

export default function DetailPageSkeleton({ testID = 'detailPageSkeleton' }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  // Pulse animation (same as other skeletons)
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary/Balance Card Skeleton */}
      <View style={styles.summaryCard}>
        {/* Balance row */}
        <View style={styles.summaryRow}>
          <Animated.View style={[styles.textLine, styles.label, { opacity }]} />
        </View>
        <View style={styles.summaryRow}>
          <Animated.View style={[styles.textLine, styles.amount, { opacity }]} />
        </View>

        {/* Hours row */}
        <View style={[styles.summaryRow, styles.hoursRow]}>
          <Animated.View style={[styles.textLine, styles.hoursText, { opacity }]} />
        </View>

        {/* Button placeholder */}
        <Animated.View style={[styles.button, { opacity }]} />
      </View>

      {/* Date header placeholder */}
      <Animated.View style={[styles.textLine, styles.dateHeader, { opacity }]} />

      {/* Individual session/activity cards (not wrapped in section) */}
      <TimelineItemSkeleton opacity={opacity} />
      <TimelineItemSkeleton opacity={opacity} />
    </ScrollView>
  );
}

// Individual timeline item skeleton (session/payment card)
function TimelineItemSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.timelineCard}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <Animated.View style={[styles.textLine, styles.cardTitle, { opacity }]} />
        <Animated.View style={[styles.textLine, styles.cardAmount, { opacity }]} />
      </View>

      {/* Card details */}
      <View style={styles.cardDetails}>
        <Animated.View style={[styles.textLine, styles.detailLine, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x16,
    paddingBottom: TP.spacing.x32,
  },

  // Summary Card Styles
  summaryCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x20,
    marginBottom: TP.spacing.x32,
    ...TP.shadow.card.ios,
  },
  summaryRow: {
    marginBottom: TP.spacing.x16,
  },
  hoursRow: {
    marginBottom: TP.spacing.x20,
  },
  textLine: {
    backgroundColor: TP.color.border,
    borderRadius: 4,
  },
  label: {
    height: 16,
    width: '45%',
  },
  amount: {
    height: 36,
    width: '55%',
  },
  hoursText: {
    height: 14,
    width: '35%',
  },
  button: {
    height: 44,
    width: '100%',
    borderRadius: TP.radius.button,
    backgroundColor: TP.color.border,
  },

  // Date header placeholder (between summary and session cards)
  dateHeader: {
    height: 18,
    width: '35%',
    marginTop: TP.spacing.x24,
    marginBottom: TP.spacing.x12,
  },

  // Timeline Item Card Styles
  timelineCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.divider,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TP.spacing.x12,
  },
  cardTitle: {
    height: 16,
    width: '40%',
  },
  cardAmount: {
    height: 20,
    width: '30%',
  },
  cardDetails: {
    marginTop: TP.spacing.x4,
  },
  detailLine: {
    height: 14,
    width: '70%',
  },
});
