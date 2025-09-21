import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';
import { setUserRole, setCurrentUser, getClients } from '../services/storage';

interface AccountSelectionScreenProps {
  navigation: any;
}

interface AccountOption {
  id: string;
  name: string;
  role: 'provider' | 'client';
  subtitle: string;
}

export const AccountSelectionScreen: React.FC<AccountSelectionScreenProps> = ({
  navigation,
}) => {
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        // Always include Lucy as the service provider
        const accounts: AccountOption[] = [
          {
            id: 'lucy',
            name: 'Lucy',
            role: 'provider',
            subtitle: 'Service Provider',
          },
        ];

        // Load all clients dynamically from storage
        const clients = await getClients();
        const clientAccounts = clients.map(client => ({
          id: client.id,
          name: client.name,
          role: 'client' as const,
          subtitle: 'Client',
        }));

        setAccountOptions([...accounts, ...clientAccounts]);
      } catch (error) {
        console.error('Error loading accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);
  const handleAccountSelect = async (account: AccountOption) => {
    try {
      // Set user role and name in storage
      await setUserRole(account.role);
      await setCurrentUser(account.name);

      // Navigate to appropriate screen
      if (account.role === 'provider') {
        // Service provider (Lucy) goes to client list
        navigation.replace('ClientList');
      } else {
        // Clients go to service provider list
        navigation.replace('ServiceProviderList');
      }
    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App Title */}
        <Text style={styles.appTitle}>TimeTracker</Text>
        <Text style={styles.subtitle}>Choose your account to continue</Text>

        {/* Account Options */}
        <View style={styles.accountList}>
          {loading ? (
            <Text style={styles.loadingText}>Loading accounts...</Text>
          ) : (
            accountOptions.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[styles.accountCard, theme.shadows.card]}
              onPress={() => handleAccountSelect(account)}
              activeOpacity={0.8}
            >
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountSubtitle}>{account.subtitle}</Text>
            </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xxl,
    textAlign: 'center',
  },
  accountList: {
    width: '100%',
    maxWidth: 400,
    gap: theme.spacing.lg,
  },
  accountCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  accountName: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  accountSubtitle: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  loadingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});