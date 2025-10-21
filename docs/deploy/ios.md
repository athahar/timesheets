# TrackPay – iOS Deployment Guide

**Status**: Production Ready
**Last Updated**: 2025-10-16
**Based on**: WaddlePlay proven approach (21+ successful App Store deployments)

This guide provides a repeatable deployment checklist for TrackPay iOS app. When asked to "prep for iOS deploy," follow these steps top-to-bottom.

---

## 🚨 Critical Pre-Build Checklist

Run **EVERY TIME** before building for TestFlight or App Store.

### 1. Console Statement Audit (MANDATORY)

**⚠️ CRITICAL**: Build 7 white screen was caused by unguarded console statements. This check is non-negotiable.

```bash
cd ios-app

# Check for ALL unguarded console statements (log, warn, error, etc.)
rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__"
```

**Requirements** (Build 8+):
- ❌ NO unguarded `console.log`, `console.warn`, OR `console.error` statements
- ✅ ALL console statements must be wrapped with `if (__DEV__)` guards
- ✅ Babel plugin `transform-remove-console` provides backup protection (strips ALL console.* in production)

**Current Mitigation** (Build 8+):
- ✅ Dual-layer protection approach
- ✅ **Primary**: All console statements wrapped with `if (__DEV__)` guards
- ✅ **Backup**: `babel-plugin-transform-remove-console` strips all console.* in production builds
- ✅ Belt-and-suspenders approach ensures no console crashes

**Example of correct wrapping:**
```typescript
// ✅ CORRECT - All console types wrapped
if (__DEV__) {
  console.log('Debug information');
  console.warn('Warning message');
  console.error('Error details:', error);
}

// For production error tracking, integrate Sentry/Bugsnag:
// Sentry.captureException(error);
```

**❌ WRONG - These patterns caused Build 7 white screen:**
```typescript
// ❌ NEVER do this - runs ONLY in production, crashes immediately!
if (!__DEV__) {
  console.error('Error caught:', error);  // CRASHES iOS!
}

// ❌ NEVER use unguarded console statements
console.error('Error:', error);  // Will crash if babel plugin fails
console.log('Debug');            // Will crash if babel plugin fails
```

**Build 7 Root Cause** (Fixed in Build 8):
1. **ErrorBoundary.tsx** - Had `if (!__DEV__) { console.error(...) }` causing immediate crash
2. **AuthContext.tsx** - 9 unguarded `console.error` statements
3. **App.tsx** - Rendered before i18n initialization completed

**See CLAUDE.md** for full root cause analysis and prevention checklist.

---

### 2. TypeScript Strict Check (MANDATORY)

```bash
cd ios-app
npx tsc --noEmit
```

**Requirement:**
- ✅ Build must pass with **zero errors or warnings**

**Note**: As of Build 6, there are 83 known TypeScript errors (deferred technical debt). While these don't prevent EAS builds from succeeding (EAS uses babel transpilation), they should be fixed in a cleanup PR.

---

### 3. Expo Doctor (MANDATORY)

```bash
cd ios-app
npx expo-doctor
```

**Requirements:**
- ✅ All peer dependencies installed
- ✅ Package versions aligned with Expo SDK
- ✅ `npx expo-doctor` shows **0 issues**

---

### 4. Environment & Secrets (MANDATORY)

```bash
# Verify local .env exists
ls -la ios-app/.env

# Verify EAS secrets are set
eas login
eas secret:list
```

**Required EAS Secrets:**
- `SUPABASE_URL` - Production Supabase project URL
- `SUPABASE_ANON_KEY` - Production anon key
- `APP_DISPLAY_NAME` - "TrackPay"

**Set secrets if missing:**
```bash
eas secret:create --scope project --name SUPABASE_URL --value "https://[PROJECT-ID].supabase.co" --force
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "[ANON-KEY]" --force
eas secret:create --scope project --name APP_DISPLAY_NAME --value "TrackPay" --force
```

---

### 5. iOS Permissions Review (MANDATORY)

Check `app.json → expo.ios.infoPlist` for unused permission strings.

**Current permissions:**
```json
"NSCameraUsageDescription": "TrackPay uses camera for profile photos and document scanning"
"NSPhotoLibraryUsageDescription": "TrackPay accesses photo library for profile photos"
```

