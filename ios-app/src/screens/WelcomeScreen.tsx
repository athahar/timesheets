import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Button } from '../components/Button';
import { StickyCTA } from '../components/StickyCTA';
// TEMP: Use simple i18n while debugging
import { simpleT, getCurrentLanguageSimple, changeLanguageSimple, isSpanishSimple } from '../i18n/simple';
// Analytics (Tier-1)
import { capture, E_T1 } from '../services/analytics';

// App display name from env
const APP_DISPLAY_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  // State for reactive language switching
  const [currentLang, setCurrentLang] = useState(getCurrentLanguageSimple());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Translation function
  const t = simpleT;

  // Handle language change with state update for reactivity
  const handleLanguageChange = async (language: string) => {
    const fromLang = currentLang;
    await changeLanguageSimple(language);
    setCurrentLang(language); // Force re-render

    // Analytics: Track language change (Tier-1)
    try {
      capture(E_T1.ACTION_LANGUAGE_CHANGED, {
        from_lang: fromLang as 'en-US' | 'es-US',
        to_lang: language as 'en-US' | 'es-US',
        source: 'landing',
      });
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
    }
  };

  // Navigation handlers with Tier-1 analytics
  const handleSignIn = () => {
    try {
      capture(E_T1.ACTION_LOGIN_CTA_CLICKED, { placement: 'footer' });
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
    }
    navigation.navigate('Login');
  };

  const handleCreateAccount = () => {
    try {
      capture(E_T1.ACTION_SIGNUP_CTA_CLICKED, { placement: 'footer' });
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
    }
    navigation.navigate('Register');
  };

  const handleInviteLink = () => {
    try {
      capture(E_T1.ACTION_INVITE_CLAIM_CTA_CLICKED, { placement: 'hero' });
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
    }
    navigation.navigate('InviteClaim');
  };

  useEffect(() => {
    // Animation
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

    // Analytics: Track landing page view (Tier-1)
    try {
      capture(E_T1.SCREEN_VIEW_LANDING, {
        previous_screen: null, // Entry point
      });
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
    }
  }, [fadeAnim, slideAnim]);

  const uspFeatures = [
    {
      icon: 'clock' as const,
      titleKey: 'usp.timeTracking.title',
      subtitleKey: 'usp.timeTracking.subtitle'
    },
    {
      icon: 'credit-card' as const,
      titleKey: 'usp.paymentRequests.title',
      subtitleKey: 'usp.paymentRequests.subtitle'
    },
    {
      icon: 'user-plus' as const,
      titleKey: 'usp.inviteClients.title',
      subtitleKey: 'usp.inviteClients.subtitle'
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
          {/* Top Bar with Logo and Language Selector */}
          <View style={styles.topBar}>
            <Text style={styles.wordmark}>{APP_DISPLAY_NAME}</Text>

            {/* Compact Language Picker */}
            <View style={styles.languagePicker}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLang === 'en-US' && styles.languageButtonActive
                ]}
                onPress={() => handleLanguageChange('en-US')}
                accessibilityRole="button"
                accessibilityLabel={t('lang.english')}
              >
                <Text style={[
                  styles.languageButtonText,
                  currentLang === 'en-US' && styles.languageButtonTextActive
                ]}>
                  {t('lang.english')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLang === 'es-US' && styles.languageButtonActive
                ]}
                onPress={() => handleLanguageChange('es-US')}
                accessibilityRole="button"
                accessibilityLabel={t('lang.spanish')}
              >
                <Text style={[
                  styles.languageButtonText,
                  currentLang === 'es-US' && styles.languageButtonTextActive
                ]}>
                  {t('lang.spanish')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Header Content */}
          <View style={styles.header}>
            <Text style={styles.headline}>
              {t('welcome.title')}
            </Text>
            <Text style={styles.subhead}>
              {t('welcome.subtitle')}
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
                  <Text style={styles.uspTitle}>{t(feature.titleKey)}</Text>
                  <Text style={styles.uspSubtitle}>{t(feature.subtitleKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Link CTA */}
          <View style={styles.linkSection}>
            <Button
              title={t('welcome.invite')}
              onPress={handleInviteLink}
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
          title: t('welcome.signin'),
          onPress: handleSignIn,
        }}
        secondaryButton={{
          title: t('welcome.create'),
          onPress: handleCreateAccount,
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

  // Top Bar Section
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.display,
  },

  // Compact Language Picker Section
  languagePicker: {
    flexDirection: 'row',
    backgroundColor: theme.color.cardBg,
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.color.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 60,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: theme.color.brand,
    shadowColor: theme.color.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },

  // Header Content Section
  header: {
    alignItems: 'center',
    marginBottom: 32,
    minHeight: 120, // Fixed minimum height to prevent jumps
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
    minHeight: 64, // Fixed height for 2 lines maximum
  },
  subhead: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    minHeight: 44, // Fixed height for 2 lines
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