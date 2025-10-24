/**
 * FAQ Library - Hamburger Help Screen Content
 *
 * Converted from /docs/spec/hamburger/hamburger-faqs.md
 *
 * Organized by persona (provider/client) and category for display in HelpScreen.
 */

import { simpleT } from '../i18n/simple';

export type FAQCategory = 'sessions' | 'invites' | 'payments' | 'general';
export type Persona = 'provider' | 'client';

export interface FAQEntry {
  question: string;
  answer: string;
  category: FAQCategory;
  persona: Persona;
}

export const faqLibrary: FAQEntry[] = [
  // ============================================
  // PROVIDER FAQs
  // ============================================

  // Sessions
  {
    persona: 'provider',
    category: 'sessions',
    question: simpleT('faq.provider.sessions.1.q'),
    answer: simpleT('faq.provider.sessions.1.a'),
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: simpleT('faq.provider.sessions.2.q'),
    answer: simpleT('faq.provider.sessions.2.a'),
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: simpleT('faq.provider.sessions.3.q'),
    answer: simpleT('faq.provider.sessions.3.a'),
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: simpleT('faq.provider.sessions.4.q'),
    answer: simpleT('faq.provider.sessions.4.a'),
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: simpleT('faq.provider.sessions.5.q'),
    answer: simpleT('faq.provider.sessions.5.a'),
  },

  // Invites
  {
    persona: 'provider',
    category: 'invites',
    question: simpleT('faq.provider.invites.1.q'),
    answer: simpleT('faq.provider.invites.1.a'),
  },
  {
    persona: 'provider',
    category: 'invites',
    question: simpleT('faq.provider.invites.2.q'),
    answer: simpleT('faq.provider.invites.2.a'),
  },
  {
    persona: 'provider',
    category: 'invites',
    question: simpleT('faq.provider.invites.3.q'),
    answer: simpleT('faq.provider.invites.3.a'),
  },

  // Payments
  {
    persona: 'provider',
    category: 'payments',
    question: simpleT('faq.provider.payments.1.q'),
    answer: simpleT('faq.provider.payments.1.a'),
  },
  {
    persona: 'provider',
    category: 'payments',
    question: simpleT('faq.provider.payments.2.q'),
    answer: simpleT('faq.provider.payments.2.a'),
  },
  {
    persona: 'provider',
    category: 'payments',
    question: simpleT('faq.provider.payments.3.q'),
    answer: simpleT('faq.provider.payments.3.a'),
  },
  {
    persona: 'provider',
    category: 'payments',
    question: simpleT('faq.provider.payments.4.q'),
    answer: simpleT('faq.provider.payments.4.a'),
  },

  // General
  {
    persona: 'provider',
    category: 'general',
    question: simpleT('faq.provider.general.1.q'),
    answer: simpleT('faq.provider.general.1.a'),
  },
  {
    persona: 'provider',
    category: 'general',
    question: simpleT('faq.provider.general.2.q'),
    answer: simpleT('faq.provider.general.2.a'),
  },
  {
    persona: 'provider',
    category: 'general',
    question: simpleT('faq.provider.general.3.q'),
    answer: simpleT('faq.provider.general.3.a'),
  },
  {
    persona: 'provider',
    category: 'general',
    question: simpleT('faq.provider.general.4.q'),
    answer: simpleT('faq.provider.general.4.a'),
  },

  // ============================================
  // CLIENT FAQs
  // ============================================

  // Sessions
  {
    persona: 'client',
    category: 'sessions',
    question: simpleT('faq.client.sessions.1.q'),
    answer: simpleT('faq.client.sessions.1.a'),
  },
  {
    persona: 'client',
    category: 'sessions',
    question: simpleT('faq.client.sessions.2.q'),
    answer: simpleT('faq.client.sessions.2.a'),
  },
  {
    persona: 'client',
    category: 'sessions',
    question: simpleT('faq.client.sessions.3.q'),
    answer: simpleT('faq.client.sessions.3.a'),
  },

  // Invites
  {
    persona: 'client',
    category: 'invites',
    question: simpleT('faq.client.invites.1.q'),
    answer: simpleT('faq.client.invites.1.a'),
  },
  {
    persona: 'client',
    category: 'invites',
    question: simpleT('faq.client.invites.2.q'),
    answer: simpleT('faq.client.invites.2.a'),
  },
  {
    persona: 'client',
    category: 'invites',
    question: simpleT('faq.client.invites.3.q'),
    answer: simpleT('faq.client.invites.3.a'),
  },

  // Payments
  {
    persona: 'client',
    category: 'payments',
    question: simpleT('faq.client.payments.1.q'),
    answer: simpleT('faq.client.payments.1.a'),
  },
  {
    persona: 'client',
    category: 'payments',
    question: simpleT('faq.client.payments.2.q'),
    answer: simpleT('faq.client.payments.2.a'),
  },
  {
    persona: 'client',
    category: 'payments',
    question: simpleT('faq.client.payments.3.q'),
    answer: simpleT('faq.client.payments.3.a'),
  },
  {
    persona: 'client',
    category: 'payments',
    question: simpleT('faq.client.payments.4.q'),
    answer: simpleT('faq.client.payments.4.a'),
  },

  // General
  {
    persona: 'client',
    category: 'general',
    question: simpleT('faq.client.general.1.q'),
    answer: simpleT('faq.client.general.1.a'),
  },
  {
    persona: 'client',
    category: 'general',
    question: simpleT('faq.client.general.2.q'),
    answer: simpleT('faq.client.general.2.a'),
  },
  {
    persona: 'client',
    category: 'general',
    question: simpleT('faq.client.general.3.q'),
    answer: simpleT('faq.client.general.3.a'),
  },
  {
    persona: 'client',
    category: 'general',
    question: simpleT('faq.client.general.4.q'),
    answer: simpleT('faq.client.general.4.a'),
  },
];

/**
 * Get FAQs filtered by persona and optionally by category
 */
export function getFAQs(persona: Persona, category?: FAQCategory): FAQEntry[] {
  let filtered = faqLibrary.filter(faq => faq.persona === persona);

  if (category) {
    filtered = filtered.filter(faq => faq.category === category);
  }

  return filtered;
}

/**
 * Get FAQ count for a persona
 */
export function getFAQCount(persona: Persona): number {
  return faqLibrary.filter(faq => faq.persona === persona).length;
}

/**
 * Get all categories for a persona
 */
export function getCategories(persona: Persona): FAQCategory[] {
  const categories = new Set(
    faqLibrary
      .filter(faq => faq.persona === persona)
      .map(faq => faq.category)
  );

  // Return in the order specified in the spec
  return ['sessions', 'invites', 'payments', 'general'].filter(cat =>
    categories.has(cat as FAQCategory)
  ) as FAQCategory[];
}
