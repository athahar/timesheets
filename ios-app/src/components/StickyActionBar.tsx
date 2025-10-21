import React, { useEffect, useState } from 'react';
import { Platform, Keyboard, View, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FOOTER_HEIGHT = 60; // Button (48px) + top padding (12px)

export interface StickyActionBarProps {
  children: React.ReactNode;
}

/**
 * StickyActionBar - A footer that stays above the keyboard
 *
 * Features:
 * - Automatically moves up when keyboard appears (iOS & Android)
 * - Smooth animations using Animated API
 * - Respects safe area insets
 * - Always visible above keyboard (flush, no gap)
 * - High z-index to stay on top
 *
 * @example
 * <StickyActionBar>
 *   <Button title="Submit" onPress={handleSubmit} />
 * </StickyActionBar>
 */
export const StickyActionBar: React.FC<StickyActionBarProps> = ({ children }) => {
  const [kbd] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      Animated.timing(kbd, {
        toValue: e.endCoordinates?.height ?? 0,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 0,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: any) => {
      Animated.timing(kbd, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 0,
        useNativeDriver: false,
      }).start();
    };

    const showListener = Keyboard.addListener(showEvent, onShow);
    const hideListener = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [kbd]);

  const bottomPadding = insets.bottom ? insets.bottom : 12;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.bar,
        {
          paddingBottom: bottomPadding,
          height: FOOTER_HEIGHT + bottomPadding,
          transform: [{ translateY: Animated.multiply(kbd, -1) }],
        },
      ]}
    >
      <View style={styles.innerContainer}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    // Sit above everything
    zIndex: 1000,
    elevation: 10,
    // Light shadow
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  innerContainer: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