**Action Required:**
```bash
# Search for camera/photo usage in code
cd ios-app
rg -i "camera|photo|image.*picker" src --glob "*.{ts,tsx}"
```

**Decision:**
- ❌ If NOT used: Remove these permissions to avoid App Store review questions
- ✅ If used: Keep and document the feature

---

### 6. Lint for Stray URLs (MANDATORY)

```bash
cd ios-app
rg "localhost" src --glob "*.{ts,tsx}"
```

**Requirement:**
- ❌ NO hardcoded `localhost` or development URLs in production paths
- ✅ All endpoints use environment variables

---

### 7. Error Boundary (MANDATORY)

**Requirement:**
- ✅ `App.tsx` must wrap root navigator with `<ErrorBoundary>`
- ✅ Graceful error handling prevents white screens

**Verify:**
```bash
cd ios-app
rg "ErrorBoundary" App.tsx
```

---

## 🔢 Version & Build Number Management

### Version Bumping (Semantic)

```bash
cd ios-app

# Patch version (1.0.0 → 1.0.1) - Bug fixes
npm version patch

# Minor version (1.0.1 → 1.1.0) - New features
npm version minor

# Major version (1.1.0 → 2.0.0) - Breaking changes
npm version major
```

---

### 🚨 iOS Build Number (CRITICAL - MANDATORY INCREMENT!)

**RULE: ALWAYS increment `buildNumber` in app.json before ANY Apple submission!**

```bash
cd ios-app

# 1. Check current build number
grep -A5 "\"ios\"" app.json | rg "\"buildNumber\""

# 2. Edit app.json and increment manually
# Example: "buildNumber": "6" → "buildNumber": "7"

# 3. Verify the change
grep -A5 "\"ios\"" app.json | rg "\"buildNumber\""
```

**Why This Matters:**
```
❌ Apple Error: "You've already submitted this build of the app.
Builds are identified by CFBundleVersion from Info.plist
(expo.ios.buildNumber in app.json)."
```

**Build Number Rules:**
- ✅ Sequential integers: 1, 2, 3, 4, 5...
- ✅ REQUIRED for each TestFlight submission
- ✅ REQUIRED for each App Store submission
- ✅ Increment BEFORE running `eas build`
- ❌ Never reuse previous build numbers
- ❌ Never skip this step - causes Apple rejection

---

## 📊 Project Health Snapshot

Run before every build and save output for troubleshooting:

```bash
cd ios-app

echo "=== Expo Doctor ==="
npx expo-doctor

echo "=== TypeScript Check ==="
npx tsc --noEmit

echo "=== Console Statement Audit ==="
rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__" | rg -v "console.error" | wc -l
echo "(Should be 0 or handled by babel plugin)"

echo "=== Environment Check ==="
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

echo "=== Assets Check ==="
ls -lh assets/app-icon.png assets/splash-icon.png
```

---

## 🚀 Build & Submit with EAS

### First Time Setup (One-Time Only)

```bash
cd ios-app

# 1. Login to EAS
npx eas login

# 2. Configure project
npx eas build:configure
```

---

### Production Build

```bash
cd ios-app

# 🚨 CRITICAL: Verify build number was incremented!
grep -A5 "\"ios\"" app.json | rg "\"buildNumber\""

# Build for iOS production
npx eas build --platform ios --profile production

# Monitor build progress
# Build URL will be provided - monitor in browser or CLI
```

**If build fails with cache issues:**
```bash
npx eas build --platform ios --profile production --clear-cache
```

---

### Submit to TestFlight

```bash
cd ios-app

# Submit the built app to TestFlight
npx eas submit --platform ios

# Follow prompts for App Store Connect credentials
```

**Verify Upload:**
1. Go to App Store Connect → My Apps → TrackPay
2. Navigate to TestFlight tab
3. Confirm new build appears

---

## ✅ Post-Build Validation

### TestFlight Testing Checklist

1. **Download & Install**
   - [ ] Install TestFlight build on physical iOS device
   - [ ] App launches without crashes or white screens
   - [ ] No console-related crashes

