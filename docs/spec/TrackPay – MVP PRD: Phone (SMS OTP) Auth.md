TrackPay – MVP PRD: Phone (SMS OTP) Auth via Firebase + Supabase DB
1) Objective

Replace email/password sign-in with phone number + SMS code (OTP) using Firebase Authentication (Phone). Keep Supabase for data, RLS, and real-time features. Minimize user-visible change outside auth.

Why: service workers commonly use phone (not email); lowest friction, lowest cost/commitment; fast to ship.

2) Scope
In-scope (MVP)

Auth method: Firebase Phone OTP (sign up + sign in).

UX: Phone input → send code → 6-digit OTP → verified → continue.

Bilingual copy: English + Español.

Number format: E.164 (+1xxxxxxxxxx), US only for MVP.

Link to Supabase: Exchange verified Firebase ID token for Supabase session (token) so RLS continues to work.

Persist session: Same session semantics as today (silent restore on app open).

Welcome/Auth screens: Replace email forms with phone OTP flow; leave “Sign in with email” as fallback link for existing users (temporary).

Out-of-scope (defer)

Password/passcode, magic links, social login.

Phone change flow.

Deep fraud checks (virtual numbers, device fingerprinting).

Contact-picker invite flow.

Web support (mobile app only for now).

3) Users & Key Journeys

New provider/client: Onboard with phone number, verify OTP, choose role, create/join workspace, land on list screen.

Returning user: App restores Firebase + Supabase sessions; if expired, re-prompt phone → OTP.

4) Success Metrics (MVP)

TTFV (time to first verification) < 30s median.

OTP success rate ≥ 90%.

Regression-free access to data (no RLS breakages).

Crash-free sessions ≥ 99.5% on auth screens.

5) UX & Copy (EN/ES)
Screens (iOS native feel)

Enter Phone

H1: Sign in with your phone / Inicia sesión con tu teléfono

Label: Phone number / Número de teléfono

CTA: Send code / Enviar código

Enter Code

H1: Enter the 6-digit code / Ingresa el código de 6 dígitos

Helper: We sent it to {{phone}} / Lo enviamos a {{phone}}

Inputs: 6 boxes (auto-advance)

Links: Didn’t get a code? Resend / ¿No llegó el código? Reenviar

CTA: Verify / Verificar

Role & Profile (first sign-in only)

I am a Service Provider / Client

Continue / Continuar

Fallback link (temporary):

Use email instead / Usar correo en su lugar

Rules

Tabular numerals on code input and any timers.

Sticky CTA above keyboard.

Return-key chaining (phone → send; code last box → verify).

VoiceOver: Proper labels; 44pt targets.

6) Technical Design
6.1 High-level flow

Client (RN/Expo) → Firebase Phone Auth:

signInWithPhoneNumber(phone) → SMS → confirm(code) → receive Firebase ID token.

Token exchange (Supabase Edge Function exchange-firebase):

Client calls with Firebase ID token.

Edge verifies token via Firebase Admin SDK.

If first time: create/find Supabase user that maps to the Firebase uid.

Generate Supabase session (GoTrue admin) and return { access_token, refresh_token }.

Client initializes Supabase client with returned session.
→ All existing RLS policies continue to work (auth.uid() = Supabase user id).

6.2 Mapping model

Table: public.user_identities

supabase_user_id uuid pk

firebase_uid text unique not null

phone text unique not null (E.164)

role text check in ('provider','client')

created_at timestamptz default now()

On first exchange, create Supabase auth user (GoTrue admin) + insert identity row. Store role after first-run role selection.

6.3 RLS policies (unchanged)

Reference auth.uid() in policies. Ensure all rows (clients, sessions, requests) still tie to supabase_user_id. No DB schema changes needed beyond the mapping table.

6.4 Libraries & config

@react-native-firebase/auth (or Firebase JS SDK modular) for phone auth.

iOS app verification (DeviceCheck/reCAPTCHA) handled by Firebase SDK.

Supabase Edge Function (Deno) with Firebase Admin SDK to verify ID token and issue Supabase session via GoTrue admin API.

Store service secrets in Supabase environment vars (Edge Function).

6.5 Error states & rate limits

Normalize phone to E.164; restrict to +1 (MVP).

Resend code throttle (e.g., 30s).

Friendly errors:

Invalid code → That code didn’t work / Ese código no funcionó

Too many attempts → Try again later / Inténtalo más tarde

SMS blocked → Use a different number / Usa otro número

7) Migration & Cutover

Existing email users: keep “Use email instead” link (temporary). No forced migration in MVP.

New users: default to phone OTP.

After stabilizing, hide email link or keep under “More options”.

8) Analytics & Logging

Events: auth_phone_submit, auth_otp_sent, auth_otp_verify_success, auth_otp_verify_fail, exchange_supabase_success/fail.

Log Firebase error codes; log token-exchange failures server-side (no PII in logs).

9) Accessibility & i18n

All auth strings via t() with EN/ES translations.

VO labels for phone input, code fields, resend link, CTAs.

44pt hit targets; visible focus/press states.

10) QA (must pass)

iPhone SE & 15 Pro: no clipping; sticky CTA visible with keyboard.

US numbers only; invalid formats rejected gracefully.

OTP resend throttled; success & failure toasts localized.

After verify: Supabase queries work (RLS intact); data visible exactly as before.

App relaunch: sessions restored (Firebase + Supabase).

11) Risks & Mitigations

Token exchange fragility: Add retries/backoff; show clear retry UI.

Duplicate accounts: Enforce unique phone + firebase_uid; on conflict, link to existing Supabase user.

Outage fallback: Keep email link during rollout.

Abuse: Firebase risk checks; throttle resend; later add reCAPTCHA fallback.

12) Deliverables

New Enter Phone & Enter Code screens (EN/ES).

Edge Function exchange-firebase (verify Firebase token → mint Supabase session).

Mapping table + creation logic.

Updated app init: restore Firebase, then fetch/refresh Supabase session.

Test plan runbook & results.

13) Timeline (aggressive)

Day 1–2: Firebase setup, RN SDK, new screens, basic flow working.

Day 3: Edge Function + session exchange + mapping table.

Day 4: RLS verification, error handling, resend throttling, i18n.

Day 5: QA (SE + 15 Pro), analytics events, rollout with email fallback.

Developer checklist (concise)

 Enable Firebase Phone Auth (iOS/Android app IDs configured).

 Build EnterPhone + EnterCode with sticky CTA, code auto-advance, resend throttle.

 Implement exchange-firebase Edge Function (verify ID token → GoTrue admin → Supabase session).

 Create user_identities mapping table; first-run creates mapping + role.

 Initialize Supabase client with returned session; verify RLS on all existing screens.

 Add i18n strings (EN/ES) for all new auth copy + errors.

 QA matrix + analytics events wired.

This keeps your app architecture intact, adds phone OTP with minimal friction, and preserves all Supabase goodness (RLS, real-time) via a small token-exchange bridge.