# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TrackPay** (formerly "timesheets-app") is a two-sided time tracking and payment request app built with Expo (React Native). It features service provider and client views with real-time activity feeds, bilingual support (English/Spanish), and a hybrid storage architecture.

**⚠️ IMPORTANT**: The actual app code lives in the `ios-app/` subdirectory. Always run npm commands from `ios-app/` directory, not the repository root.

## Development Commands

All commands must be run from the `ios-app/` directory:

```bash
cd ios-app

# Development
npm run web              # Start Expo web (http://localhost:8081)
npm start               # Start with QR code for mobile (Expo Go)
npm run ios             # iOS simulator
npm run android         # Android emulator
npx expo start --clear  # Clear Metro cache and restart

# EAS Build & Deploy
npx expo-doctor                              # Pre-flight health check
eas build --platform ios --profile preview   # TestFlight build
eas submit --platform ios                    # Submit to App Store

# Production pre-flight check (CRITICAL before iOS builds)
grep -r "console\." src/ --include="*.tsx" --include="*.ts" | grep -v "__DEV__" | grep -v "console.error"
# Must return 0 results or app will crash on iOS
```

## Architecture Overview

### Storage & Data Layer

The app uses a **hybrid storage architecture** during the Supabase migration:

- **Legacy Mode**: Pure AsyncStorage (backward compatible)
- **Hybrid Mode**: Dual writes to both AsyncStorage + Supabase
- **Supabase Tables**:
  - `trackpay_users` - providers & clients
  - `trackpay_relationships` - provider-client associations
  - `trackpay_sessions` - work tracking (duration in minutes)
  - `trackpay_payments` - payment records
  - `trackpay_requests` - payment request workflow
  - `trackpay_activities` - activity feed

**Key Files**:
- `src/services/storage.ts` - Legacy AsyncStorage layer
- `src/services/supabase.ts` - Supabase client with TypeScript support
- `src/services/hybridStorage.ts` - Dual storage operations
- `src/services/storageAdapter.ts` - Type conversion between legacy/new schemas
- `src/services/storageService.ts` - Drop-in facade maintaining API compatibility

### Authentication & User Management

- **AuthContext** (`src/contexts/AuthContext.tsx`) - App-wide auth state
- **Supabase Auth** - Email/password authentication with session persistence
- **User Roles**: Provider (service provider) and Client
- **Navigation**: Role-based routing after authentication

### Navigation Structure

- **Stack Navigator**: Auth flow (Welcome → Login → Register)
- **Bottom Tab Navigator**: Main app (Clients, Activity, History, Settings)
- **Role-specific screens**:
  - **Provider**: ClientListScreen, SessionTrackingScreen, HistoryScreen
  - **Client**: ServiceProviderListScreen, ClientHistoryScreen

### Internationalization (i18n)

- **Supported Languages**: English, Spanish
- **Implementation**: react-i18next with expo-localization
- **Translation Files**: `src/i18n/simple.ts`
- **Hook**: `useLocale()` for language switching
- **Formatters**: `src/utils/localeFormatters.ts` (currency, dates, numbers)

### Styling System

- **Primary**: nativewind (Tailwind CSS for React Native)
- **Theme**: `src/styles/theme.ts` - iOS-style design system
- **Colors**: #007AFF (primary), #34C759 (success), #FF9500 (warning)
- **Spacing**: 8pt grid system
- **Border Radius**: 12px buttons, 16px cards
- **RULE**: Never mix `className` (nativewind) and `style` (StyleSheet) props

## Multi-Crew Feature (Current Development)

**Branch**: `multi-crew`

This branch implements support for multiple team members (crews) working together on sessions. Key changes involve:
- Session tracking with multiple participants
- Crew member management and assignment
- History view showing crew compositions
- Timeline view with crew-related events

## Environment Setup

### Required Files

**ios-app/.env** (not in git):
```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_NAME=TrackPay
```

Copy from template:
```bash
cd ios-app
cp .env.sample .env
# Edit .env with your Supabase credentials
```

