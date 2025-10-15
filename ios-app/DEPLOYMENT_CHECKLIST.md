# TrackPay iOS Deployment Checklist

## ✅ COMPLETED - Ready for TestFlight Build

### Critical iOS Production Fixes (Build 6)

#### 1. Console Statement Handling (WaddlePlay Proven Approach)
- ✅ Installed `babel-plugin-transform-remove-console`
- ✅ Updated `babel.config.js` to automatically strip ALL console statements in production builds
- ✅ No manual wrapping needed - babel plugin handles 108+ console statements automatically
- ✅ Works in development (console.log visible), removed in production (prevents iOS crashes)

**Implementation:**
```javascript
// babel.config.js
plugins: [
  // Remove console.log statements in production builds
  process.env.NODE_ENV === 'production' && 'transform-remove-console',
].filter(Boolean),
```

#### 2. Build Configuration
- ✅ Build number incremented: 5 → 6
- ✅ Version: 1.1.0
- ✅ Bundle ID: com.trackpay.track
- ✅ Deleted broken test file: `src/i18n/simple_broken.ts`

### Pre-Build Checklist

Before running `eas build --platform ios --profile preview`:

1. **Environment Variables** (Required)
   - [ ] Verify EAS secrets are set:
     ```bash
     eas secret:list
     ```
   - [ ] Should show: SUPABASE_URL, SUPABASE_ANON_KEY, APP_DISPLAY_NAME

2. **Health Check**
   ```bash
   cd ios-app
   npx expo-doctor
   ```

3. **Error Boundary**
   - [ ] Verify ErrorBoundary wraps App.tsx
   - [ ] Check for production-safe error handling

4. **Assets**
   - [ ] Verify app icon exists: `assets/app-icon.png`
   - [ ] Verify splash screen exists: `assets/splash-icon.png`

5. **Build Command**
   ```bash
   eas build --platform ios --profile preview
   ```

## 📋 NON-BLOCKING CLEANUP TASKS (Follow-up PR)

These TypeScript errors do NOT prevent iOS deployment but should be addressed in a cleanup PR:

### Theme/Color System Issues (47 errors)
- [ ] Fix duplicate color properties in `src/styles/theme.ts`
- [ ] Add missing color properties: `black`, `white`, `primary`, `surface`, `slate50`, `slate200`, `slate400`, `slate500`
- [ ] Resolve ColorValue type issues in Button.tsx

### Type Safety Improvements (36 errors)
- [ ] Fix Supabase query builder type assertions in `syncQueue.ts`
- [ ] Add proper type guards for `unknown` types in ServiceProviderListScreen
- [ ] Fix AuthContext type issues
- [ ] Add proper types to i18n translation function

### Data Model Updates
- [ ] Add `payment_request_created` to activity type union in ClientHistoryScreen
- [ ] Update activity type definitions to match current usage

### Code Quality
- [ ] Review and fix type mismatches in RegisterScreen, ClientHistoryScreen
- [ ] Add proper null handling for optional properties
- [ ] Clean up any remaining lint warnings

## 🚀 Deployment Commands

### Build for TestFlight
```bash
cd ios-app
eas build --platform ios --profile preview
```

### Submit to App Store (after TestFlight approval)
```bash
eas submit --platform ios
```

### Check Build Status
```bash
eas build:list
```

## 📊 Build History

- **Build 5**: Previous build
- **Build 6** (Current): Console statement fix via babel plugin

## 🔍 Post-Deployment Verification

After successful TestFlight build:
1. [ ] Install TestFlight build on physical iOS device
2. [ ] Verify no console-related crashes
3. [ ] Test provider workflow: Create client, start session, end session, request payment
4. [ ] Test client workflow: View providers, view sessions, mark payment sent
5. [ ] Test bilingual support (English/Spanish toggle)
6. [ ] Verify real-time updates work between provider and client
7. [ ] Check activity feed displays correctly
8. [ ] Test offline/online scenarios

## 📝 Notes

### Why Babel Plugin Approach?

Based on WaddlePlay (successfully deployed 21+ times to App Store):
- **Simple**: One-time configuration, no manual code changes
- **Reliable**: Babel automatically strips ALL console.* calls in production
- **Maintainable**: New console statements automatically handled
- **Proven**: Production-tested approach used by successful apps

### Alternative Approaches (Not Recommended)
- ❌ Manual wrapping of 108+ console statements with `if (__DEV__)`
  - Time-consuming (4+ hours)
  - Error-prone (easy to miss statements)
  - Hard to maintain (new code requires manual wrapping)

## 🔗 Related Documentation

- `spec/APPLE_DEPLOYMENT_SPEC.md` - Complete iOS deployment guide
- `ios-app/eas.json` - EAS build configuration
- `ios-app/app.json` - App configuration and metadata
- `CLAUDE.md` - Project overview and development guidelines
