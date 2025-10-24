/**
 * FAQ Library - Hamburger Help Screen Content
 *
 * Converted from /docs/spec/hamburger/hamburger-faqs.md
 *
 * Organized by persona (provider/client) and category for display in HelpScreen.
 */

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
    question: 'How do I start a new session?',
    answer: 'Open the client from your list, review the details, then tap "I\'m Here". The timer begins immediately and you can monitor elapsed time at the top of the screen.',
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: 'How do I end a running session?',
    answer: 'From the active session screen, tap "I\'m Done" when the visit ends. TrackPay calculates duration, person hours, and the amount due automatically.',
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: 'Can I adjust the crew size during a session?',
    answer: 'Yes. Use the crew size stepper while the session is active. Changes apply to the entire session and the payment summary updates as soon as you confirm.',
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: 'How do I change a client\'s hourly rate?',
    answer: 'Go to the client profile, tap Edit, update the hourly rate field, and save. New sessions will use the updated rate immediately.',
  },
  {
    persona: 'provider',
    category: 'sessions',
    question: 'What if a session ended but the duration looks wrong?',
    answer: 'Pause new work, review the session history, and contact support with the session ID so we can help correct the entry.',
  },

  // Invites
  {
    persona: 'provider',
    category: 'invites',
    question: 'How do I invite a client to TrackPay?',
    answer: 'On the client list, tap Invite, generate a code, and share it via text or email. The client enters that code during sign-up to link to you.',
  },
  {
    persona: 'provider',
    category: 'invites',
    question: 'How do I invite another provider to help with my clients?',
    answer: 'Use the provider invite flow in Settings to generate a provider code. Share it directly with the provider you trust so they can join your workspace.',
  },
  {
    persona: 'provider',
    category: 'invites',
    question: 'What happens if a client never accepts my invite?',
    answer: 'You can resend the invite from the client profile. If the link expires, create a fresh code and share it again, or remove the placeholder client if no longer needed.',
  },
  {
    persona: 'provider',
    category: 'invites',
    question: 'Can I revoke an invite that went to the wrong person?',
    answer: 'Yes. Open the invite record, choose Revoke, and the code stops working immediately. Create a new invite for the correct contact when ready.',
  },

  // Payments
  {
    persona: 'provider',
    category: 'payments',
    question: 'How do I request payment for recent sessions?',
    answer: 'From the client history, select unpaid sessions and tap Request Payment. TrackPay notifies the client and tracks the outstanding balance.',
  },
  {
    persona: 'provider',
    category: 'payments',
    question: 'How do I mark a payment as received?',
    answer: 'Open the payment request or unpaid session list, choose the sessions that were paid, and tap Mark as Paid. Enter the amount and payment method, then confirm.',
  },
  {
    persona: 'provider',
    category: 'payments',
    question: 'What if a payment amount looks incorrect?',
    answer: 'Review the session details for crew size and duration. If something still feels off, email support with the session IDs and we\'ll help reconcile the numbers.',
  },
  {
    persona: 'provider',
    category: 'payments',
    question: 'Can I see which clients still owe me money?',
    answer: 'Yes. The client list shows outstanding balances at a glance, and the analytics summary breaks down unpaid, requested, and paid totals.',
  },

  // General
  {
    persona: 'provider',
    category: 'general',
    question: 'How do I share TrackPay with other providers?',
    answer: 'Tap the hamburger menu, choose Share, and use the pre-filled message to text or email colleagues about TrackPay.',
  },
  {
    persona: 'provider',
    category: 'general',
    question: 'How can I contact TrackPay support?',
    answer: 'Open the hamburger menu, tap Contact, and hit Email Support. The message automatically includes your app version so we can help faster.',
  },
  {
    persona: 'provider',
    category: 'general',
    question: 'Where can I see all my recent activity?',
    answer: 'Visit the Activity Feed to view session starts, ends, payment requests, and payment confirmations in chronological order.',
  },
  {
    persona: 'provider',
    category: 'general',
    question: 'What should I do if something looks inaccurate?',
    answer: 'Pause before adjusting data manually, take screenshots if possible, and email support with a short description and session IDs so we can investigate.',
  },

  // ============================================
  // CLIENT FAQs
  // ============================================

  // Sessions
  {
    persona: 'client',
    category: 'sessions',
    question: 'How do I know when my provider is on-site?',
    answer: 'You\'ll see a live session banner in the provider list once they tap "I\'m Here." The Activity Feed also logs the start time.',
  },
  {
    persona: 'client',
    category: 'sessions',
    question: 'Can I view the details of past sessions?',
    answer: 'Yes. Open the provider, then tap Session History to see dates, durations, crew sizes, and notes for every visit.',
  },
  {
    persona: 'client',
    category: 'sessions',
    question: 'How do I request corrections to a session?',
    answer: 'If something looks wrong, contact your provider directly or use the Contact option in the menu to email TrackPay support with the session details.',
  },

  // Invites
  {
    persona: 'client',
    category: 'invites',
    question: 'How do I accept a provider\'s invite?',
    answer: 'During sign-up, enter the invite code your provider shared. TrackPay links your account instantly so you can view their sessions and requests.',
  },
  {
    persona: 'client',
    category: 'invites',
    question: 'What if I never received an invite code?',
    answer: 'Ask your provider to resend the code or send you a new one. If you still don\'t receive it, contact support and we\'ll verify the provider-client connection.',
  },
  {
    persona: 'client',
    category: 'invites',
    question: 'Can I invite another provider to TrackPay?',
    answer: 'Yes. Use the Invite Provider option to send them a code. Once they join, you can see their sessions alongside your other providers.',
  },
  {
    persona: 'client',
    category: 'invites',
    question: 'How do I invite another family member to help manage care?',
    answer: 'Share your login credentials sparingly or contact support to set up access for a family coordinator (multi-user support is on the roadmap).',
  },

  // Payments
  {
    persona: 'client',
    category: 'payments',
    question: 'How do I review payment requests from my provider?',
    answer: 'Open the provider list, tap the provider with a badge, and review unpaid sessions grouped by request. Each entry shows hours and amounts due.',
  },
  {
    persona: 'client',
    category: 'payments',
    question: 'How do I mark a payment as completed?',
    answer: 'Select the request, tap Mark as Paid, choose the method (cash, Zelle, etc.), and confirm. TrackPay updates the provider instantly.',
  },
  {
    persona: 'client',
    category: 'payments',
    question: 'Can I pay only part of the amount now?',
    answer: 'Partial payments aren\'t supported yet. Contact your provider to coordinate adjustments and have them reissue a request once ready.',
  },
  {
    persona: 'client',
    category: 'payments',
    question: 'What if the amount looks higher than expected?',
    answer: 'Review the session list for crew size or extended time. If it still seems incorrect, reach out to the provider or email TrackPay support with the request ID.',
  },

  // General
  {
    persona: 'client',
    category: 'general',
    question: 'How do I contact TrackPay for help?',
    answer: 'Tap the hamburger menu, choose Contact, and select Email Support. A draft opens with your app version included automatically.',
  },
  {
    persona: 'client',
    category: 'general',
    question: 'How can I share TrackPay with other families?',
    answer: 'Use the Share option in the hamburger menu to send a pre-written message with the TrackPay link.',
  },
  {
    persona: 'client',
    category: 'general',
    question: 'Where do I find app updates or new features?',
    answer: 'Check the Activity Feed announcements section or read our release notes linked from the Contact screen footer.',
  },
  {
    persona: 'client',
    category: 'general',
    question: 'How do I switch between multiple providers?',
    answer: 'The provider list shows all active providers. Tap any card to dive into their sessions, payments, and activity history.',
  },
  {
    persona: 'client',
    category: 'general',
    question: 'What should I do if my provider stops appearing in the list?',
    answer: 'Refresh the screen to pull the latest data. If they still don\'t show up, contact the provider or email support so we can confirm the relationship status.',
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
