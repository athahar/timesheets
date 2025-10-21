# TrackPay v2 - UX Redesign Specification

**Status**: 📋 Planned (Not Yet Implemented)
**Created**: October 21, 2025
**Author**: Development Team
**Figma Reference**: `designs/new/` (6 screenshots)

---

## 📋 Executive Summary

Complete visual redesign of TrackPay mobile app from current iOS-style design to TrackPay v2 design system. This redesign modernizes the visual language with a green-primary color palette, larger typography for money amounts, and a professional component library while maintaining all existing functionality.

**Key Goals**:
- ✅ Implement TrackPay v2 design system (green-primary, new typography)
- ✅ Create reusable component library (TP-prefixed components)
- ✅ Redesign 8+ screens to match Figma mockups
- ✅ Fix missing multi-crew i18n translations
- ✅ Maintain backward compatibility (no breaking changes)
- ✅ Full bilingual support (English/Spanish)

**Timeline**: ~12 working days (2.5 weeks)

---

## 🎨 Design Decisions

Based on user feedback and Figma designs:

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| **Design Coverage** | Adapt design system to non-Figma screens | Only 4 screens have Figma designs; apply brand guidelines to others |
| **App Name** | "My WorkTrack" is screen title only | Keep "TrackPay" branding elsewhere |
| **Active Session UI** | Compact crew controls (NOT large card) | User wants smaller, inline crew size picker |
| **Terminology** | Keep "Service Providers" | Stick with existing terminology, not "My Employees" |
| **Payment Modal** | Update existing modal styling | Don't redesign from scratch, just apply v2 styles |
| **Bilingual Support** | Full i18n (EN/ES) + fix multi-crew | All components must support localization |

---

## 🎯 Design System - TrackPay v2

**Design Philosophy**: Minimal, professional, Apple Wallet-inspired aesthetic. Black/white/gray neutral palette with colored accents only for avatars and semantic states.

### Color Palette

#### Core Neutrals (PRIMARY)

These are the primary brand colors - black and white create the app's professional foundation:

```
Black:      #111827  (Primary buttons, headings, icons)
Ink:        #111827  (Same as black - primary text)
White:      #FFFFFF  (Card backgrounds, button text)
Gray-50:    #F7F8FA  (App background)
Gray-100:   #E5E7EB  (Borders, dividers)
Gray-500:   #6B7280  (Secondary text, metadata)
Gray-400:   #9AA1A9  (Tertiary text, placeholders)
```