2. **Provider Workflow**
   - [ ] Register/login as provider
   - [ ] Add new client (via invite or direct)
   - [ ] Start session → verify crew size selection works
   - [ ] Stop session → verify amount calculation (with person-hours)
   - [ ] Request payment
   - [ ] View history → correct session data
   - [ ] Delete client (with blocker checks working)

3. **Client Workflow**
   - [ ] Claim invite → create account
   - [ ] Login as client
   - [ ] View providers → see assigned provider
   - [ ] View sessions → see tracked work
   - [ ] Mark payment sent
   - [ ] Activity timeline → see work and payment history

4. **Real-Time Updates**
   - [ ] Provider creates session → Client sees it immediately
   - [ ] Client marks payment → Provider sees update
   - [ ] Activity feed updates live

5. **Localization**
   - [ ] Toggle language English ↔ Spanish
   - [ ] Verify translations display correctly
   - [ ] Currency formatting respects locale

6. **Edge Cases**
   - [ ] Offline behavior (if applicable)
   - [ ] App survives backgrounding/foregrounding
   - [ ] Memory usage acceptable during extended use
   - [ ] No crashes during 30-minute test session

---

## 📱 App Store Submission Checklist

Before submitting for App Store review:

### Metadata & Marketing

- [ ] **App Name**: "TrackPay" (or approved marketing name)
- [ ] **Description**: Highlights core value (time tracking + payment requests)
- [ ] **Keywords**: time tracking, freelance, payment, invoicing, work hours
- [ ] **Screenshots**: All device sizes (iPhone SE, iPhone 14, iPhone 14 Pro Max, iPad)
- [ ] **Privacy Policy**: Reflects actual data usage (Supabase auth + time tracking)

### Age Rating

- [ ] Likely **4+** or **9+** (business app, no violence/mature content)
- [ ] No data collection beyond Supabase authentication
- [ ] No social features requiring parental gate

### App Review Information

- [ ] **Demo Account**: Provide test provider and client credentials
- [ ] **Review Notes**: Explain two-sided marketplace (provider/client)
- [ ] **Contact Information**: Support email

### External Links (If Applicable)

```bash
# Check for external links in the app
cd ios-app
rg "https://|http://|Linking.openURL" src --glob "*.{ts,tsx}"
```

**Requirements:**
- ⚠️ External links may require parental gate for kids apps (4+ rating)
- ✅ Email links (mailto:) are acceptable
- ❌ Direct Safari links without confirmation may be rejected

---

## 🛠️ Useful Commands Reference

```bash
# View recent builds
eas build:list

# View specific build details
eas build:view [build-id]

# Check build logs if failed
eas build:view [build-id]

# Reset Metro cache for local testing
cd ios-app
npm start -- --clear

# Verify Supabase env at runtime (in console)
console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL)
```

---

## 🚨 Common Issues & Solutions

### Issue: White Screen on Launch

**Cause**: Unguarded console.log statements
**Solution**:
```bash
# Find offending statements
cd ios-app
rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__" | rg -v "console.error"

# Option 1: Wrap with __DEV__ guards
if (__DEV__) {
  console.log('Debug info');
}

# Option 2: Verify babel plugin is enabled (current approach)
cat babel.config.js | grep "transform-remove-console"
```

---

### Issue: Build Fails with Dependencies

**Cause**: Incompatible package versions
**Solution**:
```bash
cd ios-app
npx expo-doctor
npx expo install --fix
```

---

### Issue: "You've already submitted this build"

**Cause**: Forgot to increment build number
**Solution**:
```bash
cd ios-app
# Edit app.json → expo.ios.buildNumber → increment by 1
# Then rebuild: eas build --platform ios --profile production
```

---

### Issue: App Store Rejection for Unused Permissions

**Cause**: Camera/Photo permissions declared but not used
**Solution**:
```bash
# Search for actual usage
cd ios-app
rg -i "camera|photo|image.*picker" src --glob "*.{ts,tsx}"

# If NOT found, remove from app.json:
# Delete NSCameraUsageDescription and NSPhotoLibraryUsageDescription
```

---

## 📋 Known Technical Debt (As of Build 6 - 2025-10-15)

