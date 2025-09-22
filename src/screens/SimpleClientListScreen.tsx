import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { Button } from '../components/Button';
import { AddClientModal } from '../components/AddClientModal';
import { InviteModal } from '../components/InviteModal';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { directSupabase } from '../services/storageService';
import { supabase } from '../services/supabase';
import {
  getClients,
  getClientSummary,
  getCurrentUser,
  setCurrentUser,
  setUserRole,
  requestPayment,
  getSessionsByClient,
} from '../services/storageService';

interface ClientListScreenProps {
  navigation: any;
}

interface ClientWithSummary extends Client {
  unpaidHours: number;
  requestedHours: number;
  unpaidBalance: number;
  requestedBalance: number;
  totalUnpaidBalance: number;
  hasUnpaidSessions: boolean;
  hasRequestedSessions: boolean;
  paymentStatus: 'unpaid' | 'requested' | 'paid';
  claimedStatus?: 'claimed' | 'unclaimed'; // Inherited from Client but made explicit
}

export const SimpleClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  if (__DEV__) {
    console.log('🚀 SimpleClientListScreen: Component mounting...');
  }
  const { userProfile, signOut } = useAuth();
  if (__DEV__) {
    console.log('👤 SimpleClientListScreen: userProfile:', userProfile?.name, userProfile?.role);
  }
  const [clients, setClients] = useState<ClientWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedClientForInvite, setSelectedClientForInvite] = useState<ClientWithSummary | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const loadClients = async () => {
    if (__DEV__) {
      console.log('🔄 ClientList: loadClients function called!');
    }
    if (__DEV__) {
      console.log('🔄 ClientList: Starting to load clients...');
    }
    if (__DEV__) {
      console.log('🔄 ClientList: userProfile:', userProfile);
    }
    try {
      // For authenticated users, only load their own clients
      // For now, show empty list until we implement user-specific storage
      let clientsData: Client[] = [];
      let user = '';

      if (userProfile) {
        // Authenticated user - load clients based on relationships
        user = userProfile.name;
        if (__DEV__) {
          console.log('📊 Auth user - loading relationship-based clients for:', user);
        }

        try {
          // Get client IDs that have relationships with this provider
          const { data: relationships, error: relError } = await supabase
            .from('trackpay_relationships')
            .select('client_id')
            .eq('provider_id', userProfile.id);

          if (relError) {
            console.error('❌ Error loading relationships:', relError);
            clientsData = [];
          } else if (relationships && relationships.length > 0) {
            console.log('📊 Found', relationships.length, 'relationships');

            // Get client details for each relationship
            const clientIds = relationships.map(rel => rel.client_id);
            const { data: relatedClients, error: clientError } = await supabase
              .from('trackpay_users')
              .select('*')
              .in('id', clientIds)
              .eq('role', 'client');

            if (clientError) {
              console.error('❌ Error loading related clients:', clientError);
              clientsData = [];
            } else {
              // Convert Supabase format to Client format
              clientsData = (relatedClients || []).map(client => ({
                id: client.id,
                name: client.name,
                email: client.email,
                hourlyRate: client.hourly_rate || 0,
                claimedStatus: client.claimed_status || 'claimed' // Default to claimed for existing clients
              }));
              if (__DEV__) {
                console.log('✅ Loaded', clientsData.length, 'related clients');
              }
            }
          } else {
            if (__DEV__) {
              console.log('📊 No relationships found - empty client list');
            }
            clientsData = [];
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          clientsData = [];
        }
      } else {
        // Fallback for non-auth users (development mode)
        const [allClientsData, currentUser] = await Promise.all([
          getClients(),
          getCurrentUser()
        ]);
        clientsData = allClientsData;
        user = currentUser;
        if (__DEV__) {
          console.log('📊 Non-auth user - loading from localStorage:', clientsData.length, 'clients');
        }
      }

      if (__DEV__) {

        console.log('💰 ClientList: Loading client summaries for', clientsData.length, 'clients...');

      }

      // Load summaries with timeout to prevent hanging
      const clientsWithSummary = await Promise.allSettled(
        clientsData.map(async (client) => {
          try {
            const summary = await Promise.race([
              getClientSummary(client.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Summary timeout')), 2000)
              )
            ]);
            return {
              ...client,
              unpaidHours: summary.unpaidHours,
              requestedHours: summary.requestedHours,
              unpaidBalance: summary.unpaidBalance,
              requestedBalance: summary.requestedBalance,
              totalUnpaidBalance: summary.totalUnpaidBalance,
              hasUnpaidSessions: summary.hasUnpaidSessions,
              hasRequestedSessions: summary.hasRequestedSessions,
              paymentStatus: summary.paymentStatus,
            };
          } catch (error) {
            if (__DEV__) {
              console.warn('⚠️ Failed to load summary for client:', client.name, error.message);
            }
            // Return client with default summary
            return {
              ...client,
              unpaidHours: 0,
              requestedHours: 0,
              unpaidBalance: 0,
              requestedBalance: 0,
              totalUnpaidBalance: 0,
              hasUnpaidSessions: false,
              hasRequestedSessions: false,
              paymentStatus: 'paid' as const,
            };
          }
        })
      );

      // Filter successful results
      const successfulClients = clientsWithSummary
        .filter((result): result is PromiseFulfilledResult<ClientWithSummary> =>
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      // Sort alphabetically to ensure stable ordering
      const sortedClients = successfulClients.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
      const userName = userProfile?.name || user || 'Provider';
      setCurrentUser(userName);

      // Set user role and current user in storage for backward compatibility
      if (userProfile) {
        await setCurrentUser(userName);
        await setUserRole(userProfile.role);
      }

      console.log('📊 SimpleClientListScreen: Loaded', sortedClients.length, 'clients:', sortedClients.map(c => ({ id: c.id, name: c.name })));
      if (__DEV__) {
        console.log('👤 Current user set to:', userName, 'with role:', userProfile?.role);
      }
      if (__DEV__) {
        console.log('✅ ClientList: Loading complete!');
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) {
        console.log('🎯 SimpleClientListScreen: useFocusEffect triggered');
      }
      if (__DEV__) {
        console.log('🔧 SimpleClientListScreen: userProfile available:', !!userProfile);
      }

      // Only load clients if we have a userProfile
      if (userProfile) {
        console.log('🔧 SimpleClientListScreen: About to call loadClients...');
        loadClients();
      } else {
        if (__DEV__) {
          console.log('⏳ SimpleClientListScreen: Waiting for userProfile...');
        }
        setLoading(false); // Stop loading state if no profile yet
      }
    }, [userProfile])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleClientPress = (client: Client) => {
    if (__DEV__) {
      console.log('🎯 SimpleClientListScreen: Client pressed:', client.name, 'ID:', client.id);
    }
    if (__DEV__) {
      console.log('🧭 Navigating to ClientHistory with clientId:', client.id);
    }
    navigation.navigate('ClientHistory', { clientId: client.id });
  };

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  const handleClientAdded = () => {
    // Refresh the client list when a new client is added
    loadClients();
  };

  const handleShowInvite = async (client: ClientWithSummary) => {
    try {
      // Load the invite code for this client
      const invites = await directSupabase.getInvites();
      const clientInvite = invites.find(invite =>
        invite.clientId === client.id && invite.status === 'pending'
      );

      if (clientInvite) {
        setSelectedClientForInvite(client);
        setInviteCode(clientInvite.inviteCode);
        setShowInviteModal(true);
      } else {
        Alert.alert('Error', 'No invite code found for this client');
      }
    } catch (error) {
      console.error('Error loading invite:', error);
      Alert.alert('Error', 'Failed to load invite code');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };


  const handleRequestPayment = async (client: ClientWithSummary) => {
    try {
      const sessions = await getSessionsByClient(client.id);
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert('No Unpaid Sessions', 'There are no unpaid sessions for this client.');
        return;
      }

      await requestPayment(client.id, unpaidSessions.map(s => s.id));
      Alert.alert('Payment Requested', `Payment request for $${client.unpaidBalance.toFixed(2)} has been sent to ${client.name}.`);
      loadClients(); // Refresh data
      setShowPaymentConfirm(null);
    } catch (error) {
      console.error('Error requesting payment:', error);
      Alert.alert('Error', 'Failed to request payment');
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}hr ${m}min`;
  };

  const renderClientCard = ({ item }: { item: ClientWithSummary }) => (
    <TouchableOpacity
      onPress={() => handleClientPress(item)}
      style={[styles.clientCard, theme.shadows.card]}
      activeOpacity={0.8}
    >
      <View style={styles.clientHeader}>
        {/* Left Side: Client Info */}
        <View style={styles.clientInfo}>
          <View style={styles.clientNameRow}>
            <Text style={styles.clientName}>{item.name}</Text>
            {item.claimedStatus === 'unclaimed' && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleShowInvite(item);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.clientRate}>${item.hourlyRate}/hour</Text>
        </View>

        {/* Right Side: Balance Info & Actions */}
        <View style={styles.balanceSection}>
          {item.totalUnpaidBalance > 0 ? (
            <>
              <Text style={styles.balanceDue}>
                Balance due: ${item.totalUnpaidBalance.toFixed(0)}
              </Text>

              {/* Status-specific hours display */}
              {item.hasUnpaidSessions && item.hasRequestedSessions ? (
                <Text style={styles.unpaidHoursInline}>
                  [{formatHours(item.unpaidHours)} unpaid, {formatHours(item.requestedHours)} requested]
                </Text>
              ) : item.hasUnpaidSessions ? (
                <Text style={styles.unpaidHoursInline}>
                  [{formatHours(item.unpaidHours)} unpaid]
                </Text>
              ) : item.hasRequestedSessions ? (
                <Text style={styles.requestedHoursInline}>
                  [{formatHours(item.requestedHours)} requested]
                </Text>
              ) : null}

              {/* Status-aware action button */}
              {item.paymentStatus === 'unpaid' ? (
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowPaymentConfirm(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.requestButtonText}>Request Payment</Text>
                </TouchableOpacity>
              ) : item.paymentStatus === 'requested' ? (
                <TouchableOpacity
                  style={styles.requestedButton}
                  disabled={true}
                >
                  <Text style={styles.requestedButtonText}>Payment Requested</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.paidUp}>Paid up</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalUnpaid = clients.reduce((sum, client) => sum + client.totalUnpaidBalance, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{currentUser}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <FlatList
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        style={styles.scrollContainer}
        ListHeaderComponent={
          <View>
            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Clients</Text>

              {totalUnpaid > 0 && (
                <View style={styles.outstandingCard}>
                  <Text style={styles.outstandingLabel}>Total Outstanding</Text>
                  <Text style={styles.outstandingAmount}>
                    ${totalUnpaid.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Add New Client Button */}
            <View style={styles.addButtonContainer}>
              <Button
                title="Add New Client"
                onPress={handleAddClient}
                variant="primary"
                size="lg"
                style={styles.addButton}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first client to start tracking time
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Client Modal */}
      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Invite Modal */}
      {selectedClientForInvite && inviteCode && (
        <InviteModal
          visible={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedClientForInvite(null);
            setInviteCode(null);
          }}
          clientName={selectedClientForInvite.name}
          inviteCode={inviteCode}
        />
      )}

      {/* Payment Confirmation Dialog */}
      {showPaymentConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Request Payment</Text>
            <Text style={styles.confirmMessage}>
              {(() => {
                const client = clients.find(c => c.id === showPaymentConfirm);
                return client ?
                  `Request $${client.unpaidBalance.toFixed(2)} payment from ${client.name}?` :
                  'Request payment?';
              })()}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentConfirm(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  const client = clients.find(c => c.id === showPaymentConfirm);
                  if (client) handleRequestPayment(client);
                }}
              >
                <Text style={styles.confirmButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  userName: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  logoutButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  logoutText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.display,
  },
  outstandingCard: {
    backgroundColor: theme.colors.status.unpaid.background,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  outstandingLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.primary,
  },
  outstandingAmount: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    flexGrow: 1,
  },
  clientCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  clientName: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statusBadge: {
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.caption,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  inviteButtonText: {
    fontSize: theme.fontSize.caption,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    textDecorationLine: 'underline',
  },
  clientRate: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  balanceSection: {
    alignItems: 'flex-end',
    flex: 1,
  },
  balanceDue: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  unpaidHoursInline: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  requestedHoursInline: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  requestButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.button,
  },
  requestButtonText: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.primary,
  },
  requestedButton: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  requestedButtonText: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  paidUp: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Remove unused styles
  unpaidHoursContainer: {
    display: 'none', // Keep for compatibility but hide
  },
  unpaidHoursText: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    margin: theme.spacing.lg,
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  addButtonContainer: {
    paddingBottom: theme.spacing.lg,
  },
  addButton: {
    width: '100%',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmDialog: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    margin: theme.spacing.lg,
    maxWidth: 350,
    width: '90%',
    ...theme.shadows.card,
  },
  confirmTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  confirmMessage: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.primary,
  },
});