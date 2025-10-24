import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
import { useAuth } from '../contexts/AuthContext';
import { capture } from '../services/analytics';
import { E } from '../services/analytics/events';
import { getFAQs, getCategories, getFAQCount, FAQCategory } from '../data/faqLibrary';

interface HelpScreenProps {
  navigation: any;
}

/**
 * HelpScreen - Role-aware FAQ display
 *
 * Displays FAQs organized by category (Sessions, Invites, Payments, General)
 * Content filtered by user role (provider/client)
 * Emits analytics event on screen view
 */
export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Set<FAQCategory>>(new Set());

  const userRole = (userProfile?.role || 'provider') as 'provider' | 'client';
  const categories = getCategories(userRole);
  const faqCount = getFAQCount(userRole);

  useEffect(() => {
    // Analytics: screen view
    capture(E.SCREEN_VIEW_HELP, {
      role: userRole,
      faq_count: faqCount,
    });
  }, [userRole, faqCount]);

  const toggleCategory = (category: FAQCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryLabel = (category: FAQCategory): string => {
    return simpleT(`help.section.${category}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Feather name="arrow-left" size={24} color={TP.color.ink} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{simpleT('help.title')}</Text>

        {/* Right spacer for centering */}
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <Text style={styles.hero}>{simpleT('help.hero')}</Text>

        {/* Intro */}
        <Text style={styles.intro}>
          {simpleT(userRole === 'provider' ? 'help.intro.provider' : 'help.intro.client')}
        </Text>

        {/* FAQ Sections */}
        {categories.length > 0 ? (
          <View style={styles.faqSections}>
            {categories.map((category) => {
              const faqs = getFAQs(userRole, category);
              const isExpanded = expandedCategories.has(category);

              return (
                <View key={category} style={styles.section}>
                  {/* Section Header */}
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleCategory(category)}
                    accessibilityLabel={`${getCategoryLabel(category)} section`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <Text style={styles.sectionTitle}>{getCategoryLabel(category)}</Text>
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={TP.color.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* FAQ Items (collapsible) */}
                  {isExpanded && (
                    <View style={styles.faqList}>
                      {faqs.map((faq, index) => (
                        <View key={index} style={styles.faqItem}>
                          <View style={styles.faqQuestionRow}>
                            <Feather name="help-circle" size={16} color={TP.color.primary} />
                            <Text style={styles.faqQuestion}>{simpleT(faq.questionKey)}</Text>
                          </View>
                          <Text style={styles.faqAnswer}>{simpleT(faq.answerKey)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={TP.color.textSecondary} />
            <Text style={styles.emptyStateText}>{simpleT('help.emptyState')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  header: {
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
  headerTitle: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: TP.spacing.x20,
    paddingVertical: TP.spacing.x24,
  },
  hero: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
    textAlign: 'center',
  },
  intro: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x32,
    lineHeight: 22,
    textAlign: 'center',
  },
  faqSections: {
    gap: TP.spacing.x16,
  },
  section: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: TP.spacing.x16,
    backgroundColor: TP.color.cardBg,
  },
  sectionTitle: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  faqList: {
    gap: TP.spacing.x12,
    paddingHorizontal: TP.spacing.x16,
    paddingBottom: TP.spacing.x16,
  },
  faqItem: {
    paddingVertical: TP.spacing.x12,
    borderTopWidth: 1,
    borderTopColor: TP.color.divider,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TP.spacing.x8,
    marginBottom: TP.spacing.x8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    lineHeight: 22,
    paddingLeft: 24, // Align with question text (icon + gap)
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: TP.spacing.x48,
    gap: TP.spacing.x16,
  },
  emptyStateText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
