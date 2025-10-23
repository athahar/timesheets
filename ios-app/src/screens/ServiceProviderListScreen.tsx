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
import { TPHeader } from '../components/v2/TPHeader';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  getCurrentUser,
  getServiceProvidersForClient,
  getClientSummary,
} from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { moneyFormat } from '../utils/money';
import { useLocale } from '../hooks/useLocale';
import { trackEvent } from '../services/analytics';
import { dedupeEventOnce } from '../services/analytics/dedupe';

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

  // Track screen view on mount
  useEffect(() => {
    if (dedupeEventOnce('client.home.viewed')) {
      trackEvent('client.home.viewed', {
        providerCount: serviceProviders.length,
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
        // Authenticated user - load providers based on relationships
        if (__DEV__) {
          console.log('📊 Auth user - loading relationship-based providers for:', userProfile.name);
        }

        try {
          // Get provider IDs that have relationships with this client
          const { data: relationships, error: relError } = await supabase
            .from('trackpay_relationships')
            .select('provider_id')
            .eq('client_id', userProfile.id);

          if (relError) {
            console.error('❌ Error loading relationships:', relError);
            providersData = [];
          } else if (relationships && relationships.length > 0) {
            if (__DEV__) console.log('📊 Found', relationships.length, 'relationships');

            // Get provider details for each relationship
            const providerIds = relationships.map(rel => rel.provider_id);
            const { data: relatedProviders, error: providerError } = await supabase
              .from('trackpay_users')
              .select('*')
              .in('id', providerIds)
              .eq('role', 'provider');

            if (providerError) {
              console.error('❌ Error loading related providers:', providerError);
              providersData = [];
            } else {
              // Convert Supabase format to ServiceProvider format and load real session data
              if (__DEV__) {
                console.log('💰 ServiceProviderList: Loading provider summaries for', relatedProviders.length, 'providers...');
              }

              const providersWithSummary = await Promise.allSettled(
                (relatedProviders || []).map(async (provider) => {
                  try {
                    // Load session summary for this provider-client relationship
                    const summary = await Promise.race([
                      getClientSummary(userProfile.id), // Get summary from client's perspective
                      new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Summary timeout')), 2000)
                      )
                    ]);

                    return {
                      id: provider.id,
                      name: provider.name,
                      unpaidHours: summary.unpaidHours,
                      requestedHours: summary.requestedHours,
                      unpaidBalance: summary.unpaidBalance,
                      requestedBalance: summary.requestedBalance,
                      totalUnpaidBalance: summary.totalUnpaidBalance,
                      hasUnpaidSessions: summary.hasUnpaidSessions,
                      hasRequestedSessions: summary.hasRequestedSessions,
                      paymentStatus: summary.paymentStatus,
                      currency: provider.currency || 'USD',
                    };
                  } catch (error) {
                    if (__DEV__) {
                      console.warn('⚠️ Failed to load summary for provider:', provider.name, error.message);
                    }
                    // Return provider with default summary
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

              // Filter successful results
              providersData = providersWithSummary
                .filter((result): result is PromiseFulfilledResult<ServiceProvider> =>
                  result.status === 'fulfilled'
                )
                .map(result => result.value);

              if (__DEV__) {
                console.log('✅ Loaded', providersData.length, 'related providers with session data');
              }
            }
          } else {
            if (__DEV__) {
              console.log('📊 No relationships found - empty provider list');
            }
            providersData = [];
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          providersData = [];
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

    // Track provider card tap
    if (dedupeEventOnce(`client.provider.card_tapped.${provider.id}`, 1000)) {
      trackEvent('client.provider.card_tapped', {
        providerId: provider.id,
        providerName: provider.name,
        totalBalance: provider.totalUnpaidBalance,
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
            <Text style={styles.providerSubtitle}>{t('providerList.serviceProvider')}</Text>
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
                    {moneyFormat(item.totalUnpaidBalance, currency, locale)}
                  </Text>
                ) : (
                  <Text style={styles.balanceDue}>
                    {moneyFormat(item.totalUnpaidBalance, currency, locale)}
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
  const totalUnpaid = serviceProviders.reduce((sum, provider) => sum + provider.totalUnpaidBalance, 0);
  const currency = serviceProviders.length > 0 ? serviceProviders[0].currency || 'USD' : 'USD';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <TPHeader
        title="TrackPay"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={20} color={TP.color.ink} />
          </TouchableOpacity>
        }
      />

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
                  {moneyFormat(totalUnpaid, currency, locale)}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
