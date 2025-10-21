# TrackPay UX Redesign Specification - Muted Mobile Utility

## 🎯 Redesign Goals

Transform TrackPay into a **friendly, muted mobile utility app** with approachable design that emphasizes money amounts while keeping everything else quiet. Focus on professional appearance, clear visual hierarchy, and intuitive interactions while maintaining all existing functionality.

## 🎨 Design System - Muted Palette

### Core Philosophy
- **Muted, approachable palette** with soft neutrals and fresh green accent
- **Big money numbers** - everything else quiet and subdued
- **No action buttons inside rows** - use status pills instead
- **Cards over blocks** - white cards with thin borders and generous spacing
- **Calm, professional appearance** that service workers trust

### Color Palette

#### Brand & Accents
- **Green**: `#22C55E` (primary accent for money/confirm)
- **Teal**: `#2DD4BF` (active timer accent)
- **Amber**: `#F59E0B` (due/warning states)
- **Red**: `#EF4444` (destructive actions)
- **Purple**: `#6D28D9` (requested states)

#### Neutral Grays
- **Ink**: `#111827` (primary text)
- **Slate 600**: `#4B5563` (secondary text)
- **Slate 500**: `#6B7280` (tertiary text)
- **Slate 400**: `#9AA1A9` (disabled text)
- **Slate 300**: `#D1D5DB` (borders)
- **Slate 200**: `#E5E7EB` (dividers)
- **Slate 100**: `#F3F4F6` (subtle backgrounds)
- **Slate 50**: `#F8F9FB` (app background)

#### Status Pills
- **Paid**: Green background (`#ECFDF5`) with dark green text (`#047857`)
- **Due**: Amber background (`#FFFBEB`) with dark amber text (`#B45309`)
- **Requested**: Purple background (`#F3E8FF`) with purple text (`#6D28D9`)
- **Active**: Teal background (`#E6FFFA`) with dark teal text (`#0F766E`)

### Typography Scale
- **Large**: 28px/semibold - Money amounts, major values
- **Title**: 22px/semibold - Section headers, page titles
- **Body**: 16px/regular - Standard content, client names
- **Small**: 13px/medium - Pills, secondary info, metadata

### Spacing & Layout
- **Card radius**: 16px for generous, friendly appearance
- **Pill radius**: 10px for compact status indicators
- **Button radius**: 12px for interactive elements
- **Spacing**: 4px, 8px, 12px, 16px, 20px, 24px, 32px grid system

### Visual Enhancements
- **Subtle shadows** - Light depth without heaviness (opacity 0.05)
- **Status pills** - Single pill per row, clear semantic meaning
- **Active session highlight** - Teal left border (4px width)
- **Touch targets** - Minimum 44px for accessibility
- **AA contrast** - All text meets accessibility standards

## 📱 Phase 1: Clients List Screen (✅ COMPLETED)

### New Visual Structure
- **Top Navigation**: Username + green "+" icon for add client + logout
- **Total Outstanding Card**: Compact summary with 28px green amount (or $0.00 + ✅)
- **Client Cards**: White cards, 16px radius, thin borders, generous 16px padding
- **Status Pills**: Single pill per row - "Paid up", "Due $X", "Requested"
- **Active Sessions**: Teal left border + "Active • 00:12:45" chip under hourly rate
- **No Action Buttons**: Removed "Request Payment" buttons from list rows

### Key Features Implemented
- **Muted Color Palette**: Soft grays with green accent throughout
- **Money Emphasis**: Green color for all financial amounts
- **Status Pills**: Clear semantic pills instead of buttons
- **Active Session Tracking**: Visual-only highlight with timer display
- **Compact Navigation**: "+" icon instead of full-width add button
- **Professional Cards**: 16px radius with subtle shadows
- **Touch Feedback**: Proper accessibility with 44px+ touch targets

### Visual QA Checklist
- [x] **Muted Background**: Soft gray (`#F8F9FB`) instead of harsh white
- [x] **Green Money**: All amounts use green accent (`#22C55E`)
- [x] **Status Pills**: Semantic colors with proper contrast
- [x] **No Row Buttons**: Clean list with pills only
- [x] **Active Highlighting**: Teal border for active sessions
- [x] **Top-bar Add**: Green "+" icon in navigation
- [x] **Card Design**: 16px radius with thin borders
- [x] **Typography Hierarchy**: Clear size/weight relationships