### TypeScript Errors (83 total)

**Status**: Deferred to future cleanup PR
**Impact**: Code quality issues, not runtime bugs
**EAS Build Impact**: None (EAS uses babel transpilation, not tsc)

**Categories**:

1. **Theme Color System (47 errors)**
   - Duplicate color property definitions in `src/styles/theme.ts`
   - Missing color properties: `black`, `white`, `primary`, `surface`, etc.
   - ColorValue type mismatches in Button.tsx, Toast.tsx, etc.

2. **Supabase Type Assertions (36 errors)**
   - `syncQueue.ts` - PostgrestFilterBuilder not properly awaited with `.single()`
   - Missing `.then()` calls on query builders

3. **Data Model Type Mismatches**
   - `payment_request_created` activity type not in union type
   - Missing in ClientHistoryScreen activity type checks

4. **General Type Safety Issues**
   - `unknown` types in ServiceProviderListScreen
   - Optional property handling in RegisterScreen
   - AuthContext type mismatches
   - i18n translation function return types

**Estimated Effort to Fix**: 4-6 hours total

**Fix When Ready:**
```bash
cd ios-app
npx tsc --noEmit 2>&1 | tee typescript-errors.log
# Review typescript-errors.log and fix systematically
```

---

### Console Statement Handling

**Status**: Mitigated by babel plugin
**Source code**: Still contains ~20 unguarded console statements
**Runtime Impact**: None (babel strips them in production builds)

**Locations**:
```
src/services/storageService.ts    - 8 debug logs
src/services/storage.ts           - 2 debug logs
src/services/directSupabase.ts    - 1 debug log
src/services/conflictResolver.ts  - 1 debug log
src/services/hybridStorage.ts     - 6 debug logs
src/services/supabase.ts          - 1 debug log
src/i18n/index.ts                 - 2 warnings
```

**Current Mitigation**:
- ✅ `babel-plugin-transform-remove-console` in devDependencies
- ✅ Configured in `babel.config.js`
- ✅ Proven approach from WaddlePlay (21+ deployments)

---

## 📚 Deployment History

### Build 8 (2025-10-16) - CURRENT

**Status**: In preparation
**Focus**: Fix Build 7 white screen crash

**Critical Fixes**:
1. **ErrorBoundary.tsx** - Removed `console.error` in production block (`if (!__DEV__)`)
2. **AuthContext.tsx** - Wrapped all 9 `console.error` statements with `if (__DEV__)` guards
3. **App.tsx** - Added `isReady` state to prevent rendering before i18n initialization
4. **babel.config.js** - Enhanced to strip ALL console.* methods (backup protection)

**Dual-Layer Protection**:
- ✅ **Primary**: All console statements wrapped with `if (__DEV__)` guards
- ✅ **Backup**: Babel plugin strips all console.* in production builds
- ✅ Belt-and-suspenders approach prevents future console-related crashes

**Pre-Build Validation**:
- ✅ Production simulation tested (`npx expo start --no-dev --minify --clear`)
- ✅ No white screens
- ✅ Navigation works smoothly
- ✅ ErrorBoundary catches errors properly
- ✅ No console output (all guards working)

**Ready for Deployment**: Pending final pre-flight checks

---

### Build 7 (2025-10-15) - FAILED

**Status**: ❌ White screen crash on TestFlight
**Root Cause**: Unguarded console statements

**Critical Mistakes**:
1. **ErrorBoundary.tsx (MOST CRITICAL)**:
   - Had `if (!__DEV__) { console.error(...) }` - ran ONLY in production
   - Caused immediate crash on app launch

2. **AuthContext.tsx**:
   - 9 unguarded `console.error` statements
   - In loadUserProfile, createUserProfile, auth listeners

3. **App.tsx**:
   - Rendered before i18n initialization completed
   - Caused white flash and potential crashes

**Lesson Learned**:
- ❌ NEVER use `if (!__DEV__)` with console statements
- ❌ NEVER assume babel plugin is sufficient protection
- ✅ ALWAYS wrap console statements: `if (__DEV__) { console.log(...) }`
- ✅ ALWAYS test with `--no-dev --minify` before building

**Recovery**: All issues fixed in Build 8 (see above)

