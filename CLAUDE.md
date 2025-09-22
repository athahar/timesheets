# Timesheet App Development Guidelines

## Project Overview
A two-sided time tracking and payment request app built with Expo (React Native), featuring service provider and client views with real-time activity feeds. Uses AsyncStorage for persistence with plans to migrate to Supabase.

## Development Best Practices

### CRITICAL: Test Before Declaring Ready
- **NEVER** claim a feature works without actually testing it visually
- **ALWAYS** take screenshots and compare against design requirements
- **VERIFY** that styles are actually rendering, not just code compiling
- **TEST** the app in the browser before saying it's complete

### Testing Strategy
- **Visual Testing**: Compare screenshots against mockups/designs
- **Functional Testing**: Test time tracking, payments, navigation flows
- **Cross-Platform Testing**: Verify on both web (Expo Web) and mobile (Expo Go)
- **Data Persistence**: Test AsyncStorage functionality across sessions
- **Edge Cases**: Test with no data, error states, partial payments

### Styling Approach Consistency
- **Choose ONE**: Either use nativewind/Tailwind OR React Native StyleSheet
- **NO MIXING**: Don't mix className and style props in same project
- **Theme System**: Use consistent colors, spacing, typography
- **Test Styles**: Verify styles actually render in browser, not just compile

### Commit Guidelines
- **Descriptive Messages**: Explain what actually changed and why
- **Visual Changes**: Include before/after screenshots when relevant
- **Test Results**: Note if feature was actually tested
- **Conventional Format**: `type(scope): description`
  - `feat`: New features
  - `fix`: Bug fixes
  - `style`: Visual/styling changes
  - `refactor`: Code restructuring
  - `test`: Adding tests
  - `docs`: Documentation
- **Example**: `feat(session-tracking): implement Apple-style cards with shadows - tested visually`

### Code Quality Standards
- **TypeScript**: Strict types, proper interfaces
- **Error Handling**: Graceful error states and user feedback
- **Performance**: Efficient state management and re-renders
- **Accessibility**: Proper touch targets and labels
- **Consistency**: Follow existing patterns in codebase

### Architecture Patterns
- **Follow Existing**: Study current components before creating new ones
- **AsyncStorage**: Use established storage service patterns
- **Navigation**: Follow React Navigation patterns
- **State Management**: Use React hooks consistently
- **File Organization**: Maintain `/src` folder structure

### Development Workflow
1. **Understand Requirements**: Study mockups and specifications
2. **Check Existing Code**: See how similar features are implemented
3. **Choose Styling Approach**: Use consistent method throughout
4. **Implement Incrementally**: Build and test small pieces
5. **Visual Verification**: Take screenshots and compare to requirements
6. **Functional Testing**: Test all user flows work correctly
7. **Cross-Platform Check**: Verify on web and mobile if possible

### Quality Gates - Definition of Done
A feature is only complete when:
- [ ] Functionality works as specified
- [ ] Visual design matches requirements/mockups
- [ ] No console errors in browser
- [ ] Styles actually render (not just compile)
- [ ] Navigation flows work correctly
- [ ] Data persistence functions properly
- [ ] Screenshots verify visual quality
- [ ] Code follows project patterns

### Commands Reference
- `npm run web` - Start Expo web development
- `npm start` - Start Expo with QR code for mobile
- `npx expo start --clear` - Clear cache and restart
- `npm run android` - Android development
- `npm run ios` - iOS development

### Environment Setup
- **Expo CLI**: Use for development and building
- **AsyncStorage**: For local data persistence
- **React Navigation**: For app navigation
- **StyleSheet vs nativewind**: Choose one approach consistently

### Troubleshooting
- **Styling Issues**: Check if classes/styles actually apply in browser
- **Metro Issues**: Clear cache with `--clear` flag
- **Import Errors**: Verify file paths and extensions
- **Navigation Issues**: Check navigator setup and route params
- **AsyncStorage**: Use debugging to verify data persistence

## Specific App Guidelines

