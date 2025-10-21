import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { TP } from '../../styles/themeV2';

export interface TPAvatarProps {
  name: string;
  imageUri?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

/**
 * TPAvatar - TrackPay v2 Avatar Component
 *
 * Features:
 * - Image support (URL or local)
 * - Initials fallback (first 2 letters)
 * - Colored backgrounds (hash-based from name)
 * - Size variants (sm: 32, md: 40, lg: 56)
 *
 * @example
 * <TPAvatar name="Michelle Smith" imageUri={client.imageUri} size="md" />
 */
export const TPAvatar: React.FC<TPAvatarProps> = ({
  name,
  imageUri,
  size = 'md',
  style,
}) => {
  const getSize = (): number => {
    if (size === 'sm') return 32;
    if (size === 'lg') return 56;
    return 40; // md
  };

  const getFontSize = (): number => {
    if (size === 'sm') return 13;
    if (size === 'lg') return 22;
    return 16; // md
  };

  // Hash name to get consistent color
  const getBackgroundColor = (): string => {
    const colors = [
      TP.color.pill.activeBg,   // Teal
      TP.color.pill.requestedBg, // Purple
      TP.color.pill.dueBg,       // Amber
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getTextColor = (): string => {
    const backgroundColor = getBackgroundColor();
    if (backgroundColor === TP.color.pill.activeBg) return TP.color.pill.activeText;
    if (backgroundColor === TP.color.pill.requestedBg) return TP.color.pill.requestedText;
    if (backgroundColor === TP.color.pill.dueBg) return TP.color.pill.dueText;
    return TP.color.ink;
  };

  // Get initials (first 2 letters)
  const getInitials = (): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarSize = getSize();
  const fontSize = getFontSize();

  const containerStyle: ViewStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: getBackgroundColor(),
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (imageUri) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUri }}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text
        style={{
          fontSize,
          fontWeight: TP.weight.semibold,
          color: getTextColor(),
        }}
      >
        {getInitials()}
      </Text>
    </View>
  );
};
