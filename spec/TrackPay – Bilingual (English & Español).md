TrackPay – Bilingual (English & Español) MVP Spec
Scope & Goals

Add full bilingual UI for all screens and flows (provider + client).

Simple, reliable: English (en-US) and Español (es-US) only.

Users can pick language on the Welcome screen and change it later in Settings.

Persist preference across sessions/devices; default to device locale on first run.

No layout regressions; all typography/spacing stays per our muted iOS design.

Non-goals (for now):

No server-side translations of free text, PDFs, or push/email templates.

No RTL; Spanish is LTR.

UX Requirements
1) Welcome / Home (first screen)

Add a language picker at top or just above CTAs: Segmented control “English | Español”.

Default selection:

If device locale starts with es, preselect Español.

Else English.

Show the same page content in the selected language immediately (hot-swap, no reload).

2) Settings (or Profile) → Language

Simple row: Language → “English / Español”.

Changing updates UI instantly and persists.

3) Copy Tone

Plain, friendly, work-focused.

US-Spanish (neutral) — avoid regional idioms; concise labels preferred.

Technical Implementation
Library & Setup

Use i18next + react-i18next with expo-localization.

Locales: en-US, es-US. Configure fallbackLng: 'en-US'.

Store preference in AsyncStorage and mirror to Supabase user profile (user.language).

File Structure
/src/i18n/
  index.ts          // init + language detection + changeLanguage
  resources/
    en-US.json
    es-US.json

Helpers

t('key', params) for all strings. No string concatenation in JSX.

Formatters must be locale-aware:

Currency (USD): new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

Date/time: new Intl.DateTimeFormat(locale, { ...options })

Durations: keep “1hr 13min” pattern localized (see keys below).

Use tabular numerals regardless of language for times/amounts.

Persistence

On app start: read AsyncStorage → else device locale → else en-US.

On change: i18n.changeLanguage(lang); AsyncStorage.setItem('lang', lang); upsert user.language.

Formatting Rules

Currency: Always USD with symbol $.

en-US: $1,234.56

es-US: $1,234.56 (keep U.S. decimal style for clarity in US market).

Dates:

en-US: Sep 22, 2025

es-US: 22 sep 2025 (short month, lower-case; or 22 de sep de 2025 where space allows).

Times: 12-hour with am/pm →

en-US: 8:44–9:57 pm

es-US: 8:44–9:57 p. m.

Durations:

en-US: 1hr 13min

es-US: 1 h 13 min

Key Terminology (glossary)
Concept	English	Español (US)
Balance due	Balance due	Saldo pendiente
Start session	Start Session	Empezar sesión
End session	End Session	Finalizar sesión
Request $X	Request $X	Solicitar $X
Record Payment	Record Payment	Registrar pago
Mark as Paid	Mark as Paid	Marcar como pagado
Paid up	Paid up	Al día
Due $X (chip)	Due $X	Adeuda $X
Requested (chip)	Requested	Solicitado
Active (chip)	Active	Activa
Work started	Work started	Trabajo iniciado
Work done	Work done	Trabajo realizado
Money requested	Money requested	Solicitud de pago
Payment received (provider view)	Payment received	Pago recibido
Payment sent (client view)	Payment sent	Pago enviado
Hourly rate	Hourly Rate	Tarifa por hora
Invite code	Invite Code	Código de invitación
Copy code / link	Copy Code / Copy Link	Copiar código / Copiar enlace
Join workspace	Join Workspace	Unirse al espacio de trabajo
Paid method pill	(cash/zelle/etc.)	same labels lower-case (e.g., efectivo, zelle)

For “session” we keep “sesión”; avoid confusion with auth by context (button labels already specific).

Strings Coverage (build with keys)

Use these keys across both flows. (Short sample shown—add more as needed.)

// en-US.json
{
  "lang.english": "English",
  "lang.spanish": "Español",

  "welcome.title": "Track hours. Request payment. Get paid faster.",
  "welcome.subtitle": "Perfect for house cleaners, babysitters, dog walkers, tutors, and other local services.",
  "welcome.create": "Create Account",
  "welcome.signin": "Sign In",
  "welcome.invite": "Have an invite code?",

  "nav.back": "Back",
  "nav.providers": "Providers",
  "nav.clients": "Clients",
  "nav.workSummary": "Work Summary",

  "summary.balanceDue": "Balance due: {{amount}} {{duration}}",
  "summary.duration": "[{{hours}}hr {{mins}}min]",
  "summary.pendingMeta": "Payment requested on {{date}} • {{amount}} pending",
  "summary.activeHint": "Active session time isn't included. They must end the session to add it.",
  "summary.paidUp": "Paid up",
  "summary.request": "Request {{amount}}",
  "summary.recordPayment": "Record Payment",

  "timeline.activity": "Activity Timeline",
  "timeline.dayHeader.today": "Today",
  "timeline.dayHeader.yesterday": "Yesterday",

  "timeline.workStarted": "Work started • {{date}} at {{time}} (active)",
  "timeline.workDone": "{{range}} — {{duration}} — {{amount}}",
  "timeline.moneyRequested": "Money requested — {{amount}} • {{count}} sessions • {{date}}",
  "timeline.paymentReceived": "Payment received — {{amount}}",
  "timeline.paymentSent": "Payment sent — {{amount}}",
  "timeline.noActivity": "No activity yet",

  "buttons.startSession": "Start Session",
  "buttons.endSession": "End Session",
  "buttons.markAsPaid": "Mark as Paid",
  "buttons.payFull": "Pay full {{amount}}",
  "buttons.payRequested": "Pay requested {{amount}}",

  "forms.fullName": "Full Name",
  "forms.email": "Email Address",
  "forms.password": "Password",
  "forms.confirmPassword": "Confirm Password",
  "forms.accountType": "Account Type",
  "forms.provider": "Service Provider",
  "forms.client": "Client",
  "forms.hourlyRate": "Hourly Rate",
  "forms.optional": "(Optional)",

  "invite.title": "Join your workspace",
  "invite.helper": "Enter the invite code you received",
  "invite.code": "Invite Code",
  "invite.copyCode": "Copy Code",
  "invite.copyLink": "Copy Link",
  "invite.join": "Join Workspace"
}

// es-US.json
{
  "lang.english": "English",
  "lang.spanish": "Español",

  "welcome.title": "Registra horas. Solicita pagos. Cóbalo más rápido.",
  "welcome.subtitle": "Ideal para limpiadores, niñeras, paseadores de perros, tutores y otros servicios locales.",
  "welcome.create": "Crear cuenta",
  "welcome.signin": "Iniciar sesión",
  "welcome.invite": "¿Tienes un código de invitación?",

  "nav.back": "Atrás",
  "nav.providers": "Proveedores",
  "nav.clients": "Clientes",
  "nav.workSummary": "Resumen de trabajo",

  "summary.balanceDue": "Saldo pendiente: {{amount}} {{duration}}",
  "summary.duration": "[{{hours}} h {{mins}} min]",
  "summary.pendingMeta": "Solicitud de pago del {{date}} • {{amount}} pendiente",
  "summary.activeHint": "El tiempo de la sesión activa no está incluido. Deben finalizarla para agregarlo.",
  "summary.paidUp": "Al día",
  "summary.request": "Solicitar {{amount}}",
  "summary.recordPayment": "Registrar pago",

  "timeline.activity": "Actividad",
  "timeline.dayHeader.today": "Hoy",
  "timeline.dayHeader.yesterday": "Ayer",

  "timeline.workStarted": "Trabajo iniciado • {{date}} a las {{time}} (activa)",
  "timeline.workDone": "{{range}} — {{duration}} — {{amount}}",
  "timeline.moneyRequested": "Solicitud de pago — {{amount}} • {{count}} sesiones • {{date}}",
  "timeline.paymentReceived": "Pago recibido — {{amount}}",
  "timeline.paymentSent": "Pago enviado — {{amount}}",
  "timeline.noActivity": "Aún no hay actividad",

  "buttons.startSession": "Empezar sesión",
  "buttons.endSession": "Finalizar sesión",
  "buttons.markAsPaid": "Marcar como pagado",
  "buttons.payFull": "Pagar todo {{amount}}",
  "buttons.payRequested": "Pagar solicitado {{amount}}",

  "forms.fullName": "Nombre completo",
  "forms.email": "Correo electrónico",
  "forms.password": "Contraseña",
  "forms.confirmPassword": "Confirmar contraseña",
  "forms.accountType": "Tipo de cuenta",
  "forms.provider": "Proveedor de servicios",
  "forms.client": "Cliente",
  "forms.hourlyRate": "Tarifa por hora",
  "forms.optional": "(opcional)",

  "invite.title": "Únete a tu espacio de trabajo",
  "invite.helper": "Ingresa el código de invitación que recibiste",
  "invite.code": "Código de invitación",
  "invite.copyCode": "Copiar código",
  "invite.copyLink": "Copiar enlace",
  "invite.join": "Unirse al espacio de trabajo"
}


Keep two variants where needed: e.g., on client timeline show “Pago enviado”; on provider timeline show “Pago recibido.”

Screen Acceptance Criteria (both languages)

Welcome

Segmented language control toggles copy instantly.

Title/subtitle/buttons translated; persists selection.

Auth (Sign In / Create / Forgot)

All labels, placeholders, errors localized.

Return key flow + StickyCTA unaffected.

Provider list & detail

Chips translated: Adeuda $X / Solicitado / Al día / Activa.

Summary card line + pending meta localized.

Timeline labels & date/time/duration localized.

Client list & provider summary

Same as above; Payment sent wording in client view.

Modals (Request Payment / Mark as Paid / Add Client / Invite Claim)

Headings, hints, options, buttons localized.

Decimal-pad and currency formatting follow locale.

Invite/Profile

“Copy Code/Link” → Spanish equivalents; haptics intact.

Monospace invite code unaffected.

Persistence

Relaunch app: previously selected language loads.

New device login: uses user.language if present, else device, else English.

Dev Notes & Guardrails

No embedded English in components; use t() everywhere.

Never build strings via "$" + amount + " pending" — use ICU-style variables in keys.

Run a missing keys check in CI (simple script comparing en-US.json vs es-US.json).

Ensure Dynamic Type & line-wrapping handle longer Spanish labels.

Pills and buttons must truncate with numberOfLines={1} where space is tight.

Test Plan (spot checks)

iPhone SE + iPhone 15 Pro sizes in both languages.

Welcome switch flips language with no nav reload.

Timeline shows “Trabajo iniciado … (activa)” and no amount for active rows.

Summary card shows “Saldo pendiente: $0.00” + Al día pill when zero.

Dual payment modal strings reflect chosen language and amounts.

Copy Code/Link toasts read in the right language.

Hand-off

Create the two JSON files with the keys above.

Replace all hardcoded strings with t('…').

Add i18n/index.ts init + a useLocale() hook returning { t, locale, setLocale }.

Implement Welcome segmented control + Settings language row.

That’s it—fast to wire up, safe, and consistent with the muted iOS design you already have.