import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';
import { IOSHeader } from '../components/IOSHeader';
import { simpleT, getCurrentLanguageSimple, changeLanguageSimple } from '../i18n/simple';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // State for reactive language switching
  const [currentLang, setCurrentLang] = useState(getCurrentLanguageSimple());

  // Translation function
  const t = simpleT;

  // Handle language change with state update for reactivity
  const handleLanguageChange = async (language: string) => {
    await changeLanguageSimple(language);
    setCurrentLang(language); // Force re-render
  };

  return (
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title={t('settings.title')}
        leftAction={{
          title: t('settings.back'),
          onPress: () => navigation.goBack(),
        }}
        largeTitleStyle="always"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          {/* Language Settings Group */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{t('settings.language')}</Text>
            <Text style={styles.groupDescription}>{t('settings.languageDescription')}</Text>

            {/* Language Picker */}
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

        </View>
      </ScrollView>
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
    paddingTop: 8,
  },

  // Settings Groups
  settingsGroup: {
    marginBottom: 32,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Language Picker (reused from WelcomeScreen)
  languagePicker: {
    flexDirection: 'row',
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.color.border,
    ...theme.shadow.cardLight.ios,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44, // 44pt touch target per Apple guidelines
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: theme.color.brand,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
});