**Usage**:
- Primary CTA buttons: Black background, white text
- Secondary buttons: White background, black border, black text
- All body text: Black (#111827)
- Card containers: White with gray border

#### Danger Color (Stop Button)

```
Red-500: #C23548  (Deep maroon for "Stop Session" button)
Red-600: #A61D38  (Pressed state)
```

**Usage**: Only for destructive/stop actions (e.g., "Stop Session" button)

#### Avatar Accent Colors

Colorful accents used ONLY for avatar backgrounds to add visual interest:

```
Teal-500:    #40B4A8  (Avatar accent 1)
Purple-500:  #8B5CF6  (Avatar accent 2)
Navy-500:    #3B5998  (Avatar accent 3)
```

**Usage**: Randomized avatar background colors based on name hash

#### Semantic Status Colors (NOT Branding)

These colors convey meaning for status pills/badges only - NOT used for primary branding:

**Success/Paid**:
```
Green-500: #22C55E  (Success text, "Paid" pill text)
Green-700: #047857  (Pill text for "Paid")
Green-50:  #ECFDF5  (Pill background for "Paid")
```

**Warning/Due**:
```
Amber-500: #F59E0B  (Warning color)
Amber-700: #B45309  (Warning text)
Amber-50:  #FFFBEB  (Warning background for "Due")
```

**Requested**:
```
Purple-600: #6D28D9  (Requested pill text)
Purple-50:  #F3E8FF  (Requested pill background)
```

**Active Session**:
```
Teal-700: #0F766E  (Active pill text)
Teal-50:  #E6FFFA  (Active pill background)
```

### Typography Scale

```
Display:     34-36px / Bold (700)      - Big money amounts
Title:       22px / Bold (700)         - Screen titles
Body:        16px / Semibold (600)     - Primary content
Footnote:    13px / Medium (500-600)   - Meta text, labels
```

**Font Family**: Inter / SF Pro (system fallback)

### Spacing System (8pt Grid)

```
x2:  2px
x4:  4px
x8:  8px
x12: 12px
x16: 16px
x20: 20px
x24: 24px
x32: 32px
```

### Border Radii

```
Card:    16px  (Main container cards)
Button:  12px  (All buttons)
Pill:    10px  (Status badges)
Input:   12px  (Form inputs)
```

### Shadows & Elevation

**iOS Card Shadow**:
```
shadowColor: #000000
shadowOpacity: 0.05
shadowRadius: 6px
shadowOffset: { width: 0, height: 3 }
```

**Android Elevation**:
```
elevation: 2
```

### Semantic Status Colors

| Status | Background | Text Color | Use Case |
|--------|------------|------------|----------|
| **Paid** | Green-50 (#ECFDF5) | Green-700 (#047857) | Completed payments |
| **Due** | Amber-50 (#FFFBEB) | Amber-700 (#B45309) | Unpaid balances |
| **Requested** | Purple-50 (#F3E8FF) | Purple-600 (#6D28D9) | Payment requests sent |
| **Active** | Teal-50 (#E6FFFA) | Teal-700 (#0F766E) | In-progress sessions |

---

## 🧩 Component Library - TrackPay v2

All new components use `TP` prefix to distinguish from legacy components during migration.

### Atomic Components

#### 1. TPButton

**Purpose**: Primary button component with variants and states

**Variants**:
- `primary` - Green background, white text (CTAs)
- `secondary` - White background, gray border, ink text (Cancel)
- `danger` - Red background, white text (Stop, Delete)

**Sizes**:
- `sm` - 48px height
- `md` - 52px height (default)
- `lg` - 56px height

**Features**:
- Icon support (play ▶, stop ■, send 📤)
- Loading state with spinner
- Disabled state
- Press feedback (scale 0.98, 100ms)
- Haptic feedback integration

**Props**:
```typescript
interface TPButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: 'play' | 'stop' | 'send' | null;
  fullWidth?: boolean;
  style?: ViewStyle;
}
```

**Example Usage**:
```tsx
<TPButton
  title="Start Session"
  variant="primary"
  icon="play"
  onPress={handleStart}
  fullWidth
/>
```

---

#### 2. TPInput

**Purpose**: Text input with prefix/suffix support for money and rates

**Features**:
- Prefix slot (e.g., "$" for money)
- Suffix slot (e.g., "/hr" for hourly rates)
- Green focus ring (rgba(34,197,94,0.25))
- Error state styling
- Keyboard type variants

**Props**:
```typescript
interface TPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}
```

**Example Usage**:
```tsx
<TPInput
  value={hourlyRate}
  onChangeText={setHourlyRate}
  placeholder="Hourly Rate"
  prefix="$"
  suffix="/hr"
  keyboardType="decimal-pad"
/>
```

**Styling**:
- Height: 52px
- Border: 1px gray-200, focus: green-500
- Font: 16px/400
- Prefix/suffix: 16px/500 gray-500

---

#### 3. TPStatusPill

**Purpose**: Unified status badge for payment/session states

**Variants**:
- `paid` - Green background + text
- `due` - Amber background + text
- `requested` - Purple background + text
- `active` - Teal background + text

**Props**:
```typescript
interface TPStatusPillProps {
  status: 'paid' | 'due' | 'requested' | 'active';
  customText?: string;
  style?: ViewStyle;
}
```

**Example Usage**:
```tsx
<TPStatusPill status="due" />
<TPStatusPill status="paid" customText="Fully Paid" />
```

**Styling**:
- Border radius: 10px
- Padding: 6px 10px
- Font: 13px/600

**Replaces**: Current `StatusPill.tsx` component

---

#### 4. TPCard

**Purpose**: Container card with platform-specific shadows

**Features**:
- iOS shadow / Android elevation
- Configurable padding
- Optional touchable (onPress)

**Props**:
```typescript
interface TPCardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';  // 16, 20, 24
  onPress?: () => void;
  style?: ViewStyle;
}
```

**Example Usage**:
```tsx
<TPCard padding="lg">
  <Text>Card content</Text>
</TPCard>
```

**Styling**:
- Background: white
- Border radius: 16px
- Shadow: iOS (0.05 opacity, 6px radius, y:3) / Android (elevation: 2)

---

#### 5. TPAvatar

**Purpose**: Circular avatar with image or initials fallback

**Features**:
- Image support (URL or local)
- Initials fallback (first 2 letters)
- Colored backgrounds (hash-based from name)
- Size variants

**Props**:
```typescript
interface TPAvatarProps {
  name: string;
  imageUri?: string;
  size?: 'sm' | 'md' | 'lg';  // 32, 40, 56
  style?: ViewStyle;
}
```

**Example Usage**:
```tsx
<TPAvatar name="Michelle Smith" imageUri={client.imageUri} size="md" />
```

**Styling**:
- Size: 40px (default)
- Border radius: 50%
- Background: teal/purple/amber based on name hash
- Text: 16px/600 white

---

### Composite Components

#### 6. TPTotalOutstandingCard

**Purpose**: Hero card showing total balance and hours

**Features**:
- Large money amount (34-36px bold)
- Hours subtitle
- Optional "Request Payment" button
- Loading state

**Props**:
```typescript
interface TPTotalOutstandingCardProps {
  amount: number;
  hours: number;
  showRequestButton?: boolean;
  onRequestPayment?: () => void;
  loading?: boolean;
}
```

**Layout**:
```
┌─────────────────────────────────┐
│  Total Outstanding              │ ← 13px/600 gray
│  $879.00                        │ ← 34px/700 ink
│  29.3 hours unpaid              │ ← 13px/500 gray
│  ┌──────────────────────────┐   │
│  │ 📤 Request Payment       │   │ ← TPButton (if shown)
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**i18n Keys**:
- `totalOutstanding` → "Total Outstanding"
- `hoursUnpaid` → "{{count}} hours unpaid"
- `requestPayment` → "Request Payment"

---

#### 7. TPClientRow

**Purpose**: Client list item with avatar, name, rate, status

**Features**:
- Avatar (image or initials)
- Client name + hourly rate
- Balance amount + hours
- Status pill (Paid/Due/Requested)
- Swipeable actions (delete, edit)
- Optional divider

**Props**:
```typescript
interface TPClientRowProps {
  client: {
    id: string;
    name: string;
    imageUri?: string;
    rate: number;
    balance: number;
    hours: number;
    status: 'paid' | 'due' | 'requested';
  };
  onPress: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  showDivider?: boolean;
}
```

**Layout**:
```
┌──────────────────────────────────────┐
│ [NS] Michelle              [Paid]    │ ← Avatar + Name + Status pill
│      Due: $540.00 (18 hrs)           │ ← Secondary info
├──────────────────────────────────────┤ ← Optional divider
```

**Styling**:
- Min height: 72px
- Padding: 16px vertical, 16px horizontal
- Avatar: 40px (TPAvatar)
- Name: 16px/600 ink
- Rate/hours: 13px/500 gray-500
- Status: TPStatusPill (right-aligned)
- Divider: 1px gray-200

**i18n Keys**:
- `due` → "Due"
- `hrs` → "hrs"

---

#### 8. TPTimelineItem

**Purpose**: Activity feed entry (sessions, payments, requests)

**Features**:
- Icon (clock, money, send)
- Title + metadata
- Right-aligned amount/status
- Touchable for details

**Props**:
```typescript
interface TPTimelineItemProps {
  type: 'session' | 'payment_request' | 'payment';
  title: string;
  metadata: string;  // e.g., "4 hours • 1 person"
  amount?: number;
  status?: 'active' | 'complete' | 'requested';
  icon?: 'clock' | 'money' | 'send';
  onPress?: () => void;
}
```

**Layout**:
```
┌──────────────────────────────────────┐
│ 🕐 Work Session         $100.50      │ ← Icon + Title + Amount
│    Complete • 4 hours • 1 person     │ ← Metadata
└──────────────────────────────────────┘
```

**Styling**:
- Padding: 16px
- Icon: 20px Feather icon
- Title: 16px/600 ink
- Meta: 13px/500 gray-500
- Amount: 16px/700 ink (right)

**i18n Keys**:
- `workSession` → "Work Session"
- `paymentRequested` → "Payment Requested"
- `complete` → "Complete"
- `active` → "Active"

---

#### 9. TPModal

**Purpose**: Modal sheet with overlay for confirmations/forms

**Features**:
- 50% black overlay
- Bottom sheet on mobile, centered on web/tablet
- Close button (X top-right)
- Title + optional message
- Button row (secondary + primary)

**Props**:
```typescript
interface TPModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  primaryButton?: { title: string; onPress: () => void };
  secondaryButton?: { title: string; onPress: () => void };
}
```

**Layout**:
```
Overlay: rgba(0,0,0,0.5)

┌─────────────────────────────┐
│ Did you pay $540 to Lucy? ✕ │ ← Title + Close
│                             │
│ [Not yet] [Yes, Mark Paid]  │ ← Buttons
└─────────────────────────────┘
```

**Styling**:
- Overlay: rgba(0,0,0,0.5)
- Sheet: white, radius 16px, padding 24px
- Title: 22px/700 ink
- Message: 16px/500 gray-500
- Buttons: side-by-side, 12px gap

---

#### 10. TPCompactCrewControl

**Purpose**: Inline crew size picker (replaces large card)

**NEW COMPONENT** - User specifically requested compact version

**Features**:
- Inline +/- buttons
- Current count display
- Minimum 1 person
- Maximum configurable

**Props**:
```typescript
interface TPCompactCrewControlProps {
  crewSize: number;
  onCrewSizeChange: (newSize: number) => void;
  maxSize?: number;
}
```

**Layout**:
```
Crew: [ - ] 2 [ + ]
```

**Styling**:
- Display: flexDirection row, alignItems center
- Label: 16px/600 ink
- Buttons: 32px square, radius 8px, border gray-200
- Count: 20px/700, 40px width, center-aligned
- Spacing: 8px gap between elements

**i18n Keys** (NEEDS TRANSLATION):
- `crew` → "Crew" / "Equipo"
- `person` → "person" / "persona"
- `people` → "people" / "personas"

**Replaces**: Large crew size card in SessionTrackingScreen

---

## 📱 Screen Specifications

### Provider Screens

#### Screen 1: ClientListScreen (Provider Home)

**Current State**: Basic list with sections (Active/Other Clients)

**Figma Reference**: Screenshots 1 & 2 (`designs/new/Screenshot 2025-10-20 at 7.00.30 PM.png`, `7.00.41 PM.png`)

**New Design Elements**:

1. **Header**
   - Title: "My WorkTrack" (28px/700 ink)
   - Settings icon (top-right, 24px)
   - Padding: 16px

2. **Total Outstanding Card**
   - TPTotalOutstandingCard component
   - Shows sum of all unpaid balances
   - Shows total unpaid hours
   - NO "Request Payment" button (that's on client detail)

3. **Work In Progress Section** (conditional)
   - Only shows if active sessions exist
   - Section title: "Work In Progress" (17px/600)
   - TPClientRow for each client with active session
   - Shows elapsed time
   - "Stop" button integrated

4. **My Clients Section**
   - Section title: "My Clients" or "Your Clients" (17px/600)
   - TPClientRow for each client
   - Shows status pill (Paid/Due/Requested)
   - Shows balance and hours
   - Dividers between rows

**Changes Required**:
- Replace header with v2 design
- Add TPTotalOutstandingCard at top
- Separate active sessions into "Work In Progress"
- Replace client list items with TPClientRow
- Update all typography to v2 scale
- Apply new card shadows

**i18n Keys to Add**:
```typescript
myWorkTrack: 'My WorkTrack',
workInProgress: 'Work in Progress',
myClients: 'My Clients',
yourClients: 'Your Clients',
```

**File**: `ios-app/src/screens/ClientListScreen.tsx`
**Effort**: Major refactor (~200 lines changed)

---

#### Screen 2: ClientViewScreen (Client Detail)

**Current State**: Client detail with balance, timeline, session controls

**Figma Reference**: Screenshots 3 & 4 (`7.00.49 PM.png`, `7.00.55 PM.png`)

**New Design Elements**:

1. **Header**
   - Back button (left)
   - TPAvatar (center, 56px)
   - Client name below avatar (17px/600)
   - Settings icon (right)

2. **Balance Card**
   - TPTotalOutstandingCard
   - Shows client-specific balance
   - Shows "Request Payment" button if balance > 0

3. **Timeline Section**
   - Grouped by date (date headers: 15px/600 gray)
   - TPTimelineItem for each entry:
     - Work sessions (clock icon)
     - Payment requests (send icon)
     - Payments (money icon)
   - Right-aligned amounts
   - Status pills for completed items

4. **Sticky Bottom CTA**
   - **If NO active session**:
     - Full-width "Start Session" button (green)
   - **If active session**:
     - TPCompactCrewControl (inline, NOT big card)
     - "Stop (elapsed)" button (red, danger variant)

**Changes Required**:
- New header layout with centered avatar
- Replace balance card with TPTotalOutstandingCard
- Timeline items → TPTimelineItem components
- Replace large crew card with TPCompactCrewControl
- Sticky bottom CTA with proper variants
- Date section headers

**i18n Keys**:
```typescript
stopSession: 'Stop ({{time}})',
startSession: 'Start Session',
sessionDuration: 'Session Duration',
```

**File**: `ios-app/src/screens/ClientViewScreen.tsx`
**Effort**: Major refactor (~250 lines changed)

---

### Client Screens

#### Screen 3: ServiceProviderListScreen (Client View)

**Current State**: List of service providers with balances

**Figma Reference**: Screenshot 5 (`7.01.03 PM.png`)

**New Design Elements**:

1. **Header**
   - Title: "Service Providers" (NOT "My Employees" per user request)
   - Settings icon (right)

2. **Provider List**
   - TPAvatar (40px)
   - Provider name (16px/600)
   - Balance info: "Due: $X (Y hrs)" (13px/500)
   - **If balance > 0**: "Mark Paid" button (secondary, sm)
   - **If balance = 0**: Checkmark icon (green)

**Changes Required**:
- Update header (keep existing terminology)
- Use TPAvatar for provider images
- TPButton for "Mark Paid" action
- Checkmark icon for paid providers
- Apply v2 typography

**i18n Keys**:
```typescript
serviceProviders: 'Service Providers',  // Keep existing
markPaid: 'Mark Paid',
paid: 'Paid',
```

**File**: `ios-app/src/screens/ServiceProviderListScreen.tsx`
**Effort**: Medium refactor (~150 lines changed)

---

#### Screen 4: ClientHistoryScreen

**Current State**: Timeline of sessions/payments from client perspective

**New Design**: Adapt provider timeline design

**Changes Required**:
- Use TPTimelineItem for all entries
- Apply v2 typography and colors
- Use TPCard for grouping
- Right-align money amounts
- Status pills for payment states

**File**: `ios-app/src/screens/ClientHistoryScreen.tsx`
**Effort**: Medium refactor (~100 lines changed)

---

### Modal Updates

#### Modal 1: MarkAsPaidModal

**Current State**: Confirmation modal for marking payment

**Figma Reference**: Screenshot 6 (`7.01.10 PM.png`)

**New Design**:

**Use TPModal component**:
```tsx
<TPModal
  visible={visible}
  onClose={onClose}
  title={t('didYouPay', {
    amount: formatCurrency(amount),
    name: clientName
  })}
  primaryButton={{
    title: t('yesMarkAsPaid'),
    onPress: handleConfirm,
  }}
  secondaryButton={{
    title: t('notYet'),
    onPress: onClose,
  }}
/>
```

**Layout**:
- Title: "Did you pay $540 to Lucy?" (22px/700)
- Buttons side-by-side:
  - Left: "Not yet" (secondary)
  - Right: "Yes, Mark as Paid" (primary)
- Close X (top-right)

**i18n Keys**:
```typescript
didYouPay: 'Did you pay {{amount}} to {{name}}?',
yesMarkAsPaid: 'Yes, Mark as Paid',
notYet: 'Not yet',
```

**File**: `ios-app/src/components/MarkAsPaidModal.tsx`
**Effort**: Major refactor (~80 lines changed)

---

#### Modal 2: AddClientModal

**New Design**: Apply v2 styling with TPInput

**Changes**:
- Use TPModal wrapper
- TPInput for name (no prefix/suffix)
- TPInput for rate (prefix: "$", suffix: "/hr")
- TPButton for Cancel/Add actions

**File**: `ios-app/src/components/AddClientModal.tsx`
**Effort**: Major refactor (~100 lines changed)

---

#### Modal 3: InviteClientModal

**New Design**: Same pattern as AddClientModal

**File**: `ios-app/src/components/InviteClientModal.tsx`
**Effort**: Medium refactor (~80 lines changed)

---

### Other Screens

#### Screen 5: SessionTrackingScreen

**Current State**: Large crew size card, timer, controls

**Changes Required**:
- **Replace large crew card** with TPCompactCrewControl (key requirement!)
- Apply v2 typography to timer display
- Use TPButton for stop action
- Remove unnecessary padding/card wrapper

**File**: `ios-app/src/screens/SessionTrackingScreen.tsx`
**Effort**: Medium refactor (~120 lines changed)

---

#### Screen 6: HistoryScreen

**Changes**: Apply TPTimelineItem for all history entries

**File**: `ios-app/src/screens/HistoryScreen.tsx`
**Effort**: Small refactor (~60 lines changed)

---

#### Screen 7: SettingsScreen

**Changes**: Apply v2 card styling, typography, buttons

**File**: `ios-app/src/screens/SettingsScreen.tsx`
**Effort**: Small refactor (~40 lines changed)

---

#### Screen 8: Auth Screens (Light Touch)

**WelcomeScreen, LoginScreen, RegisterScreen**:
- Update button styling (could use TPButton or just theme colors)
- Ensure "TrackPay" branding is visible
- Light typography updates

**Effort**: Small refactors (~30 lines each)

---

## 🌍 i18n Requirements

### Multi-Crew Translation Fix

**Current Issue**: Crew-related text is hardcoded (not localized)

**Files to Audit**:
- `SessionTrackingScreen.tsx`
- `ClientViewScreen.tsx`
- `TPCompactCrewControl.tsx` (new component)

**Missing Translations** (`ios-app/src/i18n/simple.ts`):

```typescript
export const translations = {
  en: {
    // ... existing translations

    // Multi-crew (NEW)
    crew: 'Crew',
    crewSize: 'Crew size',
    person: 'person',
    people: 'people',

    // TrackPay v2 screens (NEW)
    myWorkTrack: 'My WorkTrack',
    workInProgress: 'Work in Progress',
    myClients: 'My Clients',
    yourClients: 'Your Clients',

    // TrackPay v2 components (NEW)
    hoursUnpaid: '{{count}} hours unpaid',
    workSession: 'Work Session',
    paymentRequested: 'Payment Requested',
    complete: 'Complete',

    // Modal (NEW)
    didYouPay: 'Did you pay {{amount}} to {{name}}?',
    yesMarkAsPaid: 'Yes, Mark as Paid',
    notYet: 'Not yet',

    // Empty states (NEW)
    noClientsYet: 'No clients yet',
    addYourFirstClient: 'Add your first client to start tracking time',
    noActivityYet: 'No activity yet',
    startYourFirstSession: 'Start your first session to see it here',
    workingOffline: 'Working offline - will sync when back online',
  },

  es: {
    // ... existing translations

    // Multi-crew (NEW)
    crew: 'Equipo',
    crewSize: 'Tamaño del equipo',
    person: 'persona',
    people: 'personas',

    // TrackPay v2 screens (NEW)
    myWorkTrack: 'Mi Trabajo',
    workInProgress: 'Trabajo en Progreso',
    myClients: 'Mis Clientes',
    yourClients: 'Tus Clientes',

    // TrackPay v2 components (NEW)
    hoursUnpaid: '{{count}} horas sin pagar',
    workSession: 'Sesión de Trabajo',
    paymentRequested: 'Pago Solicitado',
    complete: 'Completo',

    // Modal (NEW)
    didYouPay: '¿Pagaste {{amount}} a {{name}}?',
    yesMarkAsPaid: 'Sí, Marcar como Pagado',
    notYet: 'Aún no',

    // Empty states (NEW)
    noClientsYet: 'Aún no hay clientes',
    addYourFirstClient: 'Agrega tu primer cliente para comenzar a rastrear tiempo',
    noActivityYet: 'Aún no hay actividad',
    startYourFirstSession: 'Inicia tu primera sesión para verla aquí',
    workingOffline: 'Trabajando sin conexión - se sincronizará cuando vuelvas a estar en línea',
  },
};
```

**Verification Steps**:
1. Search for hardcoded "Crew", "crew", "person", "people" in codebase
2. Replace with `{t('crew')}`, `{t('person')}`, etc.
3. Test language switching (English ↔ Spanish)
4. Verify pluralization works correctly

---

## 🎬 Motion & Interactions

### Animation Timing

```typescript
const ANIMATION_TIMING = {
  quick: 100,     // Button press
  standard: 150,  // Card entrance
  slow: 180,      // Toast slide
  keyboard: 250,  // iOS keyboard standard
};
```

### Button Press Feedback

**Implementation**:
```typescript
const [scaleAnim] = useState(new Animated.Value(1));

const handlePressIn = () => {
  Animated.timing(scaleAnim, {
    toValue: 0.98,
    duration: 100,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    friction: 3,
    useNativeDriver: true,
  }).start();
};
```

### Card Entrance (Staggered Lists)

**Implementation**:
```typescript
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(8)).current;

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start();
}, []);

return (
  <Animated.View
    style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }}
  >
    {/* Card content */}
  </Animated.View>
);
```

### Haptic Feedback

**Use Cases**:
```typescript
import * as Haptics from 'expo-haptics';