### Design System
- **Colors**: iOS-style colors (primary: #007AFF, success: #34C759, warning: #FF9500)
- **Typography**: Apple system fonts with proper hierarchy
- **Spacing**: 8pt grid system (8, 16, 24, 32px)
- **Shadows**: Subtle shadows for cards and buttons
- **Border Radius**: 12px for buttons, 16px for cards

### Key Features
- **Time Tracking**: Start/stop sessions with live timer
- **Payment Requests**: Request and mark payments as paid
- **Activity Feed**: Real-time updates between service provider and client
- **Client Management**: Add clients with hourly rates
- **History**: View past sessions and payment status

### Data Flow
- **AsyncStorage**: All data persisted locally
- **Real-time Updates**: Activity feed updates when actions occur
- **State Management**: React hooks for component state
- **Navigation**: React Navigation with tabs and stack

### Testing Checklist
- [ ] Session tracking works (start/stop/timer)
- [ ] Payment flow works (request/mark paid)
- [ ] Client management works (add/view clients)
- [ ] Activity feed updates properly
- [ ] Navigation between screens works
- [ ] Data persists between app restarts
- [ ] Visual design matches mockups
- [ ] No console errors
- [ ] App loads without crashes

## ⚠️ CRITICAL: Business Logic Validation Requirements

### Before Implementing ANY Feature:
1. **Understand the Complete Business Flow**
   - Draw out the entire user journey from start to finish
   - Identify ALL data states and transitions
   - Question: "What records exist before this action, and what should happen to them?"

2. **Database State Analysis** (MANDATORY for any CRUD operations)
   - Check existing data in Supabase BEFORE coding
   - Understand what records should be created, updated, or linked
   - Verify that my implementation matches the intended data flow
   - Ask: "Am I creating new records when I should be updating existing ones?"

3. **End-to-End Logic Verification**
   - Trace through the ENTIRE flow with sample data
   - For invite systems: Provider creates → Client claims → Verify ONE record exists
   - For auth systems: Registration → Profile creation/linking → Login → Verify correct user state

### Testing Methodology (NON-NEGOTIABLE):
1. **Test with REAL Data States**
   - Don't just test "happy path" - test with actual existing data
   - For invites: Create unclaimed record → Test claiming process → Verify database state
   - Check database BEFORE and AFTER each operation

2. **Database Verification Required**
   - After every test, check the actual database records
   - Count records: "Should there be 1 user or 2? Why?"
   - Verify IDs, relationships, and data integrity

3. **Multi-User Flow Testing**
   - Test as Provider: Create invite, check database
   - Test as Client: Use invite, register, check database
   - Verify the relationship works correctly

### Code Review Questions (Ask BEFORE claiming "tested"):
- [ ] Did I check the database state before and after my changes?
- [ ] Does my implementation create duplicates when it should update existing records?
- [ ] Did I test the complete user journey, not just individual functions?
- [ ] Do the database records match what the business logic requires?
- [ ] If this involves claiming/linking, am I updating the right existing record?

### Specific Anti-Patterns to Avoid:
❌ **Creating new records when existing ones should be claimed/updated**
❌ **Testing only individual functions without full user flows**
❌ **Claiming "tested" without checking database state**
❌ **Implementing auth/profile logic without understanding existing data relationships**

✅ **Always understand what data exists BEFORE implementing changes**
✅ **Test complete flows with realistic data scenarios**
✅ **Verify database state matches business requirements**
✅ **Think: "Am I modifying the right existing records, or incorrectly creating new ones?"**

### Common Pitfalls
- **Styling Not Rendering**: Verify approach (nativewind vs StyleSheet) works
- **Missing Dependencies**: Install required packages for chosen approach
- **Cache Issues**: Clear Metro cache when making major changes
- **Platform Differences**: Test behavior on both web and mobile
- **AsyncStorage**: Handle async operations properly with try/catch

## TrackPay Migration Status

### ✅ Phase 1 Complete: Database Foundation (September 21, 2025)

**🎯 Completed Tasks:**
- ✅ App rebranded from "timesheets-app" to "TrackPay" (v2.0.0)
- ✅ Supabase dependencies installed and configured
- ✅ Environment variables properly set up (URL + anon key only)
- ✅ Complete database schema created with 6 tables:
  - `trackpay_users` (providers & clients) - 5 sample records
  - `trackpay_relationships` (provider-client associations)
  - `trackpay_sessions` (work tracking with duration in minutes)
  - `trackpay_payments` (payment records)
  - `trackpay_requests` (payment request workflow)
  - `trackpay_activities` (activity feed)
- ✅ Computed views and indexes for performance
- ✅ Row Level Security (RLS) configured (temporarily open for development)
- ✅ Abstract storage interface designed for hybrid operations
- ✅ Supabase client with TypeScript support and error handling
- ✅ Hybrid storage service foundation built

**📁 Key Files Created:**
- `.env` - Supabase configuration (excluded from git)
- `database/schema.sql` - Complete database schema
- `database/create-tables.sql` - Optimized for Supabase SQL Editor
- `src/services/database.interface.ts` - Abstract storage interface
- `src/services/supabase.ts` - Type-safe Supabase client
- `src/services/hybridStorage.ts` - Dual storage implementation
- `DATABASE_SETUP.md` - Complete setup and troubleshooting guide
- `spec/database-migration-plan.md` - Migration specification

**🔧 Technical Foundation:**
- Offline-first architecture with AsyncStorage fallback
- Type-safe database operations with full TypeScript support
- Real-time subscription capability ready for Phase 6
- Progressive migration strategy preserving existing functionality
- Security-first approach with proper credential management

### ✅ Phase 2 Complete: Storage Layer Abstraction (September 21, 2025)

**🎯 Completed Tasks:**
- ✅ Analyzed existing storage.ts operations and patterns
- ✅ Created StorageAdapter with type converters and legacy compatibility
- ✅ Implemented complete legacy API in HybridStorageService
- ✅ Built StorageService facade for seamless API compatibility
- ✅ Updated App.tsx to use hybrid storage for initialization
- ✅ Verified app functionality with new storage layer

**📁 New Files Created:**
- `src/services/storageAdapter.ts` - Type conversion and legacy compatibility
- `src/services/storageService.ts` - Drop-in replacement facade for storage.ts
- Updated `src/services/hybridStorage.ts` - Full legacy API implementation

**🔧 Technical Achievements:**
- **Perfect API Compatibility**: Existing components work unchanged
- **Dual Storage Operation**: AsyncStorage + Supabase working in parallel
- **Offline-First Design**: App works even when Supabase is unreachable
- **Type Safety**: Full TypeScript support with legacy and new schemas
- **Progressive Enhancement**: Supabase features when online, AsyncStorage fallback

**📋 Next Phase Ready:** Phase 3 - Parallel Mode Implementation

### 🚀 Migration Phases Remaining:
- **Phase 3:** Parallel Mode Implementation (Days 5-7)
- **Phase 4:** Authentication Integration (Days 8-9)
- **Phase 5:** Core Data Migration (Days 10-12)
- **Phase 6:** Real-time Features (Days 13-14)
- **Phase 7:** UI Polish & Bug Fixes (Days 15-16)
- **Phase 8:** Testing & Deployment (Days 17-18)

### 🔍 Current Status:
- **Database:** ✅ Fully operational with sample data
- **Connection:** ✅ Supabase client working perfectly
- **Legacy App:** ✅ Now running on hybrid storage (backwards compatible)
- **Storage Layer:** ✅ Abstracted and ready for parallel mode
- **Ready for:** Phase 3 implementation

## Emergency Recovery
If the app is broken or styles aren't working:
1. Check console for errors
2. Clear Metro cache: `npx expo start --clear`
3. Verify all dependencies are installed
4. Check if styling approach is consistent
5. Compare working version with current code
6. Test with minimal example first
7. **NEW:** Check Supabase connection status in console
8. **NEW:** Verify `.env` file has correct credentials

Remember: **Ship working, beautiful features. Test everything. Be honest about current state.**