### EAS Build Environment

For production builds, environment variables MUST be set as EAS secrets:
```bash
eas secret:create --name SUPABASE_URL --value "your-url"
eas secret:create --name SUPABASE_ANON_KEY --value "your-key"
eas secret:create --name APP_DISPLAY_NAME --value "TrackPay"
```

These are referenced in `ios-app/eas.json` via `$VARIABLE_NAME` syntax.

## Critical Development Rules

### 🚨 PRODUCTION iOS BUILD REQUIREMENTS

**Before ANY EAS build**, verify:

1. **Console Statement Audit** - iOS production builds crash on unguarded console.log:
   ```bash
   grep -r "console\." src/ --include="*.tsx" --include="*.ts" | grep -v "__DEV__" | grep -v "console.error"
   ```
   Must return **0 results**. All console.log must be wrapped:
   ```typescript
   if (__DEV__) { console.log('debug info'); }
   ```

2. **Error Boundary** - Wrap App.tsx with `<ErrorBoundary>` to prevent white screens

3. **Environment Variables** - Must be in eas.json, not just .env file

4. **Build Number** - Increment `buildNumber` in ios-app/app.json for each build

### Testing Philosophy

**NEVER** claim a feature works without:
1. ✅ Actually running the app and testing it visually
2. ✅ Taking screenshots and comparing to design specs
3. ✅ Verifying database state before/after operations
4. ✅ Testing as BOTH provider AND client users
5. ✅ Checking browser console for errors
6. ✅ Testing cross-user functionality (provider action → client sees update)

**"App compiles" ≠ "Feature works"**

### Business Logic Validation

Before implementing ANY feature involving data:

1. **Understand Complete Flow** - Map entire user journey and data states
2. **Check Existing Data** - Query Supabase to understand current state
3. **Verify Data Operations** - Are you creating new records when you should be updating existing ones?
4. **Database Verification** - Check database before AND after every operation
5. **Multi-User Testing** - Test as provider, then as client, verify relationships

**Common Anti-Pattern**: Creating duplicate records instead of claiming/updating existing ones (e.g., invite systems).

### 🚨 Permission Protocol

**CRITICAL RULE**: NEVER make changes that weren't explicitly requested by the user.

Before making ANY code change, ask yourself:
1. **Did the user explicitly ask for this?** - If no, STOP and ask permission first
2. **Am I changing existing behavior?** - If yes, verify this was requested
3. **Am I modifying navigation, data flow, or business logic?** - If yes, ensure this is part of the stated requirements

**Examples of UNAUTHORIZED changes**:
- Changing which screen a navigation goes to (e.g., ClientHistory → ClientProfile)
- Modifying data structures or API responses
- Altering business logic or calculations
- Removing or adding features that weren't mentioned
- Changing UX flows without explicit instruction

**When in doubt**: ASK the user before proceeding.

**Consequence**: Unauthorized changes break working functionality and erode trust.

### END-TO-END TESTING CHECKLIST

When testing is requested, this means COMPLETE end-to-end testing:

#### Provider Testing:
- [ ] Register as Provider → verify profile in database
- [ ] Login → land on ClientList screen
- [ ] Add Client → verify client record created
- [ ] Start Session → verify session record with start time
- [ ] Stop Session → verify session updated with end time and amount
- [ ] Request Payment → verify status change in database
- [ ] View History → see correct data and amounts
- [ ] Activity Feed → all actions appear

#### Client Testing:
- [ ] Claim Invite → create account
- [ ] Login → land on correct screen
- [ ] View Providers → see assigned providers
- [ ] View Sessions → see work tracked for them
- [ ] Mark Payment Sent → verify status updates
- [ ] Activity Timeline → see work and payment history

#### Cross-User Testing:
- [ ] Provider creates session → Client sees it immediately
- [ ] Client marks payment → Provider sees update
- [ ] Real-time updates work both ways
- [ ] Data consistency across users