// Success (payment marked, session completed)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error (validation failed)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Selection (button tap, tab switch)
Haptics.selectionAsync();
```

---

## ♿ Accessibility Requirements

### Contrast Ratios

All text must meet **WCAG AA standard (4.5:1 minimum)**

**Verified Combinations**:
- ✅ Ink (#111827) on White (#FFFFFF) → 15.4:1
- ✅ Gray-500 (#6B7280) on White → 5.7:1
- ✅ Green-700 (#047857) on Green-50 (#ECFDF5) → 6.2:1
- ✅ Amber-700 (#B45309) on Amber-50 (#FFFBEB) → 5.8:1
- ✅ Purple-600 (#6D28D9) on Purple-50 (#F3E8FF) → 7.1:1
- ✅ Teal-700 (#0F766E) on Teal-50 (#E6FFFA) → 5.9:1

**Tool**: https://webaim.org/resources/contrastchecker/

### Touch Targets

**Minimum size: 44x44 pixels** (Apple HIG guideline)

**Applied to**:
- ✅ All buttons (TPButton min height: 48px)
- ✅ Client rows (min height: 72px)
- ✅ Modal close buttons (44x44)
- ⚠️ Status pills (NOT tappable, OK to be smaller)

### VoiceOver Support

**Example Labels**:
```tsx
<TPTotalOutstandingCard
  amount={879}
  hours={29.3}
  accessibilityLabel="Total outstanding: 879 dollars. 29.3 hours unpaid."
  accessibilityRole="text"
