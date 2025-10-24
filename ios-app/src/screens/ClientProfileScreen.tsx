import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Clipboard,
  Platform,
  Appearance,
  ActionSheetIOS,
  Share,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { TPButton } from '../components/v2/TPButton';
import { TPAvatar } from '../components/v2/TPAvatar';
import { IOSHeader } from '../components/IOSHeader';
import { TP } from '../styles/themeV2';
import { getClientById, updateClient, directSupabase, deleteClientRelationshipSafely, canDeleteClient } from '../services/storageService';
import { generateInviteLink } from '../utils/inviteCodeGenerator';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { simpleT } from '../i18n/simple';

// App display name from env
const APP_DISPLAY_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

// Helper function to format names in proper sentence case
const formatName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface ClientProfileScreenProps {
  route: {
    params: {
      clientId: string;
    };
  };
  navigation: any;
}

export const ClientProfileScreen: React.FC<ClientProfileScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId } = route.params;
  const { userProfile } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastFetchedRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false); // Debounce guard for loadData
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedRate, setEditedRate] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Network detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const loadData = useCallback(async (silent = false) => {
    // Debounce guard: prevent concurrent calls
    if (loadingRef.current) {
      if (__DEV__) console.log('🚫 loadData: already loading, skipping duplicate call');
      return;
    }

    loadingRef.current = true;
    try {
      if (!silent) setLoading(true);

      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert(simpleT('common.error'), simpleT('clientProfile.clientNotFound'));
        navigation.goBack();
        return;
      }
      setClient(clientData);
      setEditedName(clientData.name);
      setEditedEmail(clientData.email || '');
      setEditedRate(clientData.hourlyRate.toString());

      // Load invite code for unclaimed clients
      if (clientData.claimedStatus === 'unclaimed') {
        try {
          const invites = await directSupabase.getInvites();
          const clientInvite = invites.find(invite =>
            invite.clientId === clientId && invite.status === 'pending'
          );
          if (clientInvite) {
            setInviteCode(clientInvite.inviteCode);
          }
        } catch (error) {
          if (__DEV__) console.error('Error loading invite code:', error);
        }
      }

      lastFetchedRef.current = Date.now();
    } catch (error) {
      if (__DEV__) console.error('Error loading client:', error);
      Alert.alert(simpleT('common.error'), simpleT('clientProfile.errorLoadData'));
    } finally {
      if (!silent) {
        setLoading(false);
        setInitialLoad(false);
      }
      loadingRef.current = false; // Reset debounce guard
    }
  }, [clientId, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (initialLoad) {
        // First load - show spinner
        loadData(false);
      } else {
        // Stale-time pattern: only refetch if >30s old
        const STALE_MS = 30_000;
        if (Date.now() - lastFetchedRef.current > STALE_MS) {
          loadData(true); // Silent refetch
        }
      }
    }, [initialLoad, loadData])
  );

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!client) return;

    // Validate email if provided
    if (editedEmail.trim() && !isValidEmail(editedEmail.trim())) {
      Alert.alert(simpleT('clientProfile.invalidEmail'), simpleT('clientProfile.invalidEmailMessage'));
      return;
    }

    const rate = parseFloat(editedRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(simpleT('clientProfile.invalidRate'), simpleT('clientProfile.invalidRateMessage'));
      return;
    }

    try {
      await updateClient(clientId, editedName.trim(), rate, editedEmail.trim() || undefined);
      const updatedClient = {
        ...client,
        name: editedName.trim(),
        email: editedEmail.trim() || undefined,
        hourlyRate: rate
      };
      setClient(updatedClient);
      setEditing(false);
      Alert.alert(simpleT('common.success'), simpleT('clientProfile.successUpdated'));
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert(simpleT('common.error'), simpleT('clientProfile.errorUpdateFailed'));
    }
  };

  const handleCancel = () => {
    if (!client) return;
    setEditedName(client.name);
    setEditedEmail(client.email || '');
    setEditedRate(client.hourlyRate.toString());
    setEditing(false);
  };

  const handleShareInvite = async () => {
    if (!inviteCode) return;

    try {
      const link = generateInviteLink(inviteCode, false);
      const message = `You've been invited to join ${APP_DISPLAY_NAME}!\n\nInvite Code: ${inviteCode}\n\nOr use this link: ${link}`;

      await Share.share({
        message,
        title: `${APP_DISPLAY_NAME} Invite`,
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
    }
  };

  const handleDeletePress = async () => {
    if (!client || !userProfile) return;

    try {
      // Pre-flight blocker check
      const check = await canDeleteClient(client.id, userProfile.id);

      if (!check.canDelete) {
        if (check.reason === 'active_session') {
          Alert.alert(
            simpleT('clientProfile.cannotDeleteTitle'),
            simpleT('clientProfile.activeSessionMessage', { clientName: formatName(client.name) }),
            [
              { text: simpleT('common.cancel'), style: 'cancel' },
              {
                text: simpleT('clientProfile.viewSessions'),
                onPress: () => navigation.navigate('ClientHistory', { clientId: client.id })
              }
            ]
          );
        } else if (check.reason === 'unpaid_balance') {
          Alert.alert(
            simpleT('clientProfile.cannotDeleteTitle'),
            simpleT('clientProfile.unpaidBalanceMessage', { clientName: formatName(client.name), amount: formatCurrency(check.unpaidBalance || 0) }),
            [
              { text: simpleT('common.cancel'), style: 'cancel' },
              {
                text: simpleT('common.requestPayment'),
                onPress: () => navigation.navigate('ClientHistory', { clientId: client.id })
              }
            ]
          );
        } else if (check.reason === 'payment_request') {
          Alert.alert(
            simpleT('clientProfile.cannotDeleteTitle'),
            simpleT('clientProfile.paymentRequestMessage', { clientName: formatName(client.name) }),
            [{ text: 'OK', style: 'cancel' }]
          );
        }
        return;
      }

      // No blockers - show confirmation
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: simpleT('clientProfile.deleteConfirmTitle'),
            message: simpleT('clientProfile.deleteConfirmMessage', { clientName: formatName(client.name) }),
            options: [simpleT('common.delete'), simpleT('common.cancel')],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
            userInterfaceStyle: Appearance.getColorScheme() || 'light',
          },
          (buttonIndex) => {
            if (buttonIndex === 0) handleDeleteConfirm();
          }
        );
      } else {
        Alert.alert(
          simpleT('clientProfile.deleteConfirmTitle'),
          simpleT('clientProfile.deleteConfirmMessage', { clientName: formatName(client.name) }),
          [
            { text: simpleT('common.cancel'), style: 'cancel' },
            { text: simpleT('common.delete'), style: 'destructive', onPress: handleDeleteConfirm },
          ]
        );
      }
    } catch (error) {
      console.error('Delete pre-check failed:', error);
      Alert.alert('Error', 'Failed to check deletion status. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!client) return;

    // Haptics on confirm action
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      setDeleting(true);

      if (__DEV__) {
        console.log('🗑️ Attempting to delete client:', {
          clientId: client.id,
          clientName: client.name,
          userProfileId: userProfile?.id
        });
      }

      // Call RPC (returns boolean)
      const deleted = await deleteClientRelationshipSafely(client.id);

      if (__DEV__) {
        console.log('🗑️ RPC returned:', deleted);
      }

      // Success message
      const message = deleted
        ? simpleT('clientProfile.successDeleted', { clientName: formatName(client.name) })
        : simpleT('clientProfile.alreadyDeleted');

      // Wait for alert to be dismissed before navigating
      Alert.alert(simpleT('common.success'), message, [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to ClientList (not just goBack which might go to History)
            navigation.navigate('ClientList' as never);
          }
        }
      ]);

    } catch (error: any) {
      console.error('❌ Delete failed:', error);

      if (__DEV__) {
        console.log('❌ Delete attempt failed:', {
          clientId: client.id,
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          timestamp: new Date().toISOString()
        });
      }

      Alert.alert(
        simpleT('clientProfile.cannotDeleteTitle'),
        error.message || simpleT('clientProfile.errorDeleteFailed')
      );
      setDeleting(false);
    }
  };

  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Custom Header - always visible */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Feather name="arrow-left" size={24} color={TP.color.ink} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <TPAvatar name={client?.name || 'Loading'} size="sm" />
            <Text style={styles.headerName}>{client ? formatName(client.name) : 'Loading...'}</Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        {/* Spinner in content area */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{simpleT('clientProfile.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return null;
  }

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
          <TPAvatar name={client.name} size="sm" />
          <Text style={styles.headerName}>{formatName(client.name)}</Text>
        </View>

        {!editing ? (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>{simpleT('common.edit')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          {editing ? (
            <>
              {/* Edit Mode */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{simpleT('clientProfile.clientName')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder={simpleT('clientProfile.namePlaceholder')}
                  placeholderTextColor={TP.color.textSecondary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{simpleT('clientProfile.emailOptional')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedEmail}
                  onChangeText={setEditedEmail}
                  placeholder={simpleT('clientProfile.emailPlaceholder')}
                  placeholderTextColor={TP.color.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{simpleT('clientProfile.hourlyRate')}</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={editedRate}
                    onChangeText={setEditedRate}
                    placeholder={simpleT('clientProfile.ratePlaceholder')}
                    placeholderTextColor={TP.color.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.rateUnit}>/hr</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <View style={styles.actionButton}>
                  <TPButton
                    title={simpleT('common.cancel')}
                    onPress={handleCancel}
                    variant="secondary"
                    size="md"
                  />
                </View>
                <View style={styles.actionButton}>
                  <TPButton
                    title={simpleT('clientProfile.saveChanges')}
                    onPress={handleSave}
                    variant="primary"
                    size="md"
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* View Mode - Hourly Rate first, then Invite Code */}
              <View style={styles.rateSection}>
                <Text style={styles.rateLabel}>{simpleT('clientProfile.hourlyRate')}</Text>
                <Text style={styles.rateValue}>{formatCurrency(client.hourlyRate)}/hr</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  {simpleT('clientProfile.hourlyRateInfo', { clientName: formatName(client.name) })}
                </Text>
              </View>

              {/* Invite Section for Unclaimed Clients */}
              {client.claimedStatus === 'unclaimed' && inviteCode && (
                <View style={styles.inviteSection}>
                  <Text style={styles.inviteSectionTitle}>{simpleT('clientProfile.inviteCodeTitle')}</Text>
                  <Text style={styles.inviteDescription}>
                    {simpleT('clientProfile.inviteCodeDescription', { clientName: formatName(client.name) })}
                  </Text>

                  <View style={styles.inviteCodeContainer}>
                    <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                  </View>

                  <View style={styles.inviteActionsWrapper}>
                    <TPButton
                      title={simpleT('clientProfile.shareCode')}
                      onPress={handleShareInvite}
                      variant="primary"
                      size="md"
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Delete Client Section - Only shown in view mode */}
        {!editing && (
          <View style={styles.dangerZone}>
            <TPButton
              title={deleting ? simpleT('common.deleting') : simpleT('clientProfile.deleteClient')}
              onPress={handleDeletePress}
              variant="danger"
              size="md"
              disabled={deleting || !isOnline}
              accessibilityLabel={`Delete your connection with ${client.name}`}
              accessibilityHint="This action cannot be undone. Will remove this client from your list."
            />
            {!isOnline && (
              <Text style={styles.offlineWarning}>
                {simpleT('clientProfile.offlineWarning')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
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
    width: 60,
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
    flexDirection: 'column',
    alignItems: 'center',
    gap: TP.spacing.x8,
  },
  headerName: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x24,
    paddingTop: TP.spacing.x12,
    paddingBottom: TP.spacing.x32,
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
    fontSize: TP.font.title,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  editButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: 17,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: TP.spacing.x24,
    paddingBottom: TP.spacing.x32 + TP.spacing.x16,
  },
  profileCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x32,
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: TP.spacing.x32,
  },
  clientName: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x8,
  },
  clientRole: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
  },
  clientEmail: {
    fontSize: TP.font.footnote,
    color: TP.color.ink,
    marginTop: TP.spacing.x8,
  },
  rateSection: {
    alignItems: 'center',
    marginBottom: TP.spacing.x24,
    paddingVertical: TP.spacing.x32,
    paddingHorizontal: TP.spacing.x24,
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.divider,
  },
  rateLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x12,
  },
  rateValue: {
    fontSize: 32,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  infoSection: {
    marginTop: TP.spacing.x24,
  },
  infoText: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: TP.spacing.x24,
  },
  fieldLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.input,
    padding: TP.spacing.x16,
    fontSize: TP.font.body,
    color: TP.color.ink,
    backgroundColor: TP.color.appBg,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.input,
    backgroundColor: TP.color.appBg,
    paddingHorizontal: TP.spacing.x16,
  },
  currencySymbol: {
    fontSize: TP.font.body,
    color: TP.color.ink,
    marginRight: TP.spacing.x8,
  },
  rateInput: {
    flex: 1,
    padding: TP.spacing.x16,
    fontSize: TP.font.body,
    color: TP.color.ink,
  },
  rateUnit: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    marginLeft: TP.spacing.x8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: TP.spacing.x16,
    marginTop: TP.spacing.x32,
  },
  actionButton: {
    flex: 1,
  },
  inviteSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderRadius: TP.radius.card,
    padding: TP.spacing.x24,
    marginBottom: TP.spacing.x32,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  inviteSectionTitle: {
    fontSize: 17,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
  },
  inviteDescription: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    lineHeight: 22,
    marginBottom: TP.spacing.x24,
  },
  inviteCodeContainer: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.input,
    padding: TP.spacing.x24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: TP.color.ink,
    borderStyle: 'dashed',
    marginBottom: TP.spacing.x24,
  },
  inviteCodeText: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    letterSpacing: 2,
    fontFamily: 'Courier New',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: TP.spacing.x16,
  },
  inviteActionsWrapper: {
    marginTop: TP.spacing.x16,
  },
  inviteActionButton: {
    flex: 1,
  },
  dangerZone: {
    marginTop: TP.spacing.x32,
  },
  deleteButton: {
    minHeight: 44, // Apple touch target minimum
  },
  offlineWarning: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    textAlign: 'center',
    marginTop: TP.spacing.x12,
  },
});