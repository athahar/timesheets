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
          if (__DEV__) { if (__DEV__) console.log('No user profile available yet, waiting...'); }
          // Keep loading state true while waiting for user profile
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
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.userName}>{userProfile?.name || userProfile?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* App Title */}
        <Text style={styles.appTitle}>TrackPay</Text>
        <Text style={styles.subtitle}>Loading...</Text>

        {/* Account Options */}
        <View style={styles.accountList}>
          {loading ? (
            <Text style={styles.loadingText}>Loading accounts...</Text>
          ) : (
            accountOptions.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={styles.accountCard}
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
    backgroundColor: theme.color.appBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  logoutButton: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  accountList: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  accountCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 16,
    alignItems: 'flex-start',
    minHeight: 72,
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  accountSubtitle: {
    fontSize: 13,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  loadingText: {
    fontSize: 16,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    paddingVertical: 32,
  },
});