/>

<TPButton
  title="Request Payment"
  onPress={handleRequest}
  accessibilityLabel="Request payment for $879"
  accessibilityHint="Sends payment request to client"
  accessibilityRole="button"
/>

<TPStatusPill
  status="due"
  accessibilityLabel="Payment due"
  accessibilityRole="text"
/>
```

### Dynamic Type Support

**Test with iOS Text Size up to 120%**

**Critical checks**:
- Money amounts don't truncate
- Button text stays on one line
- Card content doesn't overflow

**Implementation**:
```tsx
import { useWindowDimensions } from 'react-native';

const { fontScale } = useWindowDimensions();
const fontSize = Math.min(34 * fontScale, 40); // Cap at 40px
```

---

## 🧪 Testing Checklist

### Manual Testing

#### Provider Flow (athahar+lucy@gmail.com)
- [ ] Login successful
- [ ] See "My WorkTrack" screen
- [ ] Total outstanding card shows correct sum
- [ ] Client list shows status pills (Paid/Due/Requested)
- [ ] Click client → Navigate to detail
- [ ] Client detail shows balance card
- [ ] Timeline shows all activities
- [ ] Start session → Compact crew control appears
- [ ] Adjust crew size (verify i18n shows "Crew: X people")
- [ ] Stop session → Red danger button works
- [ ] Request payment → Modal styling correct
- [ ] Switch to Spanish → All crew text translated

#### Client Flow (ath.sub.007+kel@gmail.com)
- [ ] Login successful
- [ ] See service providers list
- [ ] Mark payment as paid → New modal design
- [ ] Modal shows "Did you pay $X to Y?"
- [ ] Confirm → Payment marked
- [ ] View payment history timeline
- [ ] Switch to Spanish → All text translated

#### Visual Verification
- [ ] All cards have proper shadows (iOS/Android)
- [ ] Money amounts are 34-36px bold
- [ ] Status pills use correct colors
- [ ] Buttons have 12px border radius
- [ ] Crew control is compact (not large card)

#### Accessibility
- [ ] Enable VoiceOver (iOS)
- [ ] Navigate through all screens
- [ ] Money amounts announced correctly
- [ ] Test with 120% text size
- [ ] All buttons tappable (44x44 min)

#### Cross-Platform
- [ ] iOS physical device
- [ ] iOS simulator
- [ ] Android emulator
- [ ] Web browser (localhost:8081)

#### Edge Cases
- [ ] Empty client list → Shows empty state
- [ ] No activity → Shows empty timeline
- [ ] Offline mode → Shows banner
- [ ] Very long names → Truncate properly
- [ ] Large balances → Format correctly

---

## 📊 Success Criteria

**This redesign will be considered complete when**:

### Code Quality
- ✅ Zero TypeScript errors
- ✅ Zero console warnings (except dev logs)
- ✅ All components have proper TypeScript interfaces
- ✅ 100% i18n coverage (EN/ES)

### Visual Quality
- ✅ All 4 Figma screens match designs exactly
- ✅ Other screens follow v2 design system
- ✅ Consistent spacing (8pt grid)
- ✅ Proper shadows on all cards (iOS/Android)
- ✅ Status pill colors match spec

### Functionality
- ✅ All existing features still work
- ✅ No breaking changes
- ✅ Smooth animations (60fps)
- ✅ Haptic feedback on key actions
- ✅ Compact crew control (not large card)

### Accessibility
- ✅ 4.5:1 contrast ratio on all text
- ✅ 44x44 minimum touch targets
- ✅ VoiceOver compatible
- ✅ Dynamic type support (up to 120%)

### Documentation
- ✅ Complete spec document (this file)
- ✅ Migration guide created
- ✅ CLAUDE.md updated with v2 section
- ✅ All components documented with JSDoc

---

## 🚀 Implementation Plan

### Phase 1: Foundation (Days 1-2) - REFINED

**Tasks (ChatGPT-refined approach)**:
1. Create feature branch: `feature/trackpay-v2-design-system`
2. Create `ios-app/src/styles/palette.ts` (single source of color truth)
3. Create `ios-app/src/styles/themeV2.ts` (clean, no duplicates, nested btn/pill)
4. Create `ios-app/src/styles/trackpay.css` (CSS variables for web)
5. Create `ios-app/src/styles/components.ts` (CardStyles, ButtonStyles helpers)
6. Update `ios-app/tailwind.config.js` (cleaned version)
7. Mark `ios-app/src/styles/theme.ts` as @deprecated (but keep functional)
8. Smoke test: Render one screen with new tokens to verify

**Deliverables**:
- ✅ palette.ts (flat color structure)
- ✅ themeV2.ts (TP export, no duplicates)
- ✅ trackpay.css (web support)
- ✅ components.ts (reusable StyleSheets)
- ✅ Updated Tailwind config
- ✅ Deprecated old theme.ts
- ✅ Smoke test passed

**Commit Message**:
```
feat(design): add TrackPay v2 design foundation

