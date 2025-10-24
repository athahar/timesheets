# TrackPay Hamburger Navigation & Support Hub Spec

## 1. Summary
Add a shared hamburger menu for provider and client experiences. The menu provides quick access to Help (FAQ), Contact, and Share screens, standardises support content, and introduces instrumentation for navigation actions.

## 2. Goals & Non-Goals
- **Goals**
  - Provide a left-aligned hamburger entry point on the primary client provider list and provider dashboard screens.
  - Deliver role-aware Help content with curated FAQs.
  - Supply a Contact screen with mailto handoff including app version and configurable support email.
  - Encourage organic adoption via Share screen messaging.
  - Emit analytics for menu usage and screen entry.
- **Non-Goals**
  - Redesign provider list card layout (handled separately).
  - Modify downstream session or payment workflows.
  - Implement chatbot or dynamic FAQ search (future work).
  - Replace existing invite/share flows outside the hamburger entry point.

## 3. User Personas & Entry Points
- **Clients**: land on `ServiceProviderListScreen`. Hamburger sits in the app header, opening a full-screen nav sheet.
- **Providers**: hamburger mirrors placement on provider dashboard/home. Help content adjusts to provider-specific FAQs.
- Both personas access the same Contact and Share screens (copy variations allowed via role-aware strings).

## 4. User Stories
1. As any user, I want a consistent menu to reach support resources from primary screens.
2. As a client/provider, I want role-aware FAQs so I can self-serve answers.
3. As a user needing assistance, I want to email support with context (including app version) without drafting from scratch.
4. As an advocate, I want a simple way to share TrackPay with others.

## 5. Functional Requirements

### 5.1 Global Hamburger Menu
- Left-aligned icon button in navigation header (Feather `menu` icon).
- Pressing opens full-screen modal with the following items:
  1. Help
  2. Contact
  3. Share
- Modal is dismissible via close button or swipe. Include “Cancel” option.
- Accessibility: `accessibilityLabel="Open menu"`, menu items announced as buttons.
- Analytics:
  - `E.MENU_OPENED` with `{ role, screen }`.
  - `E.MENU_OPTION_SELECTED` with `{ role, option }`.

### 5.2 Help Screen (Full Screen)
- **Title copy**
  - Client: “Help & FAQs”
  - Provider: “Help & FAQs”
- **Hero tagline**: “Answers to your most common TrackPay questions.”
- **Section headers**
  - Sessions
  - Invites
  - Payments
  - General
- **Intro paragraph**
  - Client: “Browse quick answers tailored for clients. Need more help? Reach out from the Contact tab.”
  - Provider: “Browse quick answers tailored for providers. Need more help? Reach out from the Contact tab.”
- **FAQ body**: render entries from `docs/spec/hamburger/hamburger-faqs.md` filtered by persona and category order above.
- **Empty state copy**: “We’re adding more tips soon. Email support if you don’t see your question.”
- **Analytics**: track `E.SCREEN_VIEW_HELP` with `{ role, faq_count }`.

### 5.3 Contact Screen
- **Title copy**: “Contact TrackPay”
- **Hero message**: “We’d love to hear from you.”
- **Body paragraph**: “Send us a note with any questions, feedback, or ideas. Our team usually replies within one business day.”
- **Primary CTA button**
  - Label: “Email Support”
  - Action: `mailto:` using `EXPO_PUBLIC_SUPPORT_EMAIL` (default `hello@trackpay.com`) with subject `TrackPay Support Request` and body:
    ```
    Hi TrackPay Team,

    [Please describe your question or issue here.]

    App version: <injected version>
    ```
- **Secondary details**: display the support email as selectable text with copy-to-clipboard affordance.
- **Footer note**: “Include screenshots when possible so we can help faster.”
- **Analytics**: track `E.CONTACT_EMAIL_TAPPED` with `{ role }`.

### 5.4 Share Screen
- **Title copy**: “Spread the Word”
- **Hero message**: “Help other families and providers discover TrackPay.”
- **Body paragraph**: “Share your referral message below or send it through your favourite app. Every introduction helps us support more relationships.”
- **Primary CTA button**
  - Label: “Share TrackPay”
  - Action: invoke `Share.share` with message `TrackPay helps me stay on top of sessions and payments. Try it: https://trackpay.app`
- **Secondary action**: show the referral message in a text box with copy-to-clipboard icon for manual sharing.
- **Fallback copy** (share unsupported): “Copy the message above and paste it wherever you like to share.”
- **Analytics**: track `E.SHARE_INTENT_TRIGGERED` with `{ role }`.

## 6. Technical Requirements
- **Navigation**
  - Add menu button to relevant stack navigators (client provider list, provider dashboard).
  - Register `HelpScreen`, `ContactScreen`, `ShareScreen` routes.
  - Implement modal presentation for the menu (React Navigation native stack or custom modal).
- **Environment Config**
  - Add `EXPO_PUBLIC_SUPPORT_EMAIL` to `.env.sample`, `.env.development`, `.env.staging`, `.env.production`.
  - Provide fallback default in code if env missing.
- **Localization**
  - Extend `simpleT` dictionaries with new keys using the English copy defined in this spec.
  - Future translations can reuse the same keys when they are prepared.
- **Analytics**
  - Use PostHog wrapper; ensure events include role context and screen names.
- **App Version Retrieval**
  - Implement helper `getAppVersion()` returning semver string for contact body.
- **Accessibility & QA**
  - Ensure headings announced by screen readers, buttons accessible labels.
  - Manual tests: open/close menu, each screen, mailto on device, share sheet.
  - Confirm FAQ content renders correctly (especially on narrow devices).

## 7. Copy & Content Ownership
- Spanish translations reviewed by bilingual contributor before release.
- Future chatbot integration can reuse FAQ data structure.

## 8. Rollout Plan
1. Implement shared menu component and inject into target stacks.
2. Build Help, Contact, Share screens with env/config support.
3. Populate FAQs and translations; review with stakeholders.
4. QA across platforms (iOS/Android, light/dark, small/large text).
5. Verify analytics events in staging.
6. Update release notes/documentation to highlight new support access.

## 9. Risks & Mitigations
- **Incomplete translations** – track in issue tracker; block release until reviewed.
- **Mailto limitations** – show fallback text when mail app not configured.
- **Share sheet unsupported** – default to copy-to-clipboard plus toast.
- **Menu creep** – limit initial options to three; revisit if future items needed.

## 10. Acceptance Criteria
- Hamburger menu visible and functional for both clients and providers.
- Help/Contact/Share screens match spec, support bilingual copy, and emit analytics events.
- Support email configurable via env and mailto body includes app version.
- Share sheet launches with predefined message/link (with fallback).
- All screens pass basic accessibility checks (VoiceOver/TalkBack).
