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
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  getCurrentUser,
  getServiceProvidersForClient,
  getClientSummary,
} from '../services/storageService';

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
    console.log('🚀 ServiceProviderListScreen: Component mounting...');
  }
  const { userProfile, signOut } = useAuth();
  if (__DEV__) {
    console.log('👤 ServiceProviderListScreen: userProfile:', userProfile?.name, userProfile?.role);
  }

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  const loadServiceProviders = async () => {
    if (__DEV__) {
      console.log('🔄 ServiceProviderList: Starting to load providers...');
    }
    if (__DEV__) {
      console.log('🔄 ServiceProviderList: userProfile:', userProfile);
    }
    try {
      let providersData: ServiceProvider[] = [];
      let user = '';

      if (userProfile) {
        // Authenticated user - load providers based on relationships
        user = userProfile.name;
        if (__DEV__) {
          console.log('📊 Auth user - loading relationship-based providers for:', user);
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
            console.log('📊 Found', relationships.length, 'relationships');

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
        const [user, providers] = await Promise.all([
          getCurrentUser(),
          getServiceProvidersForClient('')
        ]);
        providersData = providers;
        if (__DEV__) {
          console.log('📊 Non-auth user - loading from localStorage:', providersData.length, 'providers');
        }
      }

      setServiceProviders(providersData);
      const userName = userProfile?.name || user || 'Client';
      setCurrentUser(userName);

      if (__DEV__) {

        console.log('📊 ServiceProviderListScreen: Loaded', providersData.length, 'providers');

      }
      if (__DEV__) {
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
      }
      if (__DEV__) {
        console.log('🔧 ServiceProviderListScreen: userProfile available:', !!userProfile);
      }

      // Only load providers if we have a userProfile
      if (userProfile) {
        console.log('🔧 ServiceProviderListScreen: About to call loadServiceProviders...');
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
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}hr ${m}min`;
  };

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <TouchableOpacity
      onPress={() => handleProviderPress(item)}
      style={[styles.providerCard, theme.shadows.card]}
      activeOpacity={0.8}
    >
      <View style={styles.providerHeader}>
        {/* Left Side: Provider Info */}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{item.name}</Text>
          <Text style={styles.providerSubtitle}>Service Provider</Text>
        </View>

        {/* Right Side: Balance Info */}
        <View style={styles.balanceSection}>
          {item.totalUnpaidBalance > 0 ? (
            <>
              {/* Payment request notification badge */}
              {item.hasRequestedSessions && (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>Payment Requested</Text>
                </View>
              )}

              {/* Context-aware balance text */}
              {item.paymentStatus === 'requested' ? (
                <Text style={styles.balanceRequested}>
                  Payment requested: ${item.totalUnpaidBalance.toFixed(0)}
                </Text>
              ) : item.hasRequestedSessions && item.hasUnpaidSessions ? (
                <Text style={styles.balanceDue}>
                  You owe: ${item.totalUnpaidBalance.toFixed(0)} (${item.requestedBalance.toFixed(0)} requested)
                </Text>
              ) : (
                <Text style={styles.balanceDue}>
                  You owe: ${item.totalUnpaidBalance.toFixed(0)}
                </Text>
              )}

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
            </>
          ) : (
            <Text style={styles.paidUp}>All paid up</Text>
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
              <Text style={styles.title}>Service Providers</Text>

              {totalUnpaid > 0 && (
                <View style={styles.outstandingCard}>
                  <Text style={styles.outstandingLabel}>Total You Owe</Text>
                  <Text style={styles.outstandingAmount}>
                    ${totalUnpaid.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No service providers yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see providers you work with here
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
  providerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
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
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.primary,
  },
  providerSubtitle: {
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
  },
  paidUp: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.success,
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
});