- Add palette.ts (single source of color truth)
- Add themeV2.ts (TP theme, clean structure, no duplicates)
- Add trackpay.css (CSS variables for web)
- Add components.ts (CardStyles, ButtonStyles helpers)
- Update Tailwind config (aligned to palette)
- Deprecate legacy theme.ts (keep functional for v1)

ChatGPT-refined structure for better organization.

Related: TrackPay v2 UX Redesign
```

---

### Phase 2: Component Library (Days 3-5)

**Tasks**:
1. Create `ios-app/src/components/v2/` directory
2. Build atomic components:
   - TPButton (variants, sizes, icons)
   - TPInput (prefix/suffix)
   - TPStatusPill (4 variants)
   - TPCard (shadows, padding)
   - TPAvatar (image/initials)
3. Build composite components:
   - TPTotalOutstandingCard
   - TPClientRow
   - TPTimelineItem
   - TPModal
   - TPCompactCrewControl (KEY: replaces large card)
4. Add i18n support to all components
5. Add JSDoc documentation
6. Add accessibility props

**Deliverables**:
- ✅ 10 new TP-prefixed components
- ✅ All components TypeScript typed
- ✅ All components support i18n
- ✅ All components have accessibility labels

**Commit Message**:
```
feat(components): create TrackPay v2 component library

