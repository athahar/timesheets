# Codex Notes

Use this file for Codex-specific operating rules and quick references.

## Global Expectations
- **Test everything visually and functionally** (web + device) before marking complete.
- Keep styles consistent with existing patterns (choose nativewind vs `StyleSheet` and stick with it).
- Follow descriptive commit conventions (`type(scope): message`).
- Guard all `console.log`/`console.warn` behind `if (__DEV__)`; leave `console.error` for crash reporting.
- Ensure root views remain wrapped with the shared `ErrorBoundary`.

## “iOS deploy” Checklist
When asked to “ios deploy,” run or confirm each step before declaring readiness:
1. Verify `.env` has valid Supabase URL + anon key; ensure Expo secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_DISPLAY_NAME`) exist.
2. Execute hygiene commands (from `docs/deploy/ios.md`):
   ```bash
   cd ios-app
   npx expo-doctor
   npx tsc --noEmit
   rg "console\." src --glob "*.{ts,tsx}" | rg -v "__DEV__" | rg -v "console.error"
   ```
   Capture and share output.
3. Review `app.json`:
   - Increment `"expo.ios.buildNumber"` (never reuse).
   - Confirm `infoPlist` only lists required permissions.
4. Clear Metro cache and sanity-check UI:
   ```bash
   npm start -- --clear
   ```
5. Build & submit (only after build number bump):
   ```bash
   npx eas build --platform ios --profile production
   npx eas submit --platform ios
   ```
6. Smoke-test the latest TestFlight build (provider + client flows, multi-crew math, mark-as-paid).

Report each step’s status in-chat before moving on.

## Docs & Specs
- Deployment playbook: `docs/deploy/ios.md`
- Multi-crew spec: `spec/multi-crew-session-tracking.md`

## Localization Reminder
- Any new UI copy must have English + Spanish entries in `src/i18n/simple`.

## Parking Lot
- [ ] Backfill Codex-specific tips as they emerge.