### Implementation Details
- Updated `src/styles/theme.ts` with complete muted palette system
- Redesigned `src/screens/SimpleClientListScreen.tsx` with new visual structure
- Implemented status pill system with semantic colors
- Added active session detection and visual highlighting
- Maintained all existing functionality and navigation patterns
- Added backwards compatibility for existing theme tokens

## 📱 Phase 2: Client Detail Screen (✅ COMPLETED)

### Design Requirements
Transform ClientHistoryScreen.tsx into a professional, trustworthy interface using muted design tokens while preserving all functionality.

#### Core Visual Principles
- **Active Session Banner**: White card with 3px teal left strip (no mint background)
- **Professional Timer**: 32px, weight 700, tabular numerals, left-aligned with 12px bottom margin
- **Strong Danger Button**: Red background, full-width, height 48px, darkens on press
- **Three Button Variants**: Primary (green), Secondary (white/border), Danger (red) with interactive states
- **Clean Card Design**: 1px borders replace shadows, 16px radius consistently
- **16px Grid System**: Page padding 16, section gaps 16, button gaps 12
- **Status Pills**: Single line with ellipsis, consistent 8/12 padding, 10px radius
- **Typography Hierarchy**: Money amounts green, timer stable with tabular nums

#### Enhanced Theme Tokens Required
```typescript
// Button variants with interactive states
btnPrimaryBg: '#22C55E',         btnPrimaryText: '#FFFFFF',
btnDangerBg: '#EF4444',          btnDangerText: '#FFFFFF',
btnSecondaryBg: '#FFFFFF',       btnSecondaryText: '#111827',       btnSecondaryBorder: '#E5E7EB',

// Press states
btnPrimaryBgPressed: '#16A34A',  btnDangerBgPressed: '#DC2626',     btnSecondaryBorderPressed: '#D1D5DB',

// Disabled states
btnDisabledBg: '#F3F4F6',        btnDisabledText: '#9AA1A9',        btnDisabledBorder: '#E5E7EB',
```

#### Implementation Checklist
- [x] Document phase requirements in APP_UX_REDESIGN.md
- [x] Extend theme.ts with button states (primary/secondary/danger + pressed/disabled)
- [x] Update ClientHistoryScreen.tsx with muted design tokens
- [x] Replace shadows with 1px borders throughout
- [x] Implement Pressable buttons with proper interactive feedback
- [x] Apply 16px grid spacing system
- [x] Ensure AA contrast compliance (no mint-on-mint)
- [x] Add text overflow handling for pills (numberOfLines={1}, ellipsizeMode="tail")
- [x] Visual verification against design requirements
- [x] Functional testing (zero behavioral changes)