- Add TPButton (primary/secondary/danger variants)
- Add TPCard with platform shadows
- Add TPInput with prefix/suffix support
- Add TPStatusPill (paid/due/requested/active)
- Add TPAvatar with initials fallback
- Add TPTotalOutstandingCard
- Add TPClientRow
- Add TPTimelineItem
- Add TPModal
- Add TPCompactCrewControl (replaces large card)

All components support i18n and accessibility.

Related: TrackPay v2 UX Redesign
```

---

### Phase 3: Screen Redesigns (Days 6-10)

**Tasks**:
1. **Provider Screens**:
   - ClientListScreen → My WorkTrack header, total card, TPClientRow
   - ClientViewScreen → Avatar header, timeline, sticky CTA, compact crew
2. **Client Screens**:
   - ServiceProviderListScreen → Updated styling, TPButton
   - ClientHistoryScreen → TPTimelineItem
3. **Modals**:
   - MarkAsPaidModal → TPModal pattern
   - AddClientModal → TPInput with prefix/suffix
   - InviteClientModal → v2 styling
4. **Other Screens**:
   - SessionTrackingScreen → Compact crew control (KEY!)
   - HistoryScreen → TPTimelineItem
   - SettingsScreen → v2 cards/buttons
   - Auth screens → Light styling updates
5. Test each screen after migration
6. Take screenshots for documentation

**Deliverables**:
- ✅ 8+ screens redesigned
- ✅ All screens use v2 components
- ✅ Compact crew control implemented
- ✅ Screenshots for comparison

**Commit Message**:
```
feat(screens): redesign all screens with TrackPay v2 components

Provider screens:
- ClientListScreen: My WorkTrack header, total outstanding card, TPClientRow
- ClientViewScreen: Avatar header, timeline, sticky CTA, compact crew control

Client screens:
- ServiceProviderListScreen: Updated styling, TPButton for mark paid
- ClientHistoryScreen: TPTimelineItem for all entries

Modals:
- MarkAsPaidModal: TPModal pattern with side-by-side buttons
- AddClientModal: TPInput with prefix/suffix
- InviteClientModal: v2 styling

Other screens:
- SessionTrackingScreen: Compact crew control (not large card)
- HistoryScreen, SettingsScreen: v2 styling applied
- Auth screens: Light touch styling updates

Related: TrackPay v2 UX Redesign
```

---

### Phase 4: i18n & Polish (Days 11-12)

**Tasks**:
1. **i18n Audit**:
   - Search for hardcoded "Crew", "crew", "person", "people"
   - Add missing translations to `simple.ts`
   - Test language switching (EN ↔ ES)
   - Verify pluralization
2. **Animations**:
   - Button press feedback (scale 0.98, 100ms)
   - Card entrance (fade + slide, 150ms)
   - Toast slide-up (180ms)
3. **Haptics**:
   - Success (payment marked, session stopped)
   - Error (validation failed)
   - Selection (button taps)
4. **Accessibility**:
   - Verify contrast ratios
   - Add VoiceOver labels
   - Test with 120% text size
   - Verify 44x44 touch targets
5. **Edge States**:
   - Empty client list
   - No activity timeline
   - Offline banner
   - Loading states
   - Error states

**Deliverables**:
- ✅ 100% i18n coverage
- ✅ Multi-crew translations fixed
- ✅ Smooth animations
- ✅ Haptic feedback
- ✅ Accessibility compliant
- ✅ All edge states handled

**Commit Message**:
```
feat(i18n): fix multi-crew localization and add v2 translations

