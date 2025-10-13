import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface IOSHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    title: string;
    onPress: () => void;
    destructive?: boolean;
  };
  leftAction?: {
    title: string;
    onPress: () => void;
  };
  backgroundColor?: string;
  largeTitleStyle?: 'always' | 'auto' | 'never';
  showBorder?: boolean;
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  leftAction,
  backgroundColor = '#FFFFFF',
  largeTitleStyle = 'always',
  showBorder = true,
}) => {
  const insets = useSafeAreaInsets();

  const isLargeTitle = largeTitleStyle === 'always';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />

      {/* Status bar spacing */}
      <View style={{ height: insets.top }} />

      {/* Navigation bar */}
      <View style={styles.navigationBar}>
        <View style={styles.leftSection}>
          {leftAction && (
            <TouchableOpacity
              onPress={leftAction.onPress}
              style={styles.actionButton}
              activeOpacity={0.6}
            >
              <View style={styles.backButtonContent}>
                <Feather name="chevron-left" size={24} color={theme.color.brand} />
                <Text style={styles.leftActionText}>{leftAction.title}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!isLargeTitle && (
          <View style={styles.centerSection}>
            <Text style={styles.navigationTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}

        <View style={styles.rightSection}>
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              style={styles.actionButton}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.rightActionText,
                rightAction.destructive && styles.destructiveText,
              ]}>
                {rightAction.title}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Large title section */}
      {isLargeTitle && (
        <View style={styles.largeTitleSection}>
          <Text style={styles.largeTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      )}

      {/* Bottom border */}
      {showBorder && <View style={styles.bottomBorder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4, // Align better with iOS standards
  },
  leftActionText: {
    fontSize: 17,
    color: theme.color.brand,
    fontWeight: '400',
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: -2, // Close gap between chevron and text
  },
  rightActionText: {
    fontSize: 17,
    color: theme.color.brand,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  navigationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },
  largeTitleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    lineHeight: 41,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 20,
  },
  bottomBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
});