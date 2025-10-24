# TrackPay Hamburger Navigation & Support Hub Spec

## 1. Summary
Add a shared hamburger menu for provider and client experiences. The menu provides quick access to Help (FAQ), Contact, and Share screens, standardises support content (English & Spanish), and introduces instrumentation for navigation actions.

## 2. Goals & Non-Goals
- **Goals**
  - Provide a left-aligned hamburger entry point on the primary client provider list and provider dashboard screens.
  - Deliver role-aware Help content with curated FAQs (English + Spanish inline).
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
2. As a client/provider, I want FAQs in English and Spanish so I can self-serve answers.
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
- Title: “Help & FAQs” (role variants: “Client Help & FAQs” / “Provider Help & FAQs”).
- Optional hero copy: “Answers to common questions.”
- Sections per category: Sessions, Invites, Payments, General.
- Each FAQ entry renders English question & answer followed by Spanish translation. Use stacked layout or collapsible per pair.
- Initial FAQ set:

| Category | Question (EN) | Answer (EN) | Pregunta (ES) | Respuesta (ES) |
| --- | --- | --- | --- | --- |
| Sessions | How do I start or stop a session? | Open the client, tap “I’m Here” to start and “I’m Done” to finish. | ¿Cómo comienzo o termino una sesión? | Abre el cliente, toca “Estoy aquí” para iniciar y “Ya terminé” para finalizar. |
| Sessions | How can I change the hourly rate for a client? | Go to the client profile, edit the rate, and save. | ¿Cómo cambio la tarifa por hora de un cliente? | Ve al perfil del cliente, ajusta la tarifa y guarda. |
| Invites | How do I invite a client or provider? | Use the Invite button to generate a code and share via message or email. | ¿Cómo invito a un cliente o proveedor? | Usa el botón de invitación para generar un código y compártelo por mensaje o correo. |
| Invites | What if my client never accepts the invite? | Resend the invite or contact support to revoke and create a new one. | ¿Qué pasa si mi cliente no acepta la invitación? | Reenvía la invitación o contacta soporte para revocarla y crear una nueva. |
| Payments | How do I mark payments as complete? | Open the session list, select unpaid sessions, and tap “Mark as Paid.” | ¿Cómo marco los pagos como completados? | Abre la lista de sesiones, selecciona las pendientes y toca “Marcar como pagado.” |
| Payments | Something looks inaccurate—what should I do? | Pause activity and email support with session details. | Algo no es correcto, ¿qué hago? | Detén la actividad y envía un correo a soporte con los detalles. |
| General | How do I share the app with others? | Use the Share option in the menu to send the referral message. | ¿Cómo comparto la app con otros? | Usa la opción Compartir en el menú para enviar el mensaje de recomendación. |
| General | How can I get help with a problem? | Visit Contact in the menu to email our team. | ¿Cómo obtengo ayuda con un problema? | En el menú, toca Contacto para enviarnos un correo. |

- Extendable with additional entries; copy managed through `simpleT`.
- Analytics: `E.SCREEN_VIEW_HELP` with `{ role, faq_count }`.

### 5.3 Contact Screen
- Title: “Contact TrackPay” / “Contacto TrackPay”.
- Friendly body copy inviting feedback.
- Primary button: “Email Support” -> `mailto:` link using env var `EXPO_PUBLIC_SUPPORT_EMAIL` (default `hello@trackpay.com`).
  - Subject: `TrackPay Support Request`.
  - Body template:
    ```
    Hi TrackPay Team,

    [User message here]

    App version: <injected version>
    ```
  - Use Expo `Constants.expoConfig?.version` or `expo-application` helper.
- Secondary section showing raw support email for manual copy.
- Analytics: `E.CONTACT_EMAIL_TAPPED` with `{ role }`.

### 5.4 Share Screen
- Title: “Spread the Word” / “Comparte TrackPay”.
- Copy emphasising benefits of sharing.
- Primary button triggers native share sheet (`Share.share`) with message:
  > “TrackPay helps me stay on top of sessions and payments. Try it: https://trackpay.app”
- Fallback if share unsupported: copy message to clipboard and display toast.
- Analytics: `E.SHARE_INTENT_TRIGGERED` with `{ role }`.

## 6. Technical Requirements
- **Navigation**
  - Add menu button to relevant stack navigators (client provider list, provider dashboard).
  - Register `HelpScreen`, `ContactScreen`, `ShareScreen` routes.
  - Implement modal presentation for the menu (React Navigation native stack or custom modal).
- **Environment Config**
  - Add `EXPO_PUBLIC_SUPPORT_EMAIL` to `.env.sample`, `.env.development`, `.env.staging`, `.env.production`.
  - Provide fallback default in code if env missing.
- **Localization**
  - Extend `simpleT` dictionaries with new keys (English + Spanish).
  - Roll out bilingual FAQ copy as static data until dynamic i18n is ready.
- **Analytics**
  - Use PostHog wrapper; ensure events include role context and screen names.
- **App Version Retrieval**
  - Implement helper `getAppVersion()` returning semver string for contact body.
- **Accessibility & QA**
  - Ensure headings announced by screen readers, buttons accessible labels.
  - Manual tests: open/close menu, each screen, mailto on device, share sheet.
  - Confirm bilingual text renders correctly (especially on narrow devices).

## 7. Copy & Content Ownership
- Product/design to validate final English copy.
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