- Add missing crew translations (EN/ES)
- Add new v2 component translations
- Fix hardcoded crew text in SessionTrackingScreen
- Add empty state translations
- Add edge case messaging

Accessibility:
- VoiceOver labels for money amounts
- Haptic feedback on key actions
- Button press animations (100ms scale)
- Card entrance animations (150ms fade+slide)

Related: TrackPay v2 UX Redesign
```

---

### Phase 5: Documentation (Day 12)

**Tasks**:
1. Create `docs/design/TRACKPAY_V2_DESIGN_SYSTEM.md` (design tokens reference)
2. Create `docs/design/MIGRATION_TO_V2.md` (migration guide)
3. Update `CLAUDE.md` with v2 design system section
4. Add Figma screenshot references
5. Document breaking changes (none expected)
6. Create testing checklist

**Deliverables**:
- ✅ Complete design system docs
- ✅ Migration guide for developers
- ✅ Updated CLAUDE.md
- ✅ Testing checklist

**Commit Message**:
```
docs(design): add TrackPay v2 specification and migration guide

- Create spec/TRACKPAY_V2_UX_REDESIGN.md
- Create docs/design/MIGRATION_TO_V2.md
- Update CLAUDE.md with v2 design system section
- Add Figma screenshot references

Related: TrackPay v2 UX Redesign
```

---

## 📅 Timeline Summary

| Phase | Days | Key Deliverables |
|-------|------|------------------|
| 1. Foundation | 1-2 | Theme updated, design spec created |
| 2. Components | 3-5 | 10 TP components built |
| 3. Screens | 6-10 | 8+ screens redesigned |
| 4. Polish | 11-12 | i18n, animations, accessibility |
| 5. Docs | 12 | Complete documentation |

**Total**: ~12 working days (2.5 weeks)

---

## 🔄 Migration Strategy

### Backward Compatibility

**No breaking changes** - All v1 components remain functional during migration.

**Naming Convention**:
- New components: `TP` prefix (e.g., `TPButton`, `TPCard`)
- Old components: Keep original names (e.g., `Button`, `StatusPill`)
- Deprecation notices in JSDoc

**Migration Path**:
```typescript
// Old (still works)
import { Button } from '../components/Button';

// New (preferred)
import { TPButton } from '../components/v2/TPButton';
```

### Component Mapping

| Old Component | New Component | Migration Effort | Notes |
|---------------|---------------|------------------|-------|
| Button | TPButton | Low | Props mostly same |
| StatusPill | TPStatusPill | Low | Auto-maps status |
| (none) | TPCard | N/A | New wrapper |
| (none) | TPInput | Medium | New props |
| (none) | TPAvatar | N/A | New component |
| SessionCard | Update in place | Medium | Apply v2 styling |
| ClientCard | TPClientRow | Medium | Replace entirely |

### Deprecation Plan

**Phase 1** (This release): Add `@deprecated` JSDoc tags
**Phase 2** (Next release): Remove old components

**Example**:
```typescript
/**
 * @deprecated Use TPButton from components/v2/TPButton instead
 * This component will be removed in the next major version
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // ... existing implementation
};
```

---

## 📦 File Structure

```
ios-app/
├── src/
│   ├── components/
│   │   ├── v2/                          # NEW - TrackPay v2 components
│   │   │   ├── TPButton.tsx
│   │   │   ├── TPCard.tsx
│   │   │   ├── TPInput.tsx
│   │   │   ├── TPStatusPill.tsx
│   │   │   ├── TPAvatar.tsx
│   │   │   ├── TPTotalOutstandingCard.tsx
│   │   │   ├── TPClientRow.tsx
│   │   │   ├── TPTimelineItem.tsx
│   │   │   ├── TPModal.tsx
│   │   │   └── TPCompactCrewControl.tsx
│   │   │
│   │   ├── Button.tsx                   # OLD - Keep for compatibility
│   │   ├── StatusPill.tsx               # OLD - Will deprecate
│   │   ├── SessionCard.tsx              # Update in place
│   │   ├── ClientCard.tsx               # OLD - Replace with TPClientRow
│   │   ├── MarkAsPaidModal.tsx          # Update to use TPModal
│   │   ├── AddClientModal.tsx           # Update to use TPModal + TPInput
│   │   └── InviteClientModal.tsx        # Update to use TPModal + TPInput
│   │
│   ├── screens/
│   │   ├── ClientListScreen.tsx         # Major redesign
│   │   ├── ClientViewScreen.tsx         # Major redesign
│   │   ├── ServiceProviderListScreen.tsx # Medium update
│   │   ├── ClientHistoryScreen.tsx      # Medium update
│   │   ├── SessionTrackingScreen.tsx    # Medium update (compact crew!)
│   │   ├── HistoryScreen.tsx            # Small update
│   │   ├── SettingsScreen.tsx           # Small update
│   │   └── [auth screens]               # Light touch
│   │
│   ├── styles/
│   │   └── theme.ts                     # UPDATED - v2 tokens
│   │
│   └── i18n/
│       └── simple.ts                    # UPDATED - New translations
│
├── tailwind.config.js                   # UPDATED - Align with theme
│
spec/
├── TRACKPAY_V2_UX_REDESIGN.md           # THIS FILE
└── TRACKPAY_V2_DESIGN_SYSTEM.md         # NEW - Design token reference

docs/
└── design/
    └── MIGRATION_TO_V2.md               # NEW - Migration guide

CLAUDE.md                                # UPDATED - Add v2 section
```

---

## 🐛 Known Issues & Risks

### Potential Issues

1. **Shadow Rendering Performance**
   - **Risk**: iOS shadows can impact performance on lists
   - **Mitigation**: Use `shadowOpacity: 0.05` (very light)
   - **Alternative**: Convert to `react-native-shadow-2` if needed

2. **Font Loading**
   - **Risk**: Inter font may not load on all platforms
   - **Mitigation**: SF Pro fallback, system fonts always available

3. **Animation Jank**
   - **Risk**: Staggered list animations may lag on low-end devices
   - **Mitigation**: Use `useNativeDriver: true`, keep duration short (150ms)

4. **i18n Pluralization**
   - **Risk**: "1 person" vs "2 people" logic
   - **Mitigation**: Use i18next pluralization: `{{count}} {{count, plural, one {person} other {people}}}`

5. **Large Balances**
   - **Risk**: $10,000+ amounts may overflow on small screens
   - **Mitigation**: Use `numberOfLines={1}` and `adjustsFontSizeToFit`

---

## 📞 Support & Questions

**For questions about this spec**:
- Review Figma screenshots in `designs/new/`
- Check `CLAUDE.md` for general project guidelines
- Refer to `docs/design/MIGRATION_TO_V2.md` for migration help

**During implementation**:
- Ask user for clarification on screens not in Figma
- Take screenshots for visual comparison
- Test incrementally (screen-by-screen)

---

## 📸 Figma Reference

**Available Designs** (6 screenshots):

1. **Provider Home (No Active Session)**
   File: `Screenshot 2025-10-20 at 7.00.30 PM.png`
   Shows: My WorkTrack header, total outstanding card, client list

2. **Provider Home (Variant)**
   File: `Screenshot 2025-10-20 at 7.00.41 PM.png`
   Shows: Alternative client list layout

3. **Client Detail (No Active Session)**
   File: `Screenshot 2025-10-20 at 7.00.49 PM.png`
   Shows: Avatar header, balance card, timeline

4. **Client Detail (Active Session)**
   File: `Screenshot 2025-10-20 at 7.00.55 PM.png`
   Shows: Active session with "Stop Session" button

5. **Client View (Service Providers)**
   File: `Screenshot 2025-10-20 at 7.01.03 PM.png`
   Shows: "My Employees" list, mark paid buttons

6. **Confirmation Modal**
   File: `Screenshot 2025-10-20 at 7.01.10 PM.png`
   Shows: "Did you pay $540 to Lucy?" modal

---

## ✅ Final Checklist

**Before starting implementation**:
- [ ] User has reviewed this spec
- [ ] All questions answered (design coverage, terminology, etc.)
- [ ] Figma screenshots accessible
- [ ] Feature branch ready to create

**After Phase 1 (Foundation)**:
- [ ] Theme file updated with no duplicates
- [ ] Tailwind config aligned
- [ ] Design system docs created

**After Phase 2 (Components)**:
- [ ] All 10 TP components created
- [ ] TypeScript interfaces complete
- [ ] i18n support added
- [ ] JSDoc documentation added

**After Phase 3 (Screens)**:
- [ ] All 8+ screens redesigned
- [ ] Compact crew control implemented (not large card)
- [ ] Screenshots taken for comparison
- [ ] Manual testing completed

**After Phase 4 (Polish)**:
- [ ] i18n 100% coverage
- [ ] Multi-crew translations fixed
- [ ] Animations smooth (60fps)
- [ ] Haptic feedback working
- [ ] Accessibility audit passed

**After Phase 5 (Docs)**:
- [ ] Migration guide created
- [ ] CLAUDE.md updated
- [ ] Testing checklist documented

**Before merge**:
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Provider flow tested
- [ ] Client flow tested
- [ ] Language switching tested
- [ ] User approval obtained

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Status**: Ready for Review

---

_This specification provides the complete blueprint for TrackPay v2 UX redesign. Review, approve, and we'll begin implementation!_



------------------
need these changes ----
Design Issues 
  Identified:

  1. ClientListScreen 
  (Provider Dashboard)

  Current issues:
  - Missing "Work In
  Progress" section when
   session is active
  - Client cards need
  "▶ Start" button
  (currently missing or
  different)
  - Stop button should
  be red/maroon with "⏹
   Stop (1:15)" format
  - Avatars and layout
  need refinement

  Figma design shows:
  - "Total Outstanding"
  card at top ✓
  - "Work In Progress"
  section (when active
  session exists)
  - "My Clients" / "Your
   Clients" section
  - Each client card:
  Avatar + Name + "Due:
  $X.XX (X hrs)" + Black
   "▶ Start" button
  - Active session card:
   Avatar + Name + "Due:
   $0.00" + Red "⏹ Stop
   (1:15)" button

  2. ClientHistoryScreen
   (Client 
  Details/Activity)

  Current issues:
  - Activity timeline
  cards not matching
  design
  - Missing proper card
  styling
  - Timeline items need
  cleaner format

  Figma design shows:
  - Header with avatar +
   name + settings gear
  - "Total Outstanding"
  card with "⚡ Request
  Payment" button (white
   button with black
  border)
  - Date headers (e.g.,
  "Oct 14, 2025")
  - Timeline cards with:
    - "Work Session"
  title
    - Metadata:
  "Complete • 4 hours •
  1 person" or "Active
  since 9:34am • 1
  person"
    - "Payment
  Requested" cards:
  "Total: $100.50 •
  3.5hours"
  - Bottom button: Black
   "▶ Start Session" or
   Red "⏹ Stop Session"

  Let me update the todo
   list with these
  specific issues:

⏺ Yes, I'm clear on what
   needs to be done!

  Summary of Required 
  Changes:

  ClientListScreen 
  needs:
  1. ✅ "Total
  Outstanding" card
  (already exists)
  2. ❌ "Work In
  Progress" section -
  NEW - shows active
  session with red Stop
  button
  3. ❌ "My Clients"
  section - client cards
   with black "▶ Start"
   buttons
  4. ❌ Proper button
  styling and layout
  matching Figma exactly

  ClientHistoryScreen 
  needs:
  1. ❌ Cleaner timeline
   cards (simpler,
  matching Figma)
  2. ❌ "Request
  Payment" as WHITE
  button with BLACK
  border (not black bg)
  3. ❌ Bottom floating
  "Start Session"
  (black) / "Stop
  Session" (red) button
  4. ❌ Simplified
  timeline items: "Work
  Session" / "Payment
  Requested" titles
  5. ❌ Better metadata
  format: "Complete • 4
  hours • 1 person"

  Should I start with
  ClientListScreen first
   since it's the main
  dashboard? This will
  have the most visual
  impact and is what
  users see first.