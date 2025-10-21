import React, { useState, useCallback } from 'react';
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
import { TP } from '../styles/themeV2';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  getCurrentUser,
  getServiceProvidersForClient,
  getClientSummary,
} from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { formatCurrency } from '../utils/formatters';

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
}

export const ServiceProviderListScreen: React.FC<ServiceProviderListScreenProps> = ({ navigation }) => {
  if (__DEV__) {
    if (__DEV__) {
      if (__DEV__) console.log('🚀 ServiceProviderListScreen: Component mounting...');
    }
  }
  const { userProfile, signOut } = useAuth();
  const t = simpleT;
  if (__DEV__) {
    if (__DEV__) {
      if (__DEV__) console.log('👤 ServiceProviderListScreen: userProfile:', userProfile?.name, userProfile?.role);
    }
  }

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  const loadServiceProviders = async () => {
    if (__DEV__) {
      if (__DEV__) {
        if (__DEV__) console.log('🔄 ServiceProviderList: Starting to load providers...');
      }
    }
    if (__DEV__) {
      if (__DEV__) {
        if (__DEV__) console.log('🔄 ServiceProviderList: userProfile:', userProfile);
      }
    }
    try {
      let providersData: ServiceProvider[] = [];
      let user = '';

      if (userProfile) {
        // Authenticated user - load providers based on relationships
        user = userProfile.name;
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('📊 Auth user - loading relationship-based providers for:', user);
          }
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
            if (__DEV__) { if (__DEV__) console.log('📊 Found', relationships.length, 'relationships'); }

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
                if (__DEV__) {
                  if (__DEV__) console.log('💰 ServiceProviderList: Loading provider summaries for', relatedProviders.length, 'providers...');
                }
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
                    };
                  } catch (error) {
                    if (__DEV__) {
                      if (__DEV__) {
                        if (__DEV__) console.warn('⚠️ Failed to load summary for provider:', provider.name, error.message);
                      }
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

                if (__DEV__) { if (__DEV__) console.log('✅ Loaded', providersData.length, 'related providers with session data'); }

              }
            }
          } else {
            if (__DEV__) {
              if (__DEV__) {
                if (__DEV__) console.log('📊 No relationships found - empty provider list');
              }
            }
            providersData = [];
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          providersData = [];
        }
      } else {
        // Fallback for non-auth users (development mode)
        const [user, providers] = await Promise.all([
          getCurrentUser(),
          getServiceProvidersForClient('')
        ]);
        providersData = providers;
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('📊 Non-auth user - loading from localStorage:', providersData.length, 'providers');
          }
        }
      }

      setServiceProviders(providersData);
      const userName = userProfile?.name || user || 'Client';
      setCurrentUser(userName);

      if (__DEV__) {

        if (__DEV__) {
          if (__DEV__) console.log('📊 ServiceProviderListScreen: Loaded', providersData.length, 'providers');
        }

      }
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('✅ ServiceProviderList: Loading complete!');
        }
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
        if (__DEV__) {
          if (__DEV__) console.log('🎯 ServiceProviderListScreen: useFocusEffect triggered');
        }
      }
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔧 ServiceProviderListScreen: userProfile available:', !!userProfile);
        }
      }

      // Only load providers if we have a userProfile
      if (userProfile) {
        if (__DEV__) { if (__DEV__) console.log('🔧 ServiceProviderListScreen: About to call loadServiceProviders...'); }
        loadServiceProviders();
      } else {
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('⏳ ServiceProviderListScreen: Waiting for userProfile...');
          }
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
      if (__DEV__) {
        if (__DEV__) console.log('🎯 ServiceProviderListScreen: Provider pressed:', provider.name);
      }
    }
    navigation.navigate('ServiceProviderSummary', { providerId: provider.id, providerName: provider.name });
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
      Alert.alert(t('providerList.errorTitle'), t('providerList.logoutError'));
    }
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (wholeHours === 0) {
      return `${minutes}min person-hours`;
    }
    const minutePart = minutes > 0 ? ` ${minutes}min` : '';
    return `${wholeHours}hr${minutePart} person-hours`;
  };

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <TouchableOpacity
      onPress={() => handleProviderPress(item)}
      style={styles.providerCard}
      activeOpacity={0.8}
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
                  {t('providerList.paymentRequestedAmount', { amount: formatCurrency(item.totalUnpaidBalance) })}
                </Text>
              ) : item.hasRequestedSessions && item.hasUnpaidSessions ? (
                <Text style={styles.balanceDue}>
                  {t('providerList.youOweWithRequested', {
                    total: formatCurrency(item.totalUnpaidBalance),
                    requested: formatCurrency(item.requestedBalance)
                  })}
                </Text>
              ) : (
                <Text style={styles.balanceDue}>
                  {t('providerList.youOwe', { amount: formatCurrency(item.totalUnpaidBalance) })}
                </Text>
              )}

              {/* Status-specific hours display */}
              {item.hasUnpaidSessions && item.hasRequestedSessions ? (
                <Text style={styles.unpaidHoursInline}>
                  [{t('providerList.unpaidAndRequested', {
                    unpaid: formatHours(item.unpaidHours),
                    requested: formatHours(item.requestedHours)
                  })}]
                </Text>
              ) : item.hasUnpaidSessions ? (
                <Text style={styles.unpaidHoursInline}>
                  [{t('providerList.unpaidHours', { hours: formatHours(item.unpaidHours) })}]
                </Text>
              ) : item.hasRequestedSessions ? (
                <Text style={styles.requestedHoursInline}>
                  [{t('providerList.requestedHours', { hours: formatHours(item.requestedHours) })}]
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

  const totalUnpaid = serviceProviders.reduce((sum, provider) => sum + provider.totalUnpaidBalance, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{currentUser}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={20} color={TP.color.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>{t('providerList.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
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
          <View>
            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('providerList.title')}</Text>

              {totalUnpaid > 0 && (
                <View style={styles.outstandingCard}>
                  <Text style={styles.outstandingLabel}>{t('providerList.totalYouOwe')}</Text>
                  <Text style={styles.outstandingAmount}>
                    {formatCurrency(totalUnpaid)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('providerList.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('providerList.emptySubtitle')}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x12,
    paddingBottom: TP.spacing.x12,
    backgroundColor: TP.color.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.border,
  },
  userName: {
    fontSize: 20,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TP.spacing.x16,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TP.color.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  logoutButton: {
    paddingVertical: TP.spacing.x8,
    paddingHorizontal: TP.spacing.x12,
  },
  logoutText: {
    fontSize: TP.font.body,
    color: TP.color.ink,
  },
  header: {
    paddingTop: TP.spacing.x16,
    paddingBottom: TP.spacing.x12,
  },
  title: {
    fontSize: 24,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x16,
  },
  outstandingCard: {
    backgroundColor: TP.color.cardBg,
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x16,
  },
  outstandingLabel: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x4,
  },
  outstandingAmount: {
    fontSize: 24,
    fontWeight: TP.weight.bold,
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: TP.spacing.x16,
    paddingBottom: TP.spacing.x32,
    flexGrow: 1,
  },
  providerCard: {
    backgroundColor: TP.color.cardBg,
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x16,
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
    color: TP.color.textSecondary,
  },
  requestedHoursInline: {
    fontSize: TP.font.footnote,
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
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.card,
    margin: TP.spacing.x16,
  },
  emptyTitle: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TP.color.textSecondary,
    textAlign: 'center',
  },
  requestBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: TP.spacing.x16,
    paddingHorizontal: TP.spacing.x8,
    paddingVertical: TP.spacing.x4,
    marginBottom: TP.spacing.x4,
    alignSelf: 'flex-end',
  },
  requestBadgeText: {
    fontSize: 12,
    fontWeight: TP.weight.medium,
    color: '#D97706',
  },
  balanceRequested: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: '#F59E0B',
    fontVariant: ['tabular-nums'],
    marginBottom: TP.spacing.x4,
  },
});
