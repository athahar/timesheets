TrackPay Growth Loop — Architecture Doc

Scope: “Invite to TrackPay” loop triggered at (A) Stop Session and (B) Request Payment when the client is not yet registered. Includes deep links, web fallback, short codes, API, DB, RLS, analytics, and rollout.

0) Objectives & Non-Goals

Objectives

Convert non-registered clients into TrackPay users at two high-intent moments.

One-tap share with a short link and code; deep link into app or web fallback.

Auto-open share sheet after successful payment request creation when client is off-platform.

Non-Goals

Full web client portal. We only need a minimal invite bridge page for acceptance + redirect.

Payments processing changes (use existing flow).

1) High-Level Architecture

Mobile (RN/Expo)

InviteGrowthLoop module (UI modals + share payloads + deep link handler).

useClientRegistrationStatus(clientId) hook (reads clients.is_registered).

Triggers:

After Stop Session success.

On Request Payment (pre-check); on success, open share.

Backend (Supabase)

Postgres tables: invites, (optional) client_contacts.

Edge Functions:

createInvite → returns code, short URL, JWT.

redeemInvite (token) / redeemByCode (code).

shortlink redirect (tracks click, resolves token).

RLS: providers can only invite/link their own client_id.

Web Fallback (Next.js or static)

https://tp.app/i/{code} → resolves to token, shows minimal CTA:

“Get the app” + “Continue on web / send link to my phone/email”

One-tap Accept & Connect (server creates minimal client + relationship)

Deep Linking

Universal link: https://tp.app/i/{code} (iOS Associated Domains, Android App Links)

Custom scheme: trackpay://invite?token=… as backup.

Analytics

PostHog events across mobile, redirector, and web fallback.

2) Data Model (SQL)
-- clients table assumed exists, add fast flag
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS is_registered boolean
GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;

CREATE TYPE invite_status AS ENUM ('pending','accepted','expired','revoked');

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL REFERENCES auth.users (id),
  client_id uuid NOT NULL REFERENCES public.clients (id),
  code varchar(12) UNIQUE NOT NULL,
  token_jwt text NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invites_one_active_per_client_provider
  ON public.invites (provider_user_id, client_id)
  WHERE status = 'pending';

-- optional: store a contact to prefill
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id),
  email text,
  phone_e164 text,
  created_at timestamptz NOT NULL DEFAULT now()
);


RLS (key rules)

-- Invites: provider can only operate on their clients
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invite_select ON public.invites
FOR SELECT USING (auth.uid() = provider_user_id);

CREATE POLICY invite_insert ON public.invites
FOR INSERT WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY invite_update ON public.invites
FOR UPDATE USING (auth.uid() = provider_user_id);

-- clients already protected; ensure providers can read their own clients

3) Server: Edge Functions (Deno)
3.1 createInvite

Input: { client_id }

Logic:

Validate ownership (client.provider_user_id == auth.uid()).

If active invite exists and not expired → reuse.

Else generate:

code: 6–8 char base32 (no confusing chars).

token_jwt: signed JWT (invite:{invite_id}, provider_user_id, client_id, code, exp=expires_at).

Upsert invite.

Produce short URL: https://tp.app/i/{code} (stored elsewhere or deterministic).

Output: { invite_id, code, token, short_url, expires_at }

3.2 redeemInvite

Input: { token }

Logic:

Verify JWT, not expired, status pending.

If client user exists (match by email/phone captured on web or in app) → link relationship.

Else create minimal client user (Supabase Auth) or “pending user” row, then link.

Mark invite accepted.

Output: { relationship_id, client_user_id }

3.3 redeemByCode

Same as above, but resolves code → invite → build & verify token → continue.

3.4 shortlink

Route: GET /i/:code

Logic:

Lookup invite by code and status='pending' and !expired.

Fire PostHog invite_link_clicked.

If on iOS/Android (UA detection), 302 to trackpay://invite?token=... with fallback= param to same page.

If desktop or deep link fails, render fallback HTML (SSR or static) with Accept button that posts to redeemByCode.

4) Mobile App (RN/Expo)
4.1 File Structure
src/
  features/invite/
    InviteService.ts        // API calls to edge functions
    inviteShare.ts          // message builders
    InviteModalStop.tsx
    InviteModalPayment.tsx
    useInviteFlow.ts        // orchestrates create -> share
    deepLink.ts             // Linking handlers
  screens/
    ClientListScreen.tsx
    ClientDetailsScreen.tsx

4.2 Deep Link Handler

Configure in app.json:

"scheme": "trackpay",
"ios": {
  "associatedDomains": ["applinks:tp.app"]
}


deepLink.ts:

On trackpay://invite?token=... → call redeemInvite, navigate to connected client page.

Idempotent (ok to call twice).

4.3 Triggers

Stop Session flow

End session → success.

If client.is_registered === false → show InviteModalStop.

On “Share & Invite”: createInvite → build message → Share.share(...).

Request Payment flow

Tap “Request Payment”.

If not registered → show InviteModalPayment with:

Primary: “Share & Request Payment” (first create invite, then call createPaymentRequest, on success auto-open Share).

Secondary: “Just Request”.

If registered → unchanged flow.

4.4 Share Payloads
buildStopMessage({ clientFirst, duration, code, shortUrl }): string;
buildPaymentMessage({ clientFirst, amount, duration, code, shortUrl }): string;


Templates (short, SMS-safe):

Hi {First}, I tracked {HH:MM} with TrackPay.
See hours & get set up: {shortUrl}
(Or download TrackPay and enter code {code})

Hi {First}, I sent a ${amount} request for {HH:MM}.
Pay & view details: {shortUrl}
(Code: {code})

4.5 Feature Flags (remote config)

inviteGrowthLoop.enabled

inviteGrowthLoop.autoShareAfterPayment (default true)

5) Web Fallback (Invite Bridge)

Page responsibilities

Show provider + client name, hours summary (optional pull via token).

Buttons:

“Accept & Connect” → POST redeemByCode (or redeemInvite if token available).

“Get the app” (store links).

“Send me the link” (email/SMS via Supabase function if contact collected).

If redeemed without app:

Create minimal client account (passwordless magic link), connect relationship.

Show “You’re connected—install the app to view hours & pay faster.”

6) Security & Abuse

JWT: signed with dedicated secret INVITE_JWT_SECRET; 7-day expiry.

Single-use: status flips to accepted atomically in transaction.

Rate-limits:

Max 3 active pending invites/client/day.

Shortlink handler throttles IP bursts.

PII: avoid embedding emails/phones in URLs. Collect via form POST only.

RLS: providers can only create invites for their own client_id.

7) Analytics (PostHog)

Event names + props:

invite_modal_shown { context: "stop_session" | "request_payment", client_id }

invite_modal_action { action: "share" | "skip" | "share_and_request" | "just_request" | "cancel", client_id }

invite_created { invite_id, client_id }

invite_share_initiated { channel: "native_share" }

invite_link_clicked (from shortlink) { invite_id, ua_device, os }

invite_redeemed { invite_id, method: "token" | "code" }

relationship_created_from_invite { invite_id }

payment_request_created { client_id, amount, from_context: "invite_flow" | "standard" }

Core KPIs:

CTR (modal→share), Click→Redeem, Redeem→App Install, 24h in-app conversion after payment requests.

8) API Contracts (DTOs)

POST /edge/createInvite

// req
{ client_id: string }
// res
{
  invite_id: string
  code: string
  token: string
  short_url: string
  expires_at: string
}


POST /edge/redeemInvite

{ token: string }
// res
{ relationship_id: string, client_user_id: string, client_id: string }


POST /edge/redeemByCode

{ code: string }
// res
{ relationship_id: string, client_user_id: string, client_id: string }


POST /edge/createPaymentRequest (existing)

no change; add optional header x-invite-id to link analytics.

9) Copy & UX Specs

Modals

Stop: Title “Share Hours & Invite Your Client”; Primary “Share & Invite”; Secondary “Skip”.

Payment: Title “Client isn’t on TrackPay yet”; Primary “Share & Request Payment”; Secondary “Just Request”; Tertiary “Cancel”.

Show client avatar + name in header.

Toasts

“Invite link ready to share.”

“Payment request sent.”

10) Testing Plan

Unit

Code generator (no ambiguous chars).

Token sign/verify/expiry.

Reuse pending invite vs create new.

Integration

Stop flow → modal → createInvite → Share.

Payment flow primary path (Share & Request) and secondary (Just Request).

Deep link redemption cold/warm start.

Web fallback redeem by code + create minimal account.

Manual QA

iOS TestFlight: universal link → app; airplane mode → fallback page.

Cancel share sheet does not undo payment request.

Invite reuse within 7 days.

11) Rollout

Ship behind inviteGrowthLoop.enabled=false.

Dogfood on internal providers.

10% provider rollout → watch errors, CTR, accept rate.

Ramp to 100% after stable.

12) Open Decisions (defaults in spec; change if needed)

Invite Expiry: 7 days (OK?)

Code Length: 6 vs 8 chars (default 6).

Minimal Web View: Next.js vs static HTML (default tiny Next.js page on Vercel).

Create minimal client account on web accept vs require app first (default: create minimal to reduce friction).

Android support timing: later or day-1 (default later).

Short domain: tp.app placeholder (confirm actual domain/subdomain).

13) Work Breakdown (tickets)

Mobile

INV-01 Modal components (Stop/Payment) + strings + feature flag.

INV-02 InviteService (createInvite, redeem handlers) + deep link integration.

INV-03 Share payload builders + unit tests.

INV-04 Wire into Stop Session / Request Payment flows.

INV-05 Analytics events + QA.

Backend

INV-10 DB migrations (invites, client_contacts) + RLS.

INV-11 Edge functions createInvite, redeemInvite, redeemByCode.

INV-12 Shortlink redirector GET /i/:code + PostHog.

INV-13 Cron expire invites.

Web

INV-20 Invite Bridge page (SSR), Accept action, device detection, store links.