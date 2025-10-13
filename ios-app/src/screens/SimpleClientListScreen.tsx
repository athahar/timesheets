import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Feather } from '@expo/vector-icons';
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
  getActiveSession,
  getClientMoneyState,
} from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { formatCurrency } from '../utils/formatters';

// PERFORMANCE: Memoized ClientCard component to prevent unnecessary re-renders
const ClientCard = React.memo<{
  client: ClientWithSummary;
  pillColors: any;
  onPress: (client: ClientWithSummary) => void;
  onInvite: (client: ClientWithSummary) => void;
  t: any;
}>(({ client, pillColors, onPress, onInvite, t }) => {
  const isActive = client.hasActiveSession;

  const renderStatusPill = useCallback(() => {
    let pillConfig;
    if (client.totalUnpaidBalance > 0) {
      if (client.paymentStatus === 'requested') {
        pillConfig = pillColors.requested;
      } else {
        pillConfig = pillColors.due(client.totalUnpaidBalance.toFixed(0));
      }
    } else {
      pillConfig = pillColors.paid;
    }

    return (
      <View style={[styles.pill, { backgroundColor: pillConfig.bg }]}>
        <Text style={[styles.pillText, { color: pillConfig.text }]}>
          {pillConfig.label}
        </Text>
      </View>
    );
  }, [client.totalUnpaidBalance, client.paymentStatus, pillColors]);

  const renderActiveChip = useCallback(() => {
    if (!client.hasActiveSession) return null;
    const activeConfig = pillColors.active(formatTimer(client.activeSessionTime || 0));
    return (
      <View style={[styles.pill, styles.activeMeta, { backgroundColor: activeConfig.bg }]}>
        <Text style={[styles.pillText, { color: activeConfig.text }]}>
          {activeConfig.label}
        </Text>
      </View>
    );
  }, [client.hasActiveSession, client.activeSessionTime, pillColors]);

  return (
    <TouchableOpacity
      onPress={() => onPress(client)}
      style={[styles.clientCard, isActive && styles.clientCardActive]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${client.name}, ${client.totalUnpaidBalance > 0 ? `Due $${client.totalUnpaidBalance.toFixed(0)}` : 'Paid up'}`}
    >
      <View style={styles.clientLeft}>
        <Text style={styles.clientName}>{formatName(client.name)}</Text>
        <Text style={styles.clientRate}>${client.hourlyRate}/hour</Text>
        {client.claimedStatus === 'unclaimed' && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onInvite(client);
            }}
            activeOpacity={0.7}
            style={styles.inviteButton}
          >
            <Text style={styles.inviteButtonText}>{t('clientList.invite')}</Text>
          </TouchableOpacity>
        )}
        {renderActiveChip()}
      </View>
      <View style={styles.clientRight}>
        {renderStatusPill()}
      </View>
    </TouchableOpacity>
  );
});

interface ClientListScreenProps {
  navigation: any;
}

interface ClientWithSummary extends Client {
  unpaidHours: number;
  requestedHours: number;
  unpaidBalance: number;
  requestedBalance: number;
  totalUnpaidBalance: number;
  totalHours: number;
  hasUnpaidSessions: boolean;
  hasRequestedSessions: boolean;
  paymentStatus: 'unpaid' | 'requested' | 'paid';
  claimedStatus?: 'claimed' | 'unclaimed';
  hasActiveSession?: boolean;
  activeSessionTime?: number;
}

const getPillColors = (t: typeof simpleT) => ({
  paid: { bg: theme.color.pillPaidBg, text: theme.color.pillPaidText, label: t('clientList.statusPaidUp') },
  due: (amount: string) => ({ bg: theme.color.pillDueBg, text: theme.color.pillDueText, label: t('clientList.statusDue', { amount }) }),
  requested: (amount: string) => ({ bg: theme.color.pillReqBg, text: theme.color.pillReqText, label: t('clientList.statusRequested', { amount }) }),
  active: (timer: string) => ({ bg: theme.color.pillActiveBg, text: theme.color.pillActiveText, label: t('clientList.statusActive', { timer }) }),
});

export const SimpleClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  debug('🚀 SimpleClientListScreen: Component mounting...');
  mark('clients:firstPaint');
  const { userProfile, signOut } = useAuth();
  const t = simpleT;

  // PERFORMANCE: Memoize pill colors to prevent recreation on every render
  const pillColors = useMemo(() => getPillColors(t), [t]);

  // PERFORMANCE: Memoize currency formatter
  const currencyFormatter = useCurrencyFormatter();

  debug('👤 SimpleClientListScreen: userProfile:', userProfile?.name, userProfile?.role);
  const [clients, setClients] = useState<ClientWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [selectedClientForInvite, setSelectedClientForInvite] = useState<ClientWithSummary | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // PERFORMANCE: Memoized callbacks to prevent child re-renders
  const handleClientPress = useCallback((client: ClientWithSummary) => {
    debug('🎯 SimpleClientListScreen: Client pressed:', client.name, 'ID:', client.id);
    navigation.navigate('ClientHistory', { clientId: client.id });
  }, [navigation]);

  const handleShowInvite = useCallback(async (client: ClientWithSummary) => {
    try {
      const invites = await directSupabase.getInvites();
      const clientInvite = invites.find(invite =>
        invite.clientId === client.id && invite.status === 'pending'
      );

      if (clientInvite) {
        setSelectedClientForInvite(client);
        setInviteCode(clientInvite.inviteCode);
        setShowInviteModal(true);
      } else {
        Alert.alert(t('clientList.errorTitle'), t('clientList.noInviteCode'));
      }
    } catch (error) {
      console.error('Error loading invite:', error);
      Alert.alert(t('clientList.errorTitle'), t('clientList.inviteLoadError'));
    }
  }, [t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadClients();
  }, []); // loadClients is stable and defined later

  // PERFORMANCE: Memoized FlatList callbacks and optimizations
  const keyExtractor = useCallback((item: ClientWithSummary) => item.id, []);

  const renderClient = useCallback(({ item }: { item: ClientWithSummary }) => (
    <ClientCard
      client={item}
      pillColors={pillColors}
      onPress={handleClientPress}
      onInvite={handleShowInvite}
      t={t}
    />
  ), [pillColors, handleClientPress, handleShowInvite, t]);

  // PERFORMANCE: Consistent item height for FlatList optimization
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 92, // Estimated height of ClientCard
    offset: 92 * index,
    index,
  }), []);

  const loadClients = useCallback(async () => {
    debug('🔄 ClientList: loadClients function called!');
    try {
      let clientsData: Client[] = [];
      let user = '';

      if (userProfile) {
        user = userProfile.name;
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('📊 Auth user - loading relationship-based clients for:', user);
          }
        }

        try {
          const { data: relationships, error: relError } = await supabase
            .from('trackpay_relationships')
            .select('client_id')
            .eq('provider_id', userProfile.id);

          if (relError) {
            console.error('❌ Error loading relationships:', relError);
            clientsData = [];
          } else if (relationships && relationships.length > 0) {
            if (__DEV__) { if (__DEV__) console.log('📊 Found', relationships.length, 'relationships'); }

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
              clientsData = (relatedClients || []).map(client => ({
                id: client.id,
                name: client.name,
                email: client.email,
                hourlyRate: client.hourly_rate || 0,
                claimedStatus: client.claimed_status || 'claimed'
              }));
              if (__DEV__) {
                if (__DEV__) {
                  if (__DEV__) console.log('✅ Loaded', clientsData.length, 'related clients');
                }
              }
            }
          } else {
            if (__DEV__) {
              if (__DEV__) {
                if (__DEV__) console.log('📊 No relationships found - empty client list');
              }
            }
            clientsData = [];
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          clientsData = [];
        }
      } else {
        const [allClientsData, currentUser] = await Promise.all([
          getClients(),
          getCurrentUser()
        ]);
        clientsData = allClientsData;
        user = currentUser;
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('📊 Non-auth user - loading from localStorage:', clientsData.length, 'clients');
          }
        }
      }

      debug('💰 ClientList: Loading client summaries for', clientsData.length, 'clients...');
      mark('clients:summaries');

      // PERFORMANCE: Batch all client money state queries instead of N+1
      const clientIds = clientsData.map(client => client.id);
      const moneyStates = await getClientsMoneyState(clientIds);

            return {
              ...client,
              unpaidHours: summary.unpaidHours,
              requestedHours: summary.requestedHours,
              unpaidBalance: summary.unpaidBalance,
              requestedBalance: summary.requestedBalance,
              totalUnpaidBalance: summary.totalUnpaidBalance,
              totalHours: summary.totalHours,
              hasUnpaidSessions: summary.hasUnpaidSessions,
              hasRequestedSessions: summary.hasRequestedSessions,
              paymentStatus: summary.paymentStatus,
              hasActiveSession: !!activeSession,
              activeSessionTime: activeSession ?
                (Date.now() - new Date(activeSession.startTime).getTime()) / 1000 : 0,
            };
          } catch (error) {
            if (__DEV__) {
              if (__DEV__) {
                console.warn('⚠️ Failed to load summary for client:', client.name, error.message);
              }
            }
            return {
              ...client,
              unpaidHours: 0,
              requestedHours: 0,
              unpaidBalance: 0,
              requestedBalance: 0,
              totalUnpaidBalance: 0,
              totalHours: 0,
              hasUnpaidSessions: false,
              hasRequestedSessions: false,
              paymentStatus: 'paid' as const,
              hasActiveSession: false,
              activeSessionTime: 0,
            };
          }
        })
      );

      // Merge client data with batched money states
      const clientsWithSummary = clientsData.map(client => {
        const moneyState = moneyStates.find(state => state.clientId === client.id);
        return {
          ...client,
          unpaidHours: moneyState?.unpaidHours || 0,
          requestedHours: moneyState?.requestedHours || 0,
          unpaidBalance: moneyState?.unpaidBalance || 0,
          requestedBalance: moneyState?.requestedBalance || 0,
          totalUnpaidBalance: moneyState?.totalUnpaidBalance || 0,
          hasUnpaidSessions: moneyState?.hasUnpaidSessions || false,
          hasRequestedSessions: moneyState?.hasRequestedSessions || false,
          paymentStatus: moneyState?.paymentStatus || 'paid' as const,
          hasActiveSession: moneyState?.hasActiveSession || false,
          activeSessionTime: moneyState?.activeSessionTime || 0,
        };
      });

      const sortedClients = clientsWithSummary.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
      const userName = userProfile?.name || user || 'Provider';
      setCurrentUser(userName);

      if (userProfile) {
        await setCurrentUser(userName);
        await setUserRole(userProfile.role);
      }

      debug('📊 SimpleClientListScreen: Loaded', sortedClients.length, 'clients');
      debug('👤 Current user set to:', userName, 'with role:', userProfile?.role);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🎯 SimpleClientListScreen: useFocusEffect triggered');
        }
      }
      if (userProfile) {
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('🔧 SimpleClientListScreen: About to call loadClients...');
          }
        }
        loadClients();
      } else {
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('⏳ SimpleClientListScreen: Waiting for userProfile...');
          }
        }
        setLoading(false);
      }
    }, [userProfile])
  );

  const handleAddClient = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleClientAdded = useCallback(() => {
    loadClients();
  }, []); // loadClients is stable

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(t('clientList.errorTitle'), t('clientList.logoutError'));
    }
  }, [signOut, navigation, t]);

  const renderStatusPill = (client: ClientWithSummary) => {
    if (client.totalUnpaidBalance > 0) {
      // Show amount with optional "Requested" label below
      const isRequested = client.paymentStatus === 'requested';
      return (
        <View style={[styles.pill, { backgroundColor: theme.color.pillDueBg }]}>
          <Text style={[styles.pillText, { color: theme.color.pillDueText }]}>
            Due: {formatCurrency(client.totalUnpaidBalance)}
          </Text>
          {isRequested && (
            <Text style={styles.requestedLabel}>Requested</Text>
          )}
        </View>
      );
    } else if (client.totalHours > 0) {
      // Has work history and is paid up
      return (
        <View style={[styles.pill, { backgroundColor: theme.color.pillPaidBg }]}>
          <Text style={[styles.pillText, { color: theme.color.pillPaidText }]}>
            {t('clientList.statusPaidUp')}
          </Text>
        </View>
      );
    } else {
      // Brand new client with no work history - show nothing
      return null;
    }
  };

  const renderActiveChip = (client: ClientWithSummary) => {
    if (!client.hasActiveSession) return null;

    const activeConfig = pillColors.active(formatTime(client.activeSessionTime || 0));

    return (
      <View style={[styles.pill, styles.activeMeta, { backgroundColor: activeConfig.bg }]}>
        <Text style={[styles.pillText, { color: activeConfig.text }]}>
          {activeConfig.label}
        </Text>
      </View>
    );
  };


    return (
      <TouchableOpacity
        onPress={() => handleClientPress(item)}
        style={[
          styles.clientCard,
          isActive && styles.clientCardActive
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.totalUnpaidBalance > 0 ? `Due ${formatCurrency(item.totalUnpaidBalance)}` : 'Paid up'}`}
      >
        {/* Left Side: Client Info */}
        <View style={styles.clientLeft}>
          <Text style={styles.clientName}>{formatName(item.name)}</Text>
          <Text style={styles.clientRate}>
            ${item.hourlyRate}/hour
          </Text>
          {item.claimedStatus === 'unclaimed' && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleShowInvite(item);
              }}
              activeOpacity={0.7}
              style={styles.inviteButton}
            >
              <Text style={styles.inviteButtonText}>{t('clientList.invite')}</Text>
            </TouchableOpacity>
          )}
          {renderActiveChip(item)}
        </View>

  // PERFORMANCE: Mark first paint completion when data is ready
  useEffect(() => {
    if (!loading && userProfile && clients.length >= 0) {
      stop('clients:firstPaint');
    }
  }, [loading, userProfile, clients.length]);

  if (loading || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('clientList.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <Text style={styles.userName}>{currentUser}</Text>
        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={20} color={theme.color.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddClient} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ {t('clientList.addClient')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>{t('clientList.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Total Outstanding Card - Hidden in zero state */}
        {clients.length > 0 && (
          totalUnpaid > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('clientList.totalOutstanding')}</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalUnpaid)}</Text>
            </View>
          ) : (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('clientList.totalOutstanding')}</Text>
              <View style={styles.summaryZeroRow}>
                <Text style={styles.summaryZeroAmount}>$0.00</Text>
                <Text style={styles.summaryCheckmark}>✅</Text>
              </View>
            </View>
          )
        )}

        {/* Zero State - Single card with How it works + CTA */}
        {clients.length === 0 && (
          <View style={styles.zeroStateCard}>
            <Text style={styles.sectionTitle}>{t('clientList.howItWorks')}</Text>

            <View style={styles.workflowStep}>
              <View style={styles.stepIconContainer}>
                <Text style={styles.stepIcon}>👤</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('clientList.step1.title')}</Text>
                <Text style={styles.stepDescription}>{t('clientList.step1.description')}</Text>
              </View>
            </View>

            <View style={styles.workflowStep}>
              <View style={styles.stepIconContainer}>
                <Text style={styles.stepIcon}>🕐</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('clientList.step2.title')}</Text>
                <Text style={styles.stepDescription}>{t('clientList.step2.description')}</Text>
              </View>
            </View>

            <View style={styles.workflowStep}>
              <View style={styles.stepIconContainer}>
                <Text style={styles.stepIcon}>📧</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('clientList.step3.title')}</Text>
                <Text style={styles.stepDescription}>{t('clientList.step3.description')}</Text>
              </View>
            </View>

            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>{t('clientList.cta.title')}</Text>
              <Text style={styles.ctaSubtitle}>
                {t('clientList.cta.subtitle')}
              </Text>
              <TouchableOpacity
                style={styles.ctaPrimaryButton}
                onPress={handleAddClient}
              >
                <Text style={styles.ctaPrimaryButtonText}>{t('clientList.cta.addClient')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PERFORMANCE: Optimized FlatList */}
        <FlatList
          data={clients}
          renderItem={renderClient}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
          // Performance optimizations
          initialNumToRender={8}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          getItemLayout={getItemLayout}
        />
      </View>

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

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.x16,
    paddingVertical: theme.space.x12,
    backgroundColor: theme.color.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  userName: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.x16,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  addButton: {
    height: 32,
    paddingHorizontal: theme.space.x12,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    color: theme.color.cardBg,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: theme.space.x8,
    paddingHorizontal: theme.space.x12,
  },
  logoutText: {
    fontSize: theme.font.body,
    color: theme.color.accent,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.x16,
    paddingTop: theme.space.x16,
  },
  summaryCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
    marginBottom: theme.space.x16,
  },
  summaryLabel: {
    color: theme.color.textSecondary,
    fontSize: theme.font.small,
    marginBottom: theme.space.x8,
  },
  summaryAmount: {
    fontSize: theme.font.large,
    fontWeight: '600',
    color: theme.color.accent,
  },
  summaryZeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.x8,
  },
  summaryZeroAmount: {
    fontSize: theme.font.large,
    fontWeight: '600',
    color: theme.color.text,
  },
  summaryCheckmark: {
    fontSize: 16,
  },
  clientCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
    marginBottom: theme.space.x12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientCardActive: {
    borderLeftWidth: 3,
    borderLeftColor: theme.color.accentTeal,
  },
  clientLeft: {
    flexShrink: 1,
  },
  clientRight: {
    alignItems: 'flex-end',
  },
  clientName: {
    fontSize: theme.font.body,
    color: theme.color.text,
    fontWeight: '600',
  },
  clientRate: {
    marginTop: theme.space.x2,
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
  },
  inviteButton: {
    marginTop: theme.space.x8,
    alignSelf: 'flex-start',
  },
  inviteButtonText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: theme.color.accent,
    textDecorationLine: 'underline',
  },
  pill: {
    paddingVertical: theme.space.x8,
    paddingHorizontal: theme.space.x12,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  requestedLabel: {
    fontSize: theme.font.small - 2,
    fontWeight: '400',
    color: '#9ca3af',
    marginTop: theme.space.x2,
  },
  activeMeta: {
    marginTop: theme.space.x8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.x24,
    marginTop: 80,
  },
  emptyTitle: {
    marginTop: theme.space.x12,
    fontSize: theme.font.body,
    color: theme.color.text,
    marginBottom: theme.space.x16,
  },
  emptyBtn: {
    paddingVertical: theme.space.x12,
    paddingHorizontal: theme.space.x16,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  emptyBtnText: {
    fontSize: theme.font.body,
    color: theme.color.text,
  },

  // Zero State Styles
  zeroStateCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 16,
  },
  ctaSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    marginHorizontal: 8,
  },
  ctaPrimaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: theme.color.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryButtonText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.cardBg,
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Workflow Steps
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    minHeight: 56,
  },
  stepIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepIcon: {
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 16,
  },
});