import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { Button } from '../components/Button';
import { IOSHeader } from '../components/IOSHeader';
import { theme } from '../styles/theme';
import { getClientById, updateClient, directSupabase, deleteClientRelationshipSafely, canDeleteClient } from '../services/storageService';
import { generateInviteLink } from '../utils/inviteCodeGenerator';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

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

  const loadData = async () => {
    try {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert('Error', 'Client not found');
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
          console.error('Error loading invite code:', error);
        }
      }
    } catch (error) {
      console.error('Error loading client:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [clientId])
  );

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!client) return;

    // Validate email if provided
    if (editedEmail.trim() && !isValidEmail(editedEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    const rate = parseFloat(editedRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid hourly rate');
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
      Alert.alert('Success', 'Client profile updated successfully');
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client profile');
    }
  };

  const handleCancel = () => {
    if (!client) return;
    setEditedName(client.name);
    setEditedEmail(client.email || '');
    setEditedRate(client.hourlyRate.toString());
    setEditing(false);
  };

  const handleDeletePress = async () => {
    if (!client || !userProfile) return;

    try {
      // Pre-flight blocker check
      const check = await canDeleteClient(client.id, userProfile.id);

      if (!check.canDelete) {
        if (check.reason === 'active_session') {
          Alert.alert(
            'Cannot Delete',
            `${formatName(client.name)} has an active session running. Stop the session before deleting.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'View Sessions',
                onPress: () => navigation.navigate('ClientHistory', { clientId: client.id })
              }
            ]
          );
        } else if (check.reason === 'unpaid_balance') {
          Alert.alert(
            'Cannot Delete',
            `${formatName(client.name)} has an outstanding balance of ${formatCurrency(check.unpaidBalance || 0)}. Resolve this before deleting.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Request Payment',
                onPress: () => navigation.navigate('ClientHistory', { clientId: client.id })
              }
            ]
          );
        } else if (check.reason === 'payment_request') {
          Alert.alert(
            'Cannot Delete',
            `${formatName(client.name)} has outstanding payment requests. Resolve these before deleting.`,
            [{ text: 'OK', style: 'cancel' }]
          );
        }
        return;
      }

      // No blockers - show confirmation
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Delete Client',
            message: `Remove your connection with ${formatName(client.name)}? This will not delete their account or work history.`,
            options: ['Delete', 'Cancel'],
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
          'Delete Client',
          `Remove your connection with ${formatName(client.name)}? This will not delete their account or work history.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: handleDeleteConfirm },
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
        ? `${formatName(client.name)} removed from your clients`
        : 'This client was already removed';

      // Wait for alert to be dismissed before navigating
      Alert.alert('Success', message, [
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
        'Cannot Delete',
        error.message || 'Please resolve active sessions or unpaid items before deleting.'
      );
      setDeleting(false);
    }
  };

  if (loading || !client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Client Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title="Client Profile"
        leftAction={{
          title: "Back",
          onPress: () => navigation.goBack(),
        }}
        rightAction={!editing ? {
          title: "Edit",
          onPress: () => setEditing(true),
        } : undefined}
        largeTitleStyle="always"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.profileCard, theme.shadows.card]}>
          {editing ? (
            <>
              {/* Edit Mode */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Client Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter client name"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedEmail}
                  onChangeText={setEditedEmail}
                  placeholder="client@example.com"
                  placeholderTextColor={theme.colors.text.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Hourly Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={editedRate}
                    onChangeText={setEditedRate}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.rateUnit}>/hr</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancel}
                  variant="secondary"
                  size="md"
                  style={styles.actionButton}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSave}
                  variant="primary"
                  size="md"
                  style={styles.actionButton}
                />
              </View>
            </>
          ) : (
            <>
              {/* View Mode */}
              <View style={styles.profileInfo}>
                <Text style={styles.clientName}>{formatName(client.name)}</Text>
                <Text style={styles.clientRole}>Client</Text>
                {client.email && (
                  <Text style={styles.clientEmail}>{client.email}</Text>
                )}
              </View>

              <View style={styles.rateSection}>
                <Text style={styles.rateLabel}>Hourly Rate</Text>
                <Text style={styles.rateValue}>{formatCurrency(client.hourlyRate)}/hr</Text>
              </View>

              {/* Invite Section for Unclaimed Clients */}
              {client.claimedStatus === 'unclaimed' && inviteCode && (
                <View style={styles.inviteSection}>
                  <Text style={styles.inviteSectionTitle}>Invite Code</Text>
                  <Text style={styles.inviteDescription}>
                    {formatName(client.name)} hasn't claimed their account yet. Share this invite code with them:
                  </Text>

                  <View style={styles.inviteCodeContainer}>
                    <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                  </View>

                  <View style={styles.inviteActions}>
                    <Button
                      title="Copy Code"
                      onPress={() => {
                        Clipboard.setString(inviteCode);
                        Alert.alert('Copied!', 'Invite code copied to clipboard');
                      }}
                      variant="secondary"
                      size="sm"
                      style={styles.inviteActionButton}
                    />
                    <Button
                      title="Copy Link"
                      onPress={() => {
                        const link = generateInviteLink(inviteCode, false);
                        Clipboard.setString(link);
                        Alert.alert('Copied!', 'Invite link copied to clipboard');
                      }}
                      variant="primary"
                      size="sm"
                      style={styles.inviteActionButton}
                    />
                  </View>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  This is your current hourly rate for working with {formatName(client.name)}.
                  The rate is used to calculate earnings for all work sessions.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Delete Client Section - Only shown in view mode */}
        {!editing && (
          <View style={styles.dangerZone}>
            <Button
              title={deleting ? 'Deleting...' : 'Delete Client'}
              onPress={handleDeletePress}
              variant="danger"
              size="md"
              disabled={deleting || !isOnline}
              style={styles.deleteButton}
              accessibilityLabel={`Delete your connection with ${client.name}`}
              accessibilityHint="This action cannot be undone. Will remove this client from your list."
            />
            {!isOnline && (
              <Text style={styles.offlineWarning}>
                No internet connection
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
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
  },
  editButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  profileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  clientName: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.xs,
  },
  clientRole: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  clientEmail: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: theme.spacing.xs,
  },
  rateSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.card,
  },
  rateLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  rateValue: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
  },
  infoSection: {
    marginTop: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.xs,
  },
  rateInput: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
  },
  rateUnit: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  inviteSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  inviteSectionTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  inviteDescription: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  inviteCodeContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    marginBottom: theme.spacing.lg,
  },
  inviteCodeText: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontFamily: 'Courier New',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inviteActionButton: {
    flex: 1,
  },
  dangerZone: {
    marginTop: theme.spacing.xl,
  },
  deleteButton: {
    minHeight: 44, // Apple touch target minimum
  },
  offlineWarning: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});