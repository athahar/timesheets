import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { simpleT } from '../i18n/simple';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to error reporting service in production
    // NOTE: In production, integrate with Sentry, Bugsnag, etc. instead of console.error
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    if (__DEV__) {
      console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ScrollView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>{simpleT('errorBoundary.title')}</Text>
            <Text style={styles.message}>
              {simpleT('errorBoundary.message')}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>{simpleT('errorBoundary.retry')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space.x20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.space.x16,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: theme.space.x20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.color.brand,
    paddingHorizontal: theme.space.x20,
    paddingVertical: theme.space.x12,
    borderRadius: theme.radius.button,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.font.body,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
  errorDetails: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.radius.card,
    padding: theme.space.x16,
    marginBottom: theme.space.x20,
    maxWidth: '100%',
  },
  errorTitle: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.space.x8,
  },
  errorText: {
    fontSize: theme.font.small,
    color: '#EF4444',
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.space.x8,
  },
  stackTrace: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});