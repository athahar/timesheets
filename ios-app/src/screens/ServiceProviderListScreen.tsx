import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../styles/themeV2';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  getCurrentUser,
  getServiceProvidersForClient,
  getClientSummary,
  getSessionsByClient,
} from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { moneyFormat } from '../utils/money';
import { useLocale } from '../hooks/useLocale';
import { capture, E } from '../services/analytics';
import { dedupeEventOnce } from '../services/analytics/dedupe';
import { HamburgerMenu, HamburgerMenuOption } from '../components/HamburgerMenu';
import { ContactModal } from '../components/ContactModal';
import { ShareModal } from '../components/ShareModal';

interface ServiceProviderListScreenProps {
  navigation: any;
}

interface ServiceProvider {
  id: string;
  name: string;
  unpaidHours: number;
  requestedHours: number;
  unpaidBalance: number;
  requestedBalance: number;
  totalUnpaidBalance: number;
  hasUnpaidSessions: boolean;
  hasRequestedSessions: boolean;
  paymentStatus: 'unpaid' | 'requested' | 'paid';
  currency?: string;
}

export const ServiceProviderListScreen: React.FC<ServiceProviderListScreenProps> = ({ navigation }) => {
  if (__DEV__) {
    console.log('🚀 ServiceProviderListScreen: Component mounting...');
  }
  const { userProfile } = useAuth();
  const t = simpleT;
  const { locale } = useLocale();

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hamburger menu state
  const [hamburgerMenuVisible, setHamburgerMenuVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Track screen view on mount
  useEffect(() => {
    if (dedupeEventOnce('client.home.viewed')) {
      capture(E.SCREEN_VIEW_PROVIDER_LIST, {
        provider_count: serviceProviders.length,
      });
    }
  }, []);

  const loadServiceProviders = async () => {
    if (__DEV__) {
      console.log('🔄 ServiceProviderList: Starting to load providers...');
    }
    try {
      let providersData: ServiceProvider[] = [];

      if (userProfile) {
        const isClient = userProfile.role === 'client';
        const isProvider = userProfile.role === 'provider';

        if (isClient) {
          if (__DEV__) {
            console.log('📊 Auth client - loading relationship-based providers for:', userProfile.name);
          }

          try {
            const { data: relationships, error: relError } = await supabase
              .from('trackpay_relationships')
              .select('provider_id')
              .eq('client_id', userProfile.id);

            if (relError) {
              console.error('❌ Error loading relationships:', relError);
            } else if (relationships && relationships.length > 0) {
              if (__DEV__) console.log('📊 Found', relationships.length, 'provider relationships');

              const providerIds = relationships.map(rel => rel.provider_id);
              const { data: relatedProviders, error: providerError } = await supabase
                .from('trackpay_users')
                .select('*')
                .in('id', providerIds)
                .eq('role', 'provider');

              if (providerError) {
                console.error('❌ Error loading related providers:', providerError);
              } else {
                if (__DEV__) {
                  console.log('💰 ServiceProviderList: Loading provider summaries for', relatedProviders.length, 'providers...');
                }

                const allSessions = await getSessionsByClient(userProfile.id);
                if (__DEV__) {
                  console.log('📊 ServiceProviderList: Loaded', allSessions.length, 'total sessions for client');
                }

                const providersWithSummary = await Promise.allSettled(
                  (relatedProviders || []).map(async (provider) => {
                    try {
                      const sessions = allSessions.filter(s => s.providerId === provider.id);
                      if (__DEV__) {
                        console.log('📊 Provider', provider.name, 'has', sessions.length, 'sessions');
                      }

                      const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
                      const requestedSessions = sessions.filter(s => s.status === 'requested');

                      const computePersonHours = (session: any) => {
                        const baseDuration = session.duration || 0;
                        const crew = session.crewSize || 1;
                        return typeof session.personHours === 'number'
                          ? session.personHours
                          : baseDuration * crew;
                      };

                      const unpaidPersonHours = unpaidSessions.reduce((sum, s) => sum + computePersonHours(s), 0);
                      const requestedPersonHours = requestedSessions.reduce((sum, s) => sum + computePersonHours(s), 0);
                      const unpaidBalance = unpaidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
                      const requestedBalance = requestedSessions.reduce((sum, s) => sum + (s.amount || 0), 0);

                      let paymentStatus: 'unpaid' | 'requested' | 'paid' = 'paid';
                      if (unpaidSessions.length > 0) {
                        paymentStatus = 'unpaid';
                      } else if (requestedSessions.length > 0) {
                        paymentStatus = 'requested';
                      }

                      return {
                        id: provider.id,
                        name: provider.name,
                        unpaidHours: unpaidPersonHours,
                        requestedHours: requestedPersonHours,
                        unpaidBalance,
                        requestedBalance,
                        totalUnpaidBalance: unpaidBalance + requestedBalance,
                        hasUnpaidSessions: unpaidSessions.length > 0,
                        hasRequestedSessions: requestedSessions.length > 0,
                        paymentStatus,
                        currency: provider.currency || 'USD',
                      };
                    } catch (error) {
                      if (__DEV__) {
                        console.warn('⚠️ Failed to load sessions for provider:', provider.name, error.message);
                      }
                      return {
                        id: provider.id,
                        name: provider.name,
                        unpaidHours: 0,
                        requestedHours: 0,
                        unpaidBalance: 0,
                        requestedBalance: 0,
                        totalUnpaidBalance: 0,
                        hasUnpaidSessions: false,
                        hasRequestedSessions: false,
                        paymentStatus: 'paid' as const,
                        currency: provider.currency || 'USD',
                      };
                    }
                  })
                );

                providersData = providersWithSummary
                  .filter((result): result is PromiseFulfilledResult<ServiceProvider> =>
                    result.status === 'fulfilled'
                  )
                  .map(result => result.value);

                if (__DEV__) {
                  console.log('✅ Loaded', providersData.length, 'related providers with session data');
                }
              }
            } else if (__DEV__) {
              console.log('📊 No provider relationships found - empty provider list');
            }
          } catch (dbError) {
            console.error('❌ Database error:', dbError);
          }
        } else if (isProvider) {
          if (__DEV__) {
            console.log('📊 Auth provider - loading clients for:', userProfile.name);
          }

          try {
            const { data: relationships, error: relError } = await supabase
              .from('trackpay_relationships')
              .select('client_id')
              .eq('provider_id', userProfile.id);

            if (relError) {
              console.error('❌ Error loading provider relationships:', relError);
            } else if (relationships && relationships.length > 0) {
              if (__DEV__) console.log('📊 Found', relationships.length, 'client relationships');

              const clientIds = relationships.map(rel => rel.client_id);
              const { data: relatedClients, error: clientError } = await supabase
                .from('trackpay_users')
                .select('*')
                .in('id', clientIds)
                .eq('role', 'client');

              if (clientError) {
                console.error('❌ Error loading related clients:', clientError);
              } else {
                if (__DEV__) {
                  console.log('💰 ServiceProviderList: Loading client summaries for', relatedClients.length, 'clients...');
                }

                const { data: allSessions, error: sessionsError } = await supabase
                  .from('trackpay_sessions')
                  .select(`
                    id,
                    client_id,
                    provider_id,
                    duration_minutes,
                    crew_size,
                    person_hours,
                    hourly_rate,
                    amount_due,
                    status
                  `)
                  .eq('provider_id', userProfile.id);

                if (sessionsError) {
                  console.error('❌ Error loading sessions for provider:', sessionsError);
                }

                const sessions = allSessions || [];
                if (__DEV__) {
                  console.log('📊 ServiceProviderList: Loaded', sessions.length, 'total sessions for provider');
                }

                const clientsWithSummary = await Promise.allSettled(
                  (relatedClients || []).map(async (client) => {
                    try {
                      const clientSessions = sessions.filter(s => s.client_id === client.id);
                      if (__DEV__) {
                        console.log('📊 Client', client.name, 'has', clientSessions.length, 'sessions');
                      }

                      const unpaidSessions = clientSessions.filter(s => s.status === 'unpaid');
                      const requestedSessions = clientSessions.filter(s => s.status === 'requested');

                      const computePersonHours = (session: any) => {
                        const baseDuration = (session.duration_minutes || 0) / 60;
                        const crew = session.crew_size || 1;
                        return typeof session.person_hours === 'number'
                          ? session.person_hours
                          : baseDuration * crew;
                      };

                      const unpaidPersonHours = unpaidSessions.reduce((sum, s) => sum + computePersonHours(s), 0);
                      const requestedPersonHours = requestedSessions.reduce((sum, s) => sum + computePersonHours(s), 0);
                      const unpaidBalance = unpaidSessions.reduce((sum, s) => sum + (s.amount_due || 0), 0);
                      const requestedBalance = requestedSessions.reduce((sum, s) => sum + (s.amount_due || 0), 0);

                      let paymentStatus: 'unpaid' | 'requested' | 'paid' = 'paid';
                      if (unpaidSessions.length > 0) {
                        paymentStatus = 'unpaid';
                      } else if (requestedSessions.length > 0) {
                        paymentStatus = 'requested';
                      }

                      return {
                        id: client.id,
                        name: client.name,
                        unpaidHours: unpaidPersonHours,
                        requestedHours: requestedPersonHours,
                        unpaidBalance,
                        requestedBalance,
                        totalUnpaidBalance: unpaidBalance + requestedBalance,
                        hasUnpaidSessions: unpaidSessions.length > 0,
                        hasRequestedSessions: requestedSessions.length > 0,
                        paymentStatus,
                        currency: client.currency || 'USD',
                      };
                    } catch (error) {
                      if (__DEV__) {
                        console.warn('⚠️ Failed to load sessions for client:', client.name, error.message);
                      }
                      return {
                        id: client.id,
                        name: client.name,
                        unpaidHours: 0,
                        requestedHours: 0,
                        unpaidBalance: 0,
                        requestedBalance: 0,
                        totalUnpaidBalance: 0,
                        hasUnpaidSessions: false,
                        hasRequestedSessions: false,
                        paymentStatus: 'paid' as const,
                        currency: client.currency || 'USD',
                      };
                    }
                  })
                );

                providersData = clientsWithSummary
                  .filter((result): result is PromiseFulfilledResult<ServiceProvider> =>
                    result.status === 'fulfilled'
                  )
                  .map(result => result.value);

                if (__DEV__) {
                  console.log('✅ Loaded', providersData.length, 'related clients with session data');
                }
              }
            } else if (__DEV__) {
              console.log('📊 No client relationships found - empty list');
            }
          } catch (dbError) {
            console.error('❌ Database error:', dbError);
          }
        } else if (__DEV__) {
          console.log('ℹ️ User role not client/provider, skipping relationship lookup');
        }
      } else {
        // Fallback for non-auth users (development mode)
        const providers = await getServiceProvidersForClient('');
        providersData = providers;
        if (__DEV__) {
          console.log('📊 Non-auth user - loading from localStorage:', providersData.length, 'providers');
        }
      }

      setServiceProviders(providersData);

      if (__DEV__) {
        console.log('📊 ServiceProviderListScreen: Loaded', providersData.length, 'providers');
        console.log('✅ ServiceProviderList: Loading complete!');
      }
    } catch (error) {
      console.error('Error loading service providers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) {
        console.log('🎯 ServiceProviderListScreen: useFocusEffect triggered');
        console.log('🔧 ServiceProviderListScreen: userProfile available:', !!userProfile);
      }

      // Only load providers if we have a userProfile
      if (userProfile) {
        if (__DEV__) console.log('🔧 ServiceProviderListScreen: About to call loadServiceProviders...');
        loadServiceProviders();
      } else {
        if (__DEV__) {
          console.log('⏳ ServiceProviderListScreen: Waiting for userProfile...');
        }
        setLoading(false); // Stop loading state if no profile yet
      }
    }, [userProfile])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadServiceProviders();
  };

  const handleProviderPress = (provider: ServiceProvider) => {
    if (__DEV__) {
      console.log('🎯 ServiceProviderListScreen: Provider pressed:', provider.name);
    }

    // Track provider card tap with dedupe (prevent double-tap duplicates)
    if (dedupeEventOnce(E.CLIENT_PROVIDER_CARD_TAPPED)) {
      capture(E.CLIENT_PROVIDER_CARD_TAPPED, {
        provider_id: provider.id,
        provider_name: provider.name,
      });
    }

    navigation.navigate('ServiceProviderSummary', {
      providerId: provider.id,
      providerName: provider.name,
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (wholeHours === 0) {
      return `${minutes}min`;
    }
    const minutePart = minutes > 0 ? ` ${minutes}min` : '';
    return `${wholeHours}hr${minutePart}`;
  };

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => {
    const currency = item.currency || 'USD';

    return (
      <TouchableOpacity
        onPress={() => handleProviderPress(item)}
        style={styles.providerCard}
        activeOpacity={0.7}
      >
        <View style={styles.providerHeader}>
          {/* Left Side: Provider Info */}
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{item.name}</Text>
          </View>

          {/* Right Side: Balance Info */}
          <View style={styles.balanceSection}>
            {item.totalUnpaidBalance > 0 ? (
              <>
                {/* Payment request notification badge */}
                {item.hasRequestedSessions && (
                  <View style={styles.requestBadge}>
                    <Text style={styles.requestBadgeText}>{t('providerList.paymentRequested')}</Text>
                  </View>
                )}

                {/* Context-aware balance text */}
                {item.paymentStatus === 'requested' ? (
                  <Text style={styles.balanceRequested}>
                    {moneyFormat(item.totalUnpaidBalance * 100, currency, locale)}
                  </Text>
                ) : (
                  <Text style={styles.balanceDue}>
                    {moneyFormat(item.totalUnpaidBalance * 100, currency, locale)}
                  </Text>
                )}

                {/* Status-specific hours display */}
                {item.hasUnpaidSessions && item.hasRequestedSessions ? (
                  <Text style={styles.unpaidHoursInline}>
                    [{formatHours(item.unpaidHours + item.requestedHours)}]
                  </Text>
                ) : item.hasUnpaidSessions ? (
                  <Text style={styles.unpaidHoursInline}>
                    [{formatHours(item.unpaidHours)}]
                  </Text>
                ) : item.hasRequestedSessions ? (
                  <Text style={styles.requestedHoursInline}>
                    [{formatHours(item.requestedHours)}]
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.paidUp}>{t('providerList.allPaidUp')}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeletons = () => (
    <>
      <ProviderCardSkeleton />
      <ProviderCardSkeleton />
      <ProviderCardSkeleton />
    </>
  );

  // Calculate total unpaid
  // Hamburger menu handlers
  const handleHamburgerPress = () => {
    // Analytics: menu opened
    capture(E.MENU_OPENED, {
      role: 'client',
      screen: 'ServiceProviderList',
    });
    setHamburgerMenuVisible(true);
  };

  const handleMenuOptionSelected = (option: HamburgerMenuOption) => {
    if (option === 'help') {
      navigation.navigate('Help');
    } else if (option === 'contact') {
      // Analytics: modal view contact
      capture(E.MODAL_VIEW_CONTACT, {
        role: 'client',
      });
      setContactModalVisible(true);
    } else if (option === 'share') {
      // Analytics: modal view share
      capture(E.MODAL_VIEW_SHARE, {
        role: 'client',
      });
      setShareModalVisible(true);
    }
  };

  const totalUnpaid = serviceProviders.reduce((sum, provider) => sum + provider.totalUnpaidBalance, 0);
  const currency = serviceProviders.length > 0 ? serviceProviders[0].currency || 'USD' : 'USD';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar with centered TrackPay - matches provider exactly */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={handleHamburgerPress}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={styles.navIconButton}
        >
          <Feather name="menu" size={20} color={TP.color.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{simpleT('common.appName')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.navIconButton}
        >
          <Feather name="settings" size={20} color={TP.color.ink} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      {loading ? (
        <View style={styles.listContainer}>{renderSkeletons()}</View>
      ) : (
        <FlatList
          data={serviceProviders}
          renderItem={renderProviderCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          style={styles.scrollContainer}
          ListHeaderComponent={
            totalUnpaid > 0 ? (
              <View style={styles.outstandingCard}>
                <Text style={styles.outstandingLabel}>{t('providerList.totalYouOwe')}</Text>
                <Text style={styles.outstandingAmount}>
                  {moneyFormat(totalUnpaid * 100, currency, locale)}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t('clientList.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('clientList.emptySubtitle')}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={hamburgerMenuVisible}
        onClose={() => setHamburgerMenuVisible(false)}
        onSelectOption={handleMenuOptionSelected}
        userRole="client"
        currentScreen="ServiceProviderList"
      />

      {/* Contact Modal */}
      <ContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        userRole="client"
      />

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userRole="client"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  // Header styles matching ClientListScreen exactly
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    backgroundColor: TP.color.appBg,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.divider,
  },
  navSpacer: {
    width: 44, // Same width as icon button for symmetry
  },
  navTitle: {
    fontSize: TP.font.title3,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x16,
    paddingBottom: TP.spacing.x32,
    flexGrow: 1,
  },
  outstandingCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x16,
    ...Platform.select({
      ios: TP.shadow.card.ios,
      android: TP.shadow.card.android,
    }),
  },
  outstandingLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x4,
  },
  outstandingAmount: {
    fontSize: 28,
    fontWeight: TP.weight.bold,
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  providerCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x12,
    ...Platform.select({
      ios: TP.shadow.card.ios,
      android: TP.shadow.card.android,
    }),
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x4,
  },
  providerSubtitle: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
  },
  balanceSection: {
    alignItems: 'flex-end',
    flex: 1,
  },
  balanceDue: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
    marginBottom: TP.spacing.x4,
  },
  unpaidHoursInline: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
  },
  requestedHoursInline: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
  },
  paidUp: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: '#22C55E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    ...Platform.select({
      ios: TP.shadow.card.ios,
      android: TP.shadow.card.android,
    }),
  },
  emptyTitle: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x8,
  },
  emptySubtitle: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    textAlign: 'center',
    paddingHorizontal: TP.spacing.x24,
  },
  requestBadge: {
    backgroundColor: TP.color.pill.dueBg,
    borderRadius: TP.radius.pill,
    paddingHorizontal: TP.spacing.x8,
    paddingVertical: TP.spacing.x4,
    marginBottom: TP.spacing.x4,
    alignSelf: 'flex-end',
  },
  requestBadgeText: {
    fontSize: 12,
    fontWeight: TP.weight.medium,
    color: TP.color.pill.dueText,
  },
  balanceRequested: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.pill.dueText,
    fontVariant: ['tabular-nums'],
    marginBottom: TP.spacing.x4,
  },
});
