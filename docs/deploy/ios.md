# TrackPay – iOS Deployment Guide

**Status**: Production build ready  
**Last Updated**: 2025-XX-XX  
**Scope**: Expo-managed TrackPay iOS app

This guide distills the deployment routine for TrackPay into a repeatable checklist. When asked to “get ready for iOS deploy,” follow these steps top-to-bottom.

---

## 1. Pre-Build Hygiene (Run Every Time)

### 1.1 Environment & Secrets
- Confirm `.env` contains valid Supabase URL + anon key.
- Ensure Expo secrets are set (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_DISPLAY_NAME`).

### 1.2 Console Statement Audit
```bash
rg "console\." ios-app/src --glob "*.{ts,tsx}" \
  | rg -v "__DEV__" \
  | rg -v "console.error"
```
- ❌ No unguarded `console.log`/`console.warn` in production paths.
- ✅ `console.error` allowed for crash reporting.
- ✅ Babel `transform-remove-console` plugin stays enabled in production.

### 1.3 TypeScript Strict Check
```bash
cd ios-app
npx tsc --noEmit
```
- Build must pass with zero errors or warnings.

### 1.4 Expo Doctor
```bash
npx expo-doctor
```
- Resolve any dependency or config issues before building.

### 1.5 Lint for Stray URLs (optional sanity)
```bash
rg "localhost" ios-app/src --glob "*.{ts,tsx}"
```
- Remove or gate any local-only endpoints.

### 1.6 Review iOS Permissions
- Inspect `ios-app/app.json → expo.ios.infoPlist` for unused permission strings.
- Remove any `NSCameraUsageDescription`, etc., that aren’t required.

### 1.7 Confirm Error Boundary
- `App.tsx` must wrap root navigator with `<ErrorBoundary>` (already in place).

---

## 2. Version & Build Number Management

### 2.1 App Version (semantic)
```bash
cd ios-app
npm version patch   # or minor/major, as appropriate
```

### 2.2 iOS Build Number (MANDATORY increment)
```bash
grep -A5 "\"ios\"" app.json | rg "\"buildNumber\""
# edit buildNumber: "<previous>" → "<previous + 1>"
grep -A5 "\"ios\"" app.json | rg "\"buildNumber\""
```
- Never reuse a build number—Apple rejects duplicates (`CFBundleVersion`).

---

## 3. Project Health Snapshot

Run the following together and capture output in deployment notes (helps trace issues later):
```bash
cd ios-app
npx expo-doctor
npx tsc --noEmit
rg "console\." src --glob "*.{ts,tsx}" \
  | rg -v "__DEV__" \
  | rg -v "console.error"
```

---

## 4. Build & Submit with EAS

### 4.1 Auth (first time only)
```bash
npx eas login
npx eas build:configure
```

### 4.2 Production Build
```bash
npx eas build --platform ios --profile production
```
- Monitor progress in CLI or the build link provided.
- If you hit cache-related issues: `npx eas build --platform ios --profile production --clear-cache`.

### 4.3 Submit to TestFlight
```bash
npx eas submit --platform ios
```
- Provide App Store Connect credentials when prompted.
- Verify upload in App Store Connect → TestFlight.

---

## 5. Post-Build Validation

1. Download the TestFlight build to a physical device.
2. Smoke-test critical flows:
   - Provider session tracking (crew + person-hours math).
   - Client mark-as-paid workflow.
   - Offline behavior if applicable.
3. Check crash logs / console for errors (use Xcode Devices log if needed).

Optional quick regression script:
```bash
# timeline localization sanity
rg "crew" ios-app/src --context 2
rg "person-hours" ios-app/src --context 2
```

---

## 6. App Store Submission Checklist

- [ ] App Store metadata (description, keywords, screenshots) aligns with current features.
- [ ] Privacy policy reflects actual data usage (none beyond Supabase auth).
- [ ] No external links lacking a parental gate (not relevant today, but verify before submitting kids content).
- [ ] Build number increments captured in release notes.

---

## 7. Useful Commands Reference

```bash
# Project health
npx expo-doctor
npx tsc --noEmit

# Reset Metro cache before final test
npm start -- --clear

# View recent builds
npx eas build:list
npx eas build:view <build-id>

# Verify Supabase env at runtime
echo "SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL"
```

---

## 8. Outstanding TODOs / Watchouts
+- Ensure Spanish translations exist for crew-selector copy and timeline phrases introduced in multi-crew work.
+- Confirm `.env` is not committed; `.env.sample` should mirror required keys.
+- Keep migration script (`ios-app/scripts/20241015_add_crew_size_person_hours.sql`) in sync with production database state.

---

## Appendix: Fallback Logs Script
Useful for quick pre-submit audits (optional):
```bash
#!/usr/bin/env bash
set -euo pipefail
cd ios-app

echo "🔍 Checking console usage..."
rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__" | rg -v "console.error" || echo "✅ No unguarded console statements."

echo "🔍 Running expo-doctor..."
npx expo-doctor

echo "🔍 Running TypeScript..."
npx tsc --noEmit

echo "✅ Audit complete."
```
