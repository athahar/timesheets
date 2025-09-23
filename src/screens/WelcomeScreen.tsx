import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Button } from '../components/Button';
import { StickyCTA } from '../components/StickyCTA';

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const uspFeatures = [
    {
      icon: 'clock' as const,
      title: 'Time Tracking',
      subtitle: 'Start and stop sessions with precision timing'
    },
    {
      icon: 'credit-card' as const,
      title: 'Payment Requests',
      subtitle: 'Request payment and get notified when clients confirm'
    },
    {
      icon: 'user-plus' as const,
      title: 'Invite Your Clients',
      subtitle: 'Share a workspace where they see hours and requests'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.wordmark}>TrackPay</Text>
            <Text style={styles.headline}>
              Track hours. Request payment. Get paid faster.
            </Text>
            <Text style={styles.subhead}>
              Made for house cleaners, babysitters, tutors, and other local services.
            </Text>
          </View>

          {/* USP Rows */}
          <View style={styles.uspSection}>
            {uspFeatures.map((feature, index) => (
              <View key={index} style={styles.uspRow}>
                <View style={styles.iconContainer}>
                  <Feather name={feature.icon} size={28} color={theme.color.text} />
                </View>
                <View style={styles.uspContent}>
                  <Text style={styles.uspTitle}>{feature.title}</Text>
                  <Text style={styles.uspSubtitle}>{feature.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Link CTA */}
          <View style={styles.linkSection}>
            <Button
              title="Have an invite code?"
              onPress={() => navigation.navigate('InviteClaim')}
              variant="link"
              size="md"
              style={styles.linkCta}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom CTAs */}
      <StickyCTA
        primaryButton={{
          title: "Create Account",
          onPress: () => navigation.navigate('Register'),
        }}
        secondaryButton={{
          title: "Sign In",
          onPress: () => navigation.navigate('Login'),
        }}
        backgroundColor={theme.color.appBg}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
    justifyContent: 'center',
  },

  // Header Section
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: 16,
    textAlign: 'center',
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
  },
  subhead: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  // USP Section
  uspSection: {
    marginBottom: 32,
  },
  uspRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 16,
    marginBottom: 12,
    height: 72,
  },
  iconContainer: {
    marginRight: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uspContent: {
    flex: 1,
  },
  uspTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  uspSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 16,
  },

  // Link Section
  linkSection: {
    paddingTop: 16,
    alignItems: 'center',
  },
  linkCta: {
    alignSelf: 'center',
  },
});