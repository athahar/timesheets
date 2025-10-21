import React from 'react';
import { View, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { TP } from '../../styles/themeV2';
import { CardStyles } from '../../styles/components';

export interface TPCardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * TPCard - TrackPay v2 Card Container Component
 *
 * Features:
 * - Platform-specific shadows (iOS shadow / Android elevation)
 * - Configurable padding (sm: 16, md: 20, lg: 24)
 * - Optional touchable (onPress)
 * - 16px border radius
 *
 * @example
 * <TPCard padding="lg">
 *   <Text>Card content</Text>
 * </TPCard>
 */
export const TPCard: React.FC<TPCardProps> = ({
  children,
  padding = 'md',
  onPress,
  style,
}) => {
  const getPaddingValue = (): number => {
    if (padding === 'sm') return 16;
    if (padding === 'lg') return 24;
    return 20; // md
  };

  const cardStyle: ViewStyle = {
    ...CardStyles.base,
    padding: getPaddingValue(),
    ...style,
  };

  // If touchable, use TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Otherwise, use View
  return <View style={cardStyle}>{children}</View>;
};