#### Success Criteria
- **Professional Appearance**: End Session looks strong and clickable (red, not washed out)
- **Timer Stability**: Large, dark, stable display (no jitter from tabular numerals)
- **Design Consistency**: All cards use consistent borders (#E5E7EB) and radius (16px)
- **Button System**: Three variants only, with proper press states that darken backgrounds
- **Functional Preservation**: Zero regressions - identical behavior to current implementation
- **User Trust**: Professional appearance suitable for daily use by service workers

#### Key Visual Improvements
- **No mint-on-mint**: Active session banner uses white background with teal accent strip
- **Strong contrast**: Danger button uses solid red background, not pale pink
- **Interactive feedback**: Buttons provide clear visual response on press

---

## 📋 Phase 4: Provider Timeline Enhancement (Pending)

### Task: Add Day Headers to Provider-Side Timeline

**Priority**: Medium - Visual Consistency
**Target**: ClientHistoryScreen.tsx (provider viewing client)
**Goal**: Match the clean day-grouped timeline design implemented in client view

#### Implementation Requirements
- Add day headers ("Today", "Yesterday", weekday formatting) to provider timeline
- Group timeline entries by day like ServiceProviderSummaryScreen
- Maintain simplified activity labels ("Work session", "Payment sent")
- Keep muted design system consistency
- Use same dayHeader styling (#374151, weight 600, border separator)

#### Implementation Checklist
- [ ] Extract timeline grouping logic from ServiceProviderSummaryScreen
- [ ] Add groupedTimeline useMemo to ClientHistoryScreen
- [ ] Implement day header rendering with date formatting
- [ ] Add dayHeader and dayHeaderText styles
- [ ] Test timeline with mixed activity types
- [ ] Verify responsive behavior

**Context**: Client side now has superior timeline UX with day headers. Provider side should match this design quality for consistency.
- **Typography hierarchy**: Money amounts prominent in green, everything else appropriately subdued
- **Clean aesthetics**: Border-based design eliminates heavy shadows

### Phase 2.1: Visual Refinements (✅ COMPLETED)

#### Summary Card Consolidation ✅
- **Problem Solved**: Reduced "boxiness" by consolidating stats with payment action
- **User Benefit**: Money amount and payment action stay together, reducing visual scanning
- **Implementation**: Single Summary card with two stat rows and inline "Request $X" button
- **Idempotency Guards**: Shows "Requested on Sep 22 • $633.50 pending" when request exists

#### Timeline Color Logic Fix ✅
- **Problem Solved**: All amounts showed green (implying "paid") regardless of status
- **New Logic**:
  - Paid rows: Green amount + green "Paid" pill
  - Unpaid rows: Default text color + amber "Unpaid" pill
  - Active rows: Default color + teal "Active" pill
- **Benefit**: Colors reinforce payment status semantically

#### Timeline Consolidation Logic ✅
- **Smart Grouping**: Multiple sessions on same day are consolidated into single timeline entry
- **Clear Metadata**: Shows "3 sessions • 8hr 30min" for consolidated entries
- **Status Aggregation**: Properly determines consolidated status (active > requested > paid > unpaid)
- **Better UX**: Reduces visual clutter while preserving all information

#### Bulletproof Payment Request Flow ✅
- **Confirmation Modal**: Accessible modal with focus management and keyboard navigation
- **Idempotency Guards**: Prevents duplicate requests with race condition protection
- **Batch Tracking**: Uses generateBatchId() for deterministic request grouping
- **Toast Notifications**: User-friendly feedback instead of alert dialogs
- **Error Handling**: Comprehensive error states with helpful messaging

#### Visual Design System Consistency ✅
- **16px Grid System**: Consistent spacing throughout (borders, margins, padding)
- **Theme Token Usage**: All colors and spacing use centralized design tokens
- **Typography Hierarchy**: Proper font sizes and weights for information hierarchy
- **Border Treatment**: Consistent 1px borders (#E5E7EB) and 16px radius throughout
- **Interactive States**: Proper Pressable feedback with theme-based press states

#### Accessibility & UX Polish ✅
- **Focus Management**: Modal automatically focuses confirm button for screen readers
- **Touch Targets**: All interactive elements meet 44px minimum requirement
- **Text Overflow**: Pills and text handle long content with ellipsis
- **Color Contrast**: All text meets AA accessibility standards
- **Loading States**: Clear loading indicators during async operations

### Implementation Files Created/Updated ✅
- **theme.ts**: Added comprehensive design tokens with interactive button states
- **formatters.ts**: Created currency, time, and date formatting utilities with locale support
- **storageService.ts**: Extended with payment request service functions and API
- **ConfirmationModal.tsx**: Accessible modal component with focus management
- **Toast.tsx & useToast.ts**: Professional toast notification system
- **ClientHistoryScreen.tsx**: Complete redesign with muted design system
- **StatusPill.tsx**: Updated with consistent spacing and overflow handling

## 🔄 Future Phases (OPTIONAL)

### Phase 3: Session Tracking Screen
- **Large Timer Display**: Prominent with teal accent for active state
- **Current Value Card**: Real-time earnings with green money colors
- **Muted Action Buttons**: "I'm Here"/"I'm Done" with professional styling
- **Status Integration**: Consistent with list screen pill design

### Phase 4: Additional Screens
- **Client Profile**: Detailed history with muted design language
- **Payment Forms**: Clean, professional form design
- **Settings**: Consistent muted palette throughout

## 🎨 Component Library

### StatusPill Component
```typescript
interface PillProps {
  type: 'paid' | 'due' | 'requested' | 'active';
  amount?: number;
  time?: string;
}
```

### Theme Structure
```typescript
export const theme = {
  color: {
    appBg: '#F8F9FB',
    cardBg: '#FFFFFF',
    text: '#111827',
    accent: '#22C55E',
    pillPaidBg: '#ECFDF5',
    // ... complete muted palette
  },
  radius: { card: 16, pill: 10, button: 12 },
  space: { x8: 8, x16: 16, x24: 24 },
  font: { large: 28, title: 22, body: 16, small: 13 }
}
```

## 📊 Success Metrics

### Visual Quality Achieved
- **Professional Appearance**: Muted, trustworthy design language
- **Clear Hierarchy**: Money amounts prominent, everything else subdued
- **Consistent Design**: Cohesive muted palette throughout
- **High Legibility**: AA contrast standards maintained

### User Experience Improvements
- **Reduced Visual Noise**: No action buttons cluttering list rows
- **Clear Status Communication**: Semantic pills with obvious meaning
- **Quick Money Recognition**: Green color makes amounts immediately scannable
- **Calm Interactions**: Muted palette reduces visual stress

### Technical Implementation
- **Backwards Compatible**: Existing components still work
- **Design System**: Comprehensive theme tokens for future screens
- **Accessibility**: 44px+ touch targets, proper contrast ratios
- **Performance**: Efficient styling with minimal re-renders

## 🔧 Implementation Notes

### Design Tokens Usage
```typescript
// New muted theme tokens
backgroundColor: theme.color.appBg,     // #F8F9FB
borderColor: theme.color.border,       // #E5E7EB
textColor: theme.color.text,           // #111827
accentColor: theme.color.accent,       // #22C55E

// Status pills
pillBg: theme.color.pillPaidBg,        // #ECFDF5
pillText: theme.color.pillPaidText,    // #047857
```

### Key Principles Applied
- **Money stands out** - Green accent draws eye to financial amounts
- **Everything else quiet** - Muted grays for non-essential content
- **Single source of truth** - One status pill per client row
- **Visual calm** - Reduced contrast and visual noise
- **Professional trust** - Clean, sophisticated appearance

---

## 📋 Current Status

**Phase 1 Complete**: Clients List Screen ✅
**Phase 2 Complete**: Client Detail Screen ✅
**Phase 2.1 Complete**: Final Refinements ✅

The TrackPay app now features a complete, bulletproof Client Detail screen with:

### ✅ **Core UX Improvements**
- **Consolidated Summary Card** with idempotency guards and request metadata
- **Smart Timeline Consolidation** that groups sessions by date with proper status aggregation
- **Bulletproof Payment Flow** with confirmation modal and comprehensive error handling
- **Professional Toast System** replacing intrusive alert dialogs
- **Accessible Design** with focus management and screen reader support

### ✅ **Design System Maturity**
- **16px Grid Consistency** throughout all spacing and layout decisions
- **Comprehensive Theme Tokens** for colors, typography, spacing, and interactive states
- **Muted Professional Palette** that emphasizes money amounts while keeping everything else quiet
- **Interactive Feedback** with proper Pressable states and visual responsiveness
- **Border-based Design** eliminating heavy shadows for clean, modern appearance

### ✅ **Technical Excellence**
- **Type-safe Formatting** utilities with Intl.NumberFormat and locale support
- **Race Condition Protection** preventing duplicate payment requests
- **Service Integration** leveraging existing Supabase trackpay_requests infrastructure
- **Error Boundary Ready** components with comprehensive error handling
- **Performance Optimized** with proper memoization and efficient re-renders

**Design Philosophy Achieved**: Transformed from bold, colorful interface to calm, professional mobile utility that service workers trust and enjoy using daily. The Client Detail screen now provides bulletproof functionality with an approachable, muted design that puts money amounts front and center.

**Next Steps**: Phase 3 client-side redesign to complete the full TrackPay UX transformation.

## 📱 Phase 3: Client-Side UX Redesign (✅ COMPLETED)

### Design Requirements
Transform client-side screens (ServiceProviderListScreen, ServiceProviderSummaryScreen, MarkAsPaidModal) to match the newly completed provider-side design using the muted design system with smart dual payment flow.

#### Core Visual Principles
- **Responsive Summary Card**: 380dp breakpoint with inline/stack layout behavior
- **Smart Dual Payment Flow**: "Pay full" vs "Pay requested" options with dynamic CTA labels
- **Timeline Consistency**: Simplified labels (Work started/done, Money requested/received) with icons on every row
- **Muted Design System**: Apply same professional palette and spacing as provider side
- **Button Logic Cleanup**: Remove all disabled states, pure hide/show logic for Request buttons

#### Enhanced Features Required
```typescript
// Responsive summary card layout
const isWideLayout = screenWidth >= 380;
const summaryLayout = isWideLayout ? 'inline' : 'stacked';

// Dual payment modal options
interface PaymentOption {
  type: 'full' | 'requested';
  amount: number;
  label: string;
  description: string;
}

// Timeline label standardization
type TimelineLabel = 'Work started' | 'Work done' | 'Money requested' | 'Payment received';
```

#### Implementation Checklist
- [x] Update APP_UX_REDESIGN.md with Phase 3 requirements
- [x] Apply muted design tokens to ServiceProviderSummaryScreen
- [x] Implement responsive summary card with 380dp breakpoint
- [x] Redesign MarkAsPaidModal with dual payment flow
- [x] Update ServiceProviderListScreen with muted palette
- [x] Fix provider-side Request button logic (remove disabled states)
- [x] Implement post-payment state management
- [x] Add tabular numerals to all numeric displays
- [x] Apply 16px spacing grid throughout
- [x] Replace shadows with 1px borders
- [x] Timeline consolidation with proper icons
- [x] Visual verification and cross-flow testing

#### Success Criteria
- **Visual Consistency**: Client screens match provider screens in professional design language
- **Smart Payment Flow**: Modal offers contextual options (full vs requested) with proper validation
- **Responsive Design**: Summary card adapts correctly at 380dp breakpoint
- **State Management**: Provider buttons show/hide correctly after client payments
- **Design System**: Consistent muted palette, spacing grid, and typography throughout
- **User Trust**: Professional appearance suitable for daily use by both providers and clients

#### Key Visual Improvements
- **Muted Professional Palette**: Soft grays (#F8F9FB, #E5E7EB) with green accent (#22C55E)
- **Border-based Design**: 1px borders replace heavy shadows for clean, modern appearance
- **Interactive Feedback**: Contextual payment options with clear visual states
- **Typography Hierarchy**: Tabular numerals on all amounts, proper font weight relationships
- **Responsive Behavior**: Summary card layout adapts gracefully to screen width

### Phase 3.1: Client Detail Screen Redesign ✅

#### ServiceProviderSummaryScreen Updates ✅
- **Responsive Summary Card**: 380dp breakpoint with inline balance + button (wide) or stacked (narrow)
- **Smart Payment States**: Show "Pay $X" button OR pending meta "Payment requested on {date} • $X pending"
- **Active Session Hint**: "Active session time isn't included. End session to add it." when applicable
- **Timeline Redesign**: Day headers with individual session entries using simplified labels
- **Muted Design System**: Applied theme.color tokens, 1px borders, 16px spacing grid
- **Tabular Numerals**: fontVariant: ['tabular-nums'] on all amounts, times, durations

#### MarkAsPaidModal Redesign ✅
- **Dual Payment Options**: Radio selection between "Pay full {total}" and "Pay requested {amount}"
- **Dynamic CTA Labels**: "Mark as Paid – {amount}" mirrors selected option
- **Validation Guards**: Amount validation, edge case handling for request > outstanding
- **Professional Design**: Muted color palette, focus management, loading states
- **Accessibility**: Focus trap, ESC close, screen reader support, proper button labeling

#### Timeline Rules Implementation ✅
- **Standardized Labels**: Work started / Work done / Money requested / Payment received only
- **Consistent Icons**: 🕒 work, 📤 requested, 💰 received on every row
- **Session Formatting**: "8:44–9:57 pm — 1hr 13min — $121.67" for completed work
- **Active Sessions**: "Work started • Sep 22, 2025 at 9:01 AM (active)" with no amount
- **Batch Consolidation**: "Money requested — $633.50 • 8 sessions • Sep 22, 2025"
- **Remove Purple Pills**: No status pills on work rows, clean timeline presentation

### Phase 3.2: Provider List & State Management ✅

#### ServiceProviderListScreen Updates ✅
- **Muted Design System**: Applied soft backgrounds, professional card design
- **Status Chip Logic**: Max 2 chips, priority Active → Due $X → Requested → Paid up
- **Border Treatment**: 1px borders replace shadows, 16px radius consistently
- **Typography**: Tabular numerals on amounts, proper hierarchy throughout
- **16px Grid**: Consistent spacing for professional appearance

#### Provider-Side Button Logic Fix ✅
- **Remove Disabled States**: Pure hide/show logic for Request buttons
- **Show Conditions**: lastPendingRequest == null AND unpaidUnrequestedCents > 0
- **Hide + Meta**: Display pending meta when request exists
- **Hide + Paid Up**: Show paid state when no outstanding balance
- **Post-Payment Handling**: Correct state updates after full vs requested-only payments

#### State Management Integration ✅
- **Centralized Money State**: getClientMoneyState() used by both list and detail screens
- **Screen Focus Refresh**: Re-fetch data to ensure current state display
- **Cross-Flow Consistency**: Provider and client views stay synchronized
- **Payment Result Handling**: Proper state transitions for full vs partial payments

### Implementation Files Created/Updated ✅
- **APP_UX_REDESIGN.md**: Added comprehensive Phase 3 documentation
- **ServiceProviderSummaryScreen.tsx**: Complete responsive redesign with muted design system
- **MarkAsPaidModal.tsx**: Smart dual payment flow with validation and accessibility
- **ServiceProviderListScreen.tsx**: Muted design system application
- **ClientHistoryScreen.tsx**: Request button logic cleanup and state management fixes

## 🔄 Phase 4: Professional Home & Auth Experience ⚡

### Phase 4.1: Design System Foundation
**Objective**: Transform the authentication and onboarding experience with a professional, neutral design that builds trust from first interaction.

#### Design Direction
- **Tone**: Neutral, friendly, professional
- **Style**: Soft neutrals, rounded corners (12-16px), light borders instead of heavy shadows
- **Motion**: Gentle fade/slide animations (150-200ms)
- **USP**: "Track hours. Request payment. Get paid faster."

#### Extended Theme Tokens
```typescript
color: {
  appBg: '#F7F8FA',
  cardBg: '#FFFFFF',
  border: '#E6E8EB',
  text: '#111827',
  textSecondary: '#6B7280',
  brand: '#22C55E',
  brandPressed: '#16A34A',
  focusRing: 'rgba(34,197,94,0.25)',

  // Button system
  btnPrimaryBg: '#22C55E',
  btnPrimaryText: '#FFFFFF',
  btnSecondaryBg: '#FFFFFF',
  btnSecondaryText: '#111827',
  btnSecondaryBorder: '#E6E8EB',
  btnLinkText: '#10B981',
},
radius: { card: 16, button: 12 },
space: { 4: 4, 8: 8, 12: 12, 16: 16, 24: 24 }
```

### Phase 4.2: Welcome Screen Redesign
**Layout**: Two-row hero stack with feature grid

#### Hero Section
- **H1**: "Track hours. Request payment. Get paid faster."
- **Subhead**: "Simple time & billing for house cleaners, babysitters, dog walkers, tutors, and other local services."
- **Hero Icon**: Centered circular container (120-160px) with soft background
- **CTA Priority**:
  1. "Create Account" (primary button)
  2. "Sign In" (secondary button)
  3. "Have an invite code?" (tertiary link)

#### Feature Grid (3-up desktop, stacked mobile)
- **⏱ One-tap timer** — Start/stop work with a single tap
- **📊 Clear balances** — See who owes what at a glance
- **📨 Instant requests** — Send a payment request in seconds

#### Micro-benefits Strip
"Mobile-friendly • No complex setup • Free to try"

#### Visual Implementation
- **Icons**: @expo/vector-icons Feather icons (watch, bar-chart-2, send at 32px)
- **Icon Containers**: 40px soft circles with pillBg background
- **Animations**: Fade + 20px slide-up (~180ms) on hero and feature grid
- **Typography**: Max-width ~28-32ch on subhead for optimal line wrapping

### Phase 4.3: Auth Screen Standardization

#### Shared Design Patterns
- **Header**: "← Back" text link (preserve existing handlers)
- **Form Styling**: White background inputs, 1px border, 12px radius, visible labels
- **Focus States**: 3px focusRing on all interactive elements
- **Button Heights**: 48px minimum, full width on mobile
- **Spacing**: 16px between controls, 24px section gaps

#### Screen-Specific Copy & Features

**LoginScreen.tsx**
- H1: "Welcome back"
- Helper: "Sign in to your TrackPay account"
- Primary: "Sign In" button with loading states
- Links: "Forgot password?" | "Don't have an account? Create Account"

**RegisterScreen.tsx**
- H1: "Create your account"
- Helper: "Track your time and get paid faster"
- Account type cards: 2px green border when selected
- Primary: "Create Account" button with loading states

**ForgotPasswordScreen.tsx**
- H1: "Reset password"
- Helper: "We'll email you a reset link"
- Standard form styling with new design tokens

**InviteClaimScreen.tsx**
- H1: "Join your workspace"
- Helper: "Enter the invite code you received"
- **Special Input**: monospace, auto-uppercase, letterSpacing: 2, auto-advance on paste
- Helper footer: "Don't have one? Ask your service provider."

### Phase 4.4: Enhanced Button Component

#### Button Variants (extend existing component)
- **Primary**: bg btnPrimaryBg, text btnPrimaryText, pressed → brandPressed
- **Secondary**: bg btnSecondaryBg, border btnSecondaryBorder, text btnSecondaryText
- **Link**: transparent, text btnLinkText, underline on press

#### Button States
- **Default**: Standard styling per variant
- **Pressed**: Color changes for visual feedback
- **Disabled**: Reduced opacity with spinner for loading states
- **Focus**: 3px focus ring for accessibility compliance

### Phase 4.5: Accessibility & Polish

#### Accessibility Requirements
- **44px minimum touch targets** on all interactive elements
- **AA contrast compliance** verified on all text/background combinations
- **Focus rings** on all interactive elements using focusRing token
- **fontVariant: ['tabular-nums']** for any currency/time displays
- **Proper heading hierarchy** with single H1 per screen

#### Animation Implementation
- **React Native Animated API** for smooth transitions
- **Fade + 20px translateY slide-up** effect
- **180ms duration** with easeOut timing
- **Applied to**: Hero section and feature grid on WelcomeScreen

### Phase 4.6: Technical Implementation Constraints

#### Preserved Functionality
- **All existing onClick/onSubmit handlers intact**
- **All form validation logic unchanged**
- **All navigation routes preserved**
- **All existing IDs and form names maintained**
- **No data flow or logic changes**

#### Icon Strategy
1. **Primary**: Install @expo/vector-icons, use Feather icons (watch, bar-chart-2, send)
2. **Fallback**: Styled emojis with consistent 32px sizing and spacing
3. **Container**: 40px soft circles with pillBg background

### Implementation Checklist
- [ ] New design tokens added to theme.ts
- [ ] Button component extended with new variants
- [ ] WelcomeScreen completely redesigned with new hero + feature grid
- [ ] All auth screens restyled with professional design tokens
- [ ] Feather icons implemented (or emoji fallback)
- [ ] Animations added to WelcomeScreen (fade + slide-up)
- [ ] All accessibility requirements met (44px targets, AA contrast, focus rings)
- [ ] Invite code input has special styling (monospace, uppercase, letter-spacing)
- [ ] No functional changes to handlers, routes, or validation logic

**Expected Outcome**: A professional, trustworthy first impression that builds confidence in the TrackPay platform from the moment users discover the app through successful onboarding.

## 🔄 Future Phases (OPTIONAL)

### Phase 5: Session Tracking & Settings Polish
- **Session Tracking Screen**: Apply muted design principles
- **Settings & Profile**: Consistent design language
- **Performance Optimization**: Bundle size and loading improvements

**Design Philosophy Achieved**: TrackPay now features a complete, cohesive design system from first impression through daily use across both provider and client experiences. The app provides a professional, trustworthy mobile utility that emphasizes money amounts while keeping everything else appropriately subdued. Both sides of the marketplace enjoy a calm, efficient interface that builds confidence in financial transactions.

## 🔄 Phase 5: iOS Native Polish & Keyboard Safety ⚡

### Phase 5.1: iOS-Native Design Patterns
**Objective**: Transform every screen to feel truly native on iOS with proper keyboard handling, navigation patterns, and form ergonomics.

#### iOS Design Principles
- **Large Titles**: Use iOS-style large titles on root screens (navigationOptions.headerLargeTitle)
- **Chevron Navigation**: Back buttons show only chevron (←), no text labels
- **Safe Areas**: All screens wrapped with SafeAreaView + proper content insets
- **Keyboard Safety**: StickyCTA component ensures primary actions stay above keyboard
- **Focus Flow**: Return key advances through form fields, submit on last field
- **Haptic Feedback**: Light haptics on success actions (copy, submit, etc.)

#### Technical Foundation Components

**StickyCTA Component**
```typescript
interface StickyCTAProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}
```
- Always visible above keyboard using InputAccessoryView (iOS) or KeyboardAvoidingView fallback
- Respects safe area insets with proper padding
- 16pt internal spacing, 12pt corner radius
- Handles disabled/loading states with proper visual feedback

**iOS Header Patterns**
- Large title display on root screens (Clients, Providers)
- Entity names as titles on detail screens (client name, provider name)
- No "..." overflow menus - use explicit Edit buttons
- headerShadowVisible: false for clean appearance
- headerBackTitleVisible: false (chevron only)

### Phase 5.2: Screen-by-Screen Implementation

#### Foundation Screens
- **WelcomeScreen**: Large title, optimized CTAs, no keyboard issues
- **LoginScreen**: StickyCTA, focus chaining (email → password → submit)
- **RegisterScreen**: Role selection tiles, keyboard-safe registration
- **InviteClaimScreen**: Monospace invite code with visual grouping

#### Provider Flow Screens
- **SimpleClientListScreen**: Large title "Clients", clean navigation
- **ClientHistoryScreen**: Large title with client name, chevron back
- **ClientProfileScreen**: Redesigned invite code section with copy/share

#### Client Flow Screens
- **ServiceProviderListScreen**: Large title "Providers", muted card design
- **ServiceProviderSummaryScreen**: Provider name as title, clean timeline

#### Modal & Form Screens
- **AddClientModal**: StickyCTA, proper field flow (name → email → rate)
- **MarkAsPaidModal**: Keyboard-safe payment entry with amount validation
- **Other modals**: Consistent StickyCTA pattern throughout

### Phase 5.3: Form Ergonomics Standards

#### Input Field Requirements
- **Labels**: Visible labels above each field
- **Placeholders**: Helpful placeholder text
- **Keyboard Types**: Proper keyboardType (decimal-pad for money, email-address)
- **Return Key Flow**: returnKeyType="next" with focus chaining
- **Validation**: Inline error text below fields, real-time validation
- **Dismissal**: Tap outside to dismiss keyboard

#### Field Flow Patterns
```
Name Field → Email Field → Rate Field → StickyCTA
  ↓ next      ↓ next       ↓ done      ↓ submit
```

#### CTA Button States
- **Disabled**: Until all required fields valid
- **Loading**: Spinner with disabled interaction during submit
- **Success**: Haptic feedback + visual confirmation

### Phase 5.4: Zero State & Polish Details

#### Zero State Improvements
- Hide "Total Outstanding" card when no clients exist
- Clear onboarding flow with "How it works" → "Let's Set You Up"
- Primary action prominence (+ Add Client button)

#### Typography & Spacing
- **16pt Grid**: Consistent spacing throughout all screens
- **Tabular Numerals**: fontVariant: ['tabular-nums'] on all money/time
- **Dynamic Type**: Respect iOS accessibility text size preferences
- **Hit Targets**: Minimum 44×44pt touch targets on all interactive elements

#### Micro-Interactions
- **Haptics**: Success feedback on form submit, copy actions
- **Visual Feedback**: Button press states, focus rings
- **Loading States**: Proper spinners and disabled states during async operations

### Phase 5.5: Implementation Checklist

#### Foundation Components
- [ ] StickyCTA component with keyboard avoidance
- [ ] iOS header configuration utilities
- [ ] Enhanced theme with iOS spacing tokens
- [ ] Focus management utilities

#### Screen Updates
- [ ] All auth screens use StickyCTA and focus flow
- [ ] Provider screens have large titles and clean navigation
- [ ] Client screens match iOS header patterns
- [ ] All modals use consistent StickyCTA pattern

#### Technical Requirements
- [ ] SafeAreaView wrapper on all screens
- [ ] ScrollView with contentInsetAdjustmentBehavior="automatic"
- [ ] keyboardShouldPersistTaps="handled" for form dismissal
- [ ] Haptic feedback on success actions
- [ ] Dynamic Type support for accessibility

#### QA Validation
- [ ] Primary CTA visible with keyboard open on iPhone SE
- [ ] Return key flow works through all form fields
- [ ] Large titles display correctly on root screens
- [ ] No horizontal scrolling or layout breaks
- [ ] All touch targets meet 44pt minimum requirement

**Expected Outcome**: Every screen feels native to iOS with professional keyboard handling, proper navigation hierarchy, and form ergonomics that match system apps. Users experience seamless interaction patterns that respect iOS conventions while maintaining TrackPay's professional brand.