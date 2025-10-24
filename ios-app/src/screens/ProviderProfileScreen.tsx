import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TPAvatar } from '../components/v2/TPAvatar';
import { TP } from '../styles/themeV2';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { simpleT } from '../i18n/simple';

// Helper function to format names in proper sentence case
const formatName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface ProviderProfileScreenProps {
  route: {
    params: {
      providerId: string;
      providerName: string;
    };
  };
  navigation: any;
}

export const ProviderProfileScreen: React.FC<ProviderProfileScreenProps> = ({
  route,
  navigation,
}) => {
  const { providerId, providerName } = route.params;
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const loadProviderRate = useCallback(async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // First, try to get relationship-specific rate
      const { data: relationship, error: relError } = await supabase
        .from('trackpay_relationships')
        .select('hourly_rate')
        .eq('provider_id', providerId)
        .eq('client_id', userProfile.id)
        .single();

      if (!relError && relationship?.hourly_rate) {
        setHourlyRate(relationship.hourly_rate);
      } else {
        // Fall back to provider's base rate
        const { data: provider, error: providerError } = await supabase
          .from('trackpay_users')
          .select('hourly_rate')
          .eq('id', providerId)
          .eq('role', 'provider')
          .single();

        if (!providerError && provider?.hourly_rate) {
          setHourlyRate(provider.hourly_rate);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading provider rate:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [providerId, userProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProviderRate();
    }, [loadProviderRate])
  );

  if (loading) {
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
            <TPAvatar name={providerName} size="sm" />
            <Text style={styles.headerName}>{formatName(providerName)}</Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{simpleT('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
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
          <TPAvatar name={providerName} size="sm" />
          <Text style={styles.headerName}>{formatName(providerName)}</Text>
        </View>

        {/* No edit button - read-only view */}
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          {/* Hourly Rate Display */}
          <View style={styles.rateSection}>
            <Text style={styles.rateLabel}>{simpleT('providerProfile.hourlyRate')}</Text>
            <Text style={styles.rateValue}>{formatCurrency(hourlyRate)}/hr</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              {simpleT('providerProfile.hourlyRateInfo', { providerName: formatName(providerName) })}
            </Text>
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: TP.spacing.x24,
    paddingBottom: TP.spacing.x32,
  },
  profileCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x32,
    borderWidth: 1,
    borderColor: TP.color.border,
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
});
