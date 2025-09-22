import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { setUserRole, setCurrentUser, getClients } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

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
  const { userProfile, signOut } = useAuth();

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        if (!userProfile) {
          console.log('No user profile available yet');
          setLoading(false);
          return;
        }

        const accounts: AccountOption[] = [];

        if (userProfile.role === 'provider') {
          // Service providers see their clients
          // First, check if there are any existing relationships based on email
          const clients = await getClients();
          const relatedClients = clients.filter(client =>
            client.email && client.email.toLowerCase() === userProfile.email.toLowerCase()
          );

          if (relatedClients.length > 0) {
            // Show related clients
            const clientAccounts = relatedClients.map(client => ({
              id: client.id,
              name: client.name,
              role: 'client' as const,
              subtitle: 'Client',
            }));
            accounts.push(...clientAccounts);
          } else {
            // No related clients found - show option to manage clients
            accounts.push({
              id: 'manage-clients',
              name: 'Manage Clients',
              role: 'provider',
              subtitle: 'Create and manage your client relationships',
            });
          }
        } else {
          // Clients see their service providers
          // For now, show the authenticated client can see Lucy as service provider
          accounts.push({
            id: 'lucy',
            name: 'Lucy',
            role: 'provider',
            subtitle: 'Service Provider',
          });
        }

        setAccountOptions(accounts);
      } catch (error) {
        console.error('Error loading accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [userProfile]);
  const handleAccountSelect = async (account: AccountOption) => {
    try {
      if (account.id === 'manage-clients') {
        // Service provider with no clients - go to client management
        await setUserRole('provider');
        await setCurrentUser(userProfile?.name || 'Provider');
        navigation.replace('ClientList');
        return;
      }

      // Set user role and name in storage for backward compatibility
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

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with user info and logout */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.userName}>{userProfile?.name || userProfile?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* App Title */}
        <Text style={styles.appTitle}>TrackPay</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  userName: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  logoutButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.button,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.primary,
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