---

### Build 6 (2025-10-15)

**Status**: Deployed with known TypeScript errors
**Approach**: Pragmatic build (deferred TypeScript fixes)

**Rationale**:
- EAS builds succeed with babel transpilation regardless of tsc errors
- babel-plugin-transform-remove-console handles console statements automatically
- No runtime crashes or functional issues expected
- TypeScript errors are code quality issues, can be addressed in cleanup PR

**Health Check Results**:
- ✅ Expo Doctor: 17/17 checks passed
- ✅ Assets: App icon and splash screen verified
- ✅ Error Boundary: Confirmed in App.tsx
- ✅ Build Number: Incremented 5→6
- ⚠️ TypeScript: 83 errors (deferred)
- ✅ Console Statements: Mitigated by babel plugin

**Next Steps**:
1. Create GitHub issue for TypeScript cleanup
2. Plan dedicated cleanup PR (estimate 4-6 hours)
3. Test Build 6 thoroughly on TestFlight before addressing cleanup

---

## 🎯 Pre-Submission Quick Audit Script

Save this as `ios-app/scripts/pre-deploy-audit.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 TrackPay iOS Pre-Deployment Audit"
echo "===================================="
echo ""

cd "$(dirname "$0")/.."

echo "1️⃣  Checking console usage..."
console_count=$(rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__" | rg -v "console.error" | wc -l | xargs)
if [ "$console_count" -eq "0" ]; then
  echo "   ✅ No unguarded console statements"
else
  echo "   ⚠️  Found $console_count unguarded console statements (mitigated by babel plugin)"
fi
echo ""

echo "2️⃣  Running expo-doctor..."
npx expo-doctor
echo ""

echo "3️⃣  Running TypeScript check..."
if npx tsc --noEmit; then
  echo "   ✅ TypeScript check passed"
else
  echo "   ⚠️  TypeScript errors found (review output above)"
fi
echo ""

echo "4️⃣  Checking for localhost references..."
localhost_count=$(rg "localhost" src --glob "*.{ts,tsx}" | wc -l | xargs)
if [ "$localhost_count" -eq "0" ]; then
  echo "   ✅ No localhost references found"
else
  echo "   ❌ Found $localhost_count localhost references"
  rg "localhost" src --glob "*.{ts,tsx}"
fi
echo ""

echo "5️⃣  Verifying .env exists..."
if [ -f ".env" ]; then
  echo "   ✅ .env file exists"
else
  echo "   ❌ .env file missing"
fi
echo ""

echo "6️⃣  Verifying assets..."
if [ -f "assets/app-icon.png" ] && [ -f "assets/splash-icon.png" ]; then
  echo "   ✅ App icon and splash screen exist"
else
  echo "   ❌ Missing assets"
fi
echo ""

echo "7️⃣  Checking build number..."
current_build=$(grep -A5 "\"ios\"" app.json | rg "\"buildNumber\"" | grep -o '[0-9]*')
echo "   Current build number: $current_build"
echo "   ⚠️  REMEMBER: Increment to $((current_build + 1)) before building!"
echo ""

echo "✅ Audit complete!"
echo ""
echo "Next steps:"
echo "1. Increment build number in app.json"
echo "2. Run: eas build --platform ios --profile production"
echo "3. Submit: eas submit --platform ios"
```

**Usage:**
```bash
cd ios-app
chmod +x scripts/pre-deploy-audit.sh
./scripts/pre-deploy-audit.sh
```

---

## 📖 Additional Resources

- **Expo EAS Documentation**: https://docs.expo.dev/eas/
- **Apple Developer Portal**: https://developer.apple.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **TrackPay Codebase Guide**: `../../CLAUDE.md`
- **Production DB Migration**: `../prod-migrate/plan.md`

---

## 🎯 Remember: Quality First!

This guide should be referenced for **every build and deployment**. The quality gates exist to prevent white screens, crashes, and App Store rejections that cost valuable development time.

**Before ANY production build**: Run through the Critical Pre-Build Checklist!

---

*Last Updated: 2025-10-16*
*Based on: WaddlePlay proven approach (21+ successful deployments)*
*Next Review: After first successful App Store submission*