#### Technical Verification:
- [ ] No console errors (only expected dev logs)
- [ ] No white screens
- [ ] Proper navigation transitions
- [ ] Data persists after refresh
- [ ] Error states show proper messages
- [ ] Loading indicators during async operations

### Code Quality Requirements

- **TypeScript**: Strict types, proper interfaces
- **Error Handling**: Graceful error states with user feedback
- **Offline-First**: App must work when Supabase is unreachable
- **Performance**: Efficient re-renders, avoid unnecessary state updates
- **Consistency**: Study existing patterns before creating new ones

### Commit Message Format

```
type(scope): description

feat(session-tracking): implement multi-crew session support - tested visually
fix(auth): resolve duplicate user creation on invite claim
style(client-list): update card shadows to match iOS design
refactor(storage): consolidate AsyncStorage operations
```

Types: `feat`, `fix`, `style`, `refactor`, `test`, `docs`, `chore`

## Test Accounts

**Provider**:
- Email: athahar+lucy@gmail.com
- Password: lucy123456

**Clients** (all use password: `demo123$`):
- ath.sub.007+kel@gmail.com
- ath.sub.007+molly@gmail.com
- athmash247@gmail.com
- ath.sub.007+sarah@gmail.com

## Key Files & Directories

```
ios-app/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ErrorBoundary.tsx      # Production error handling
│   │   ├── Toast.tsx              # Toast notification system
│   │   └── SimplifiedSyncStatus.tsx  # Storage sync indicator
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx        # Auth state management
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.tsx       # Root navigator with auth flow
│   ├── screens/          # Main app screens
│   │   ├── ClientListScreen.tsx           # Provider: client management
│   │   ├── SessionTrackingScreen.tsx      # Provider: time tracking
│   │   ├── ServiceProviderListScreen.tsx  # Client: view providers
│   │   └── ClientHistoryScreen.tsx        # Client: session history
│   ├── services/         # Data & API layer
│   │   ├── storage.ts              # Legacy AsyncStorage
│   │   ├── supabase.ts             # Supabase client
│   │   ├── hybridStorage.ts        # Dual storage manager
│   │   └── storageAdapter.ts       # Type converters
│   ├── i18n/             # Internationalization
│   │   ├── index.ts                # i18next setup
│   │   └── simple.ts               # EN/ES translations
│   ├── utils/            # Utility functions
│   │   ├── localeFormatters.ts     # Currency/date formatting
│   │   └── inviteCodeGenerator.ts  # Client invite codes
│   └── types/            # TypeScript definitions
│       └── index.ts                # Shared types
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
├── package.json          # Dependencies
└── .env                  # Local environment (not in git)

docs/spec/                # Feature specifications
├── database-migration-plan.md      # Supabase migration roadmap
├── client-invitation-system.md     # Invite flow spec
├── APPLE_DEPLOYMENT_SPEC.md        # iOS deployment checklist
├── APP_UX_REDESIGN.md              # Native iOS design patterns
└── BILINGUAL_IMPLEMENTATION_PLAN.md # i18n implementation

scripts/prod-migrate/     # Production database migrations
└── (see Production Database Migration section below)
```

## Migration Status

### ✅ Phase 1-2 Complete (Database + Storage Abstraction)
- Supabase schema created with 6 tables
- Hybrid storage layer operational
- AsyncStorage + Supabase dual writes working
- Type-safe database operations

### 🚧 Current Phase: Phase 3 - Parallel Mode Implementation
- Real-time subscriptions setup
- Conflict resolution strategies
- UI sync indicators

### 📋 Remaining Phases
- Phase 4: Authentication Integration
- Phase 5: Core Data Migration
- Phase 6: Real-time Features
- Phase 7: UI Polish & Bug Fixes
- Phase 8: Testing & Deployment

See `docs/spec/database-migration-plan.md` for complete roadmap.

## Troubleshooting

### Metro Bundle Issues
```bash
cd ios-app
npx expo start --clear
```

