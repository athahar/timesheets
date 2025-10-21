import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { TP } from '../styles/themeV2';
import { TPButton } from '../components/v2/TPButton';
import { simpleT, getCurrentLanguageSimple, changeLanguageSimple } from '../i18n/simple';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { userProfile, signOut, updateProfile } = useAuth();

  // State - track both current saved values and pending edits
  const [savedLang] = useState(getCurrentLanguageSimple()); // What's currently saved
  const [pendingLang, setPendingLang] = useState(getCurrentLanguageSimple()); // What user selected
  const [editableName, setEditableName] = useState(userProfile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Translation function
  const t = simpleT;

  // Track unsaved changes (name OR language)
  useEffect(() => {
    const nameChanged = editableName.trim() !== '' && editableName !== userProfile?.name;
    const langChanged = pendingLang !== savedLang;
    setHasUnsavedChanges(nameChanged || langChanged);
  }, [editableName, userProfile?.name, pendingLang, savedLang]);

  // Handle language button tap - just update pending state, don't save yet
  const handleLanguageChange = (language: string) => {
    setPendingLang(language);
  };

  // Handle save button press - save both name and language
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsSaving(true);

      // Save name if changed
      const nameChanged = editableName.trim() !== '' && editableName !== userProfile?.name;
      if (nameChanged) {
        await updateProfile({ name: editableName.trim() });
      }

      // Save language if changed
      const langChanged = pendingLang !== savedLang;
      if (langChanged) {
        await changeLanguageSimple(pendingLang);
      }

      Alert.alert(t('common.success'), t('settings.successUpdated'));
      setHasUnsavedChanges(false);
    } catch (error) {
      if (__DEV__) console.error('Error updating settings:', error);
      Alert.alert(t('common.error'), t('settings.errorUpdateFailed'));
      // Reset to original values on error
      setEditableName(userProfile?.name || '');
      setPendingLang(savedLang);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign out with confirmation
  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signOutConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              if (__DEV__) console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Feather name="arrow-left" size={24} color={TP.color.ink} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>

          {/* Name Field */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{t('settings.name')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={editableName}
                onChangeText={setEditableName}
                placeholder={userProfile?.name || t('settings.namePlaceholder')}
                placeholderTextColor={theme.color.textSecondary}
                editable={!isSaving}
                inputAccessoryViewID={Platform.OS === 'ios' ? 'settingsDone' : undefined}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>

          {/* Email Field (Read-only) */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{t('settings.email')}</Text>
            <View style={[styles.inputContainer, styles.inputContainerReadOnly]}>
              <Text style={styles.inputReadOnly}>{userProfile?.email}</Text>
            </View>
          </View>

          {/* Language Settings Group */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{t('settings.language')}</Text>
            <Text style={styles.groupDescription}>{t('settings.languageDescription')}</Text>

            {/* Language Picker */}
            <View style={styles.languagePicker}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  pendingLang === 'en-US' && styles.languageButtonActive
                ]}
                onPress={() => handleLanguageChange('en-US')}
                accessibilityRole="button"
                accessibilityLabel={t('lang.english')}
              >
                <Text style={[
                  styles.languageButtonText,
                  pendingLang === 'en-US' && styles.languageButtonTextActive
                ]}>
                  {t('lang.english')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  pendingLang === 'es-US' && styles.languageButtonActive
                ]}
                onPress={() => handleLanguageChange('es-US')}
                accessibilityRole="button"
                accessibilityLabel={t('lang.spanish')}
              >
                <Text style={[
                  styles.languageButtonText,
                  pendingLang === 'es-US' && styles.languageButtonTextActive
                ]}>
                  {t('lang.spanish')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Save Button - Bottom Action */}
      <View style={styles.bottomAction}>
        <TPButton
          title={isSaving ? t('common.saving') : t('common.save')}
          onPress={handleSave}
          variant="primary"
          size="md"
          disabled={!hasUnsavedChanges || isSaving}
        />
      </View>

      {/* iOS Keyboard Accessory - Done Button */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="settingsDone">
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity
              onPress={Keyboard.dismiss}
              style={styles.keyboardDoneButton}
            >
              <Text style={styles.keyboardDoneText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },

  // Custom Header Styles
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.divider,
    backgroundColor: TP.color.cardBg,
  },
  headerButton: {
    width: 70,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.brand,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TP.font.title2,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: TP.spacing.x24,
  },
  content: {
    flex: 1,
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x16,
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

  // Input Styles
  inputContainer: {
    backgroundColor: theme.color.cardBg,
    borderRadius: TP.radius.input,
    borderWidth: 1,
    borderColor: TP.color.divider,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
  },
  inputContainerReadOnly: {
    backgroundColor: TP.color.appBg,
  },
  input: {
    fontSize: TP.font.body,
    color: TP.color.ink,
    minHeight: 44,
  },
  inputReadOnly: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: TP.spacing.x12,
  },

  // Bottom Action Button
  bottomAction: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x16,
    paddingBottom: TP.spacing.x16,
    backgroundColor: TP.color.appBg,
    borderTopWidth: 1,
    borderTopColor: TP.color.divider,
  },

  // Keyboard Accessory Styles
  keyboardAccessory: {
    backgroundColor: TP.color.cardBg,
    borderTopWidth: 1,
    borderTopColor: TP.color.divider,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  keyboardDoneButton: {
    paddingVertical: TP.spacing.x8,
    paddingHorizontal: TP.spacing.x16,
    minHeight: 44,
    justifyContent: 'center',
  },
  keyboardDoneText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.brand,
  },
});