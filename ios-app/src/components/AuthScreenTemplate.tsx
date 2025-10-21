import React from 'react';
import { View, ScrollView, ScrollViewProps, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TPHeader } from './v2/TPHeader';
import { StickyActionBar, FOOTER_HEIGHT } from './StickyActionBar';

export interface AuthScreenTemplateProps {
  /** Header title */
  title: string;
  /** Back button handler */
  onBack?: () => void;
  /** Optional subtitle node rendered at top of content area */
  subtitle?: React.ReactNode;
  /** Main content (inputs, links, etc.) */
  children: React.ReactNode;
  /** Sticky footer content (CTA button) */
  footer: React.ReactNode;
  /** Optional right action in header (e.g., help icon) */
  right?: React.ReactNode;
  /** Pass-through props to ScrollView */
  scrollProps?: ScrollViewProps;
}

/**
 * AuthScreenTemplate - Reusable wrapper for authentication screens
 *
 * Features:
 * - TPHeader with centered title and back button
 * - Keyboard-aware ScrollView
 * - StickyActionBar footer that glides with keyboard
 * - Consistent spacing and safe area handling
 * - Optional subtitle below header
 *
 * @example
 * <AuthScreenTemplate
 *   title="Create Account"
 *   onBack={() => navigation.goBack()}
 *   subtitle={<Text>Track your time and get paid faster</Text>}
 *   footer={<TPButton title="Create Account" onPress={handleSubmit} />}
 * >
 *   <TPInput label="Email" {...emailProps} />
 *   <TPInput label="Password" {...passwordProps} />
 * </AuthScreenTemplate>
 */
export const AuthScreenTemplate: React.FC<AuthScreenTemplateProps> = ({
  title,
  onBack,
  subtitle,
  children,
  footer,
  right,
  scrollProps,
}) => {
  const insets = useSafeAreaInsets();
  const footerPad = FOOTER_HEIGHT + insets.bottom + 16;

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
      <TPHeader title={title} onBack={onBack} right={right} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 24,
            paddingBottom: footerPad,
          }}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {subtitle ? <View style={{ marginBottom: 16 }}>{subtitle}</View> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>

      <StickyActionBar>{footer}</StickyActionBar>
    </View>
  );
};