### Styling Not Rendering
- Check if mixing `className` and `style` props (DON'T)
- Verify nativewind config in tailwind.config.js
- Clear Metro cache

### Supabase Connection Issues
- Verify .env file has correct URL and anon key
- Check browser console for connection errors
- Test Supabase queries in SQL Editor first

### White Screen on iOS Production Build
- 99% caused by unguarded console.log statements
- Run console audit command (see Production iOS Build Requirements)
- Wrap all console statements with `if (__DEV__) { }`

### Navigation Issues
- Ensure all navigation dependencies installed
- Check React Navigation version compatibility
- Verify route names match navigator configuration

## Design System

- **Colors**: iOS-style colors (primary: #007AFF, success: #34C759, warning: #FF9500)
- **Typography**: Apple system fonts with proper hierarchy
- **Spacing**: 8pt grid system (8, 16, 24, 32px)
- **Shadows**: Subtle shadows for cards and buttons
- **Border Radius**: 12px for buttons, 16px for cards

## Feature Specifications

Detailed specs are in the `docs/spec/` directory:
- **Database Migration**: `database-migration-plan.md`
- **Apple Deployment**: `APPLE_DEPLOYMENT_SPEC.md`
- **UX Redesign**: `APP_UX_REDESIGN.md`
- **Bilingual Support**: `BILINGUAL_IMPLEMENTATION_PLAN.md`
- **Invite System**: `client-invitation-system.md`

Read these specs BEFORE implementing related features.

---

## Production Database Migration

### 🚀 Production-Ready Migration Plan

**Location:** `docs/prod-migrate/plan.md`

This is the **authoritative guide** for setting up a production Supabase database with correct schema, RLS, and performance optimizations.

**Key Features:**
- ✅ Schema-only migration (no data transfer)
- ✅ Correct auth pattern (auth.uid() → trackpay_users.id mapping)
- ✅ Row Level Security with helper function
- ✅ Performance indexes for all query patterns
- ✅ Realtime subscriptions enabled
- ✅ Foreign key protection (RESTRICT for business data)
- ✅ Audit logging
- ✅ Schema drift detection

**Migration Files:** All located in `scripts/prod-migrate/` (repository root)

| File | Purpose |
|------|---------|
| `000_extensions.sql` | Install pgcrypto + pg_stat_statements |
| `010_realtime.sql` | Enable realtime for all 8 tables |
| `015_rls_helper.sql` | **CRITICAL** - Auth helper function + unique constraint |
| `020_rls_policies.sql` | RLS policies with correct auth pattern |
| `030_indexes.sql` | 14 performance indexes |
| `040_manifest.sql` | Schema drift detection |
| `20251015_fix_fk_SAFE_SEQUENTIAL.sql` | FK constraint fixes |
| `20251015_fix_session_fk_cascades.sql` | Session FK fixes |
| `20251016_fix_delete_rpc_provider_lookup.sql` | Delete client RPC |

### ⚠️ CRITICAL: Auth Pattern

**The production database MUST use the correct auth pattern or RLS will lock everyone out!**

```sql
-- WRONG (will fail in production):
USING (provider_id = auth.uid())  -- ❌

-- CORRECT (uses helper function):
USING (provider_id = current_trackpay_user_id())  -- ✅
```

**Why?** Our auth pattern is: `auth.users.id` → `trackpay_users.auth_user_id` → `trackpay_users.id`

The `current_trackpay_user_id()` helper function bridges this gap. See `docs/prod-migrate/plan.md` for full explanation.

### 📋 Quick Start

1. Read `docs/prod-migrate/plan.md` (comprehensive guide)
2. Run migrations from `scripts/prod-migrate/` in order
3. Verify with `040_manifest.sql`
4. Update app config (`.env` and EAS secrets)
5. Test thoroughly

**Estimated Time:** ~45 minutes for complete setup

---

**Remember**: Test everything. Verify database state. Be honest about feature status. Ship working, beautiful features.
