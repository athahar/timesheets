Implement Settings Screen (Provider & Client)
Goals

Add an in-app Settings screen reachable from the root lists (Clients / Providers) via a top-right gear icon.

Manage language, light account bits, help/legal, and sign out.

iOS-native look: large title, grouped sections, chevrons, 16pt grid, safe areas.

UX

Entry: Root list header → gear icon → SettingsScreen.
Style: iOS “grouped list” cards, 16pt spacing, 1px borders, large title “Settings / Ajustes”.
Rows: rows w/ chevron navigate; toggles use Switch; footers for helper text.

Sections (both roles unless noted)

Account

Name & Email (read-only for now) → “Profile” screen via chevron.

Language: Segmented “English | Español” (live switch). Persist to AsyncStorage + user.language (Supabase).

Preferences

Haptics (toggle, default ON).

Text Size (opens OS settings tip) — optional footer; no custom scaler now.

Workspace (Provider only)

Workspace Name (current value e.g., “magic dogs”) → simple rename screen.

Invite Clients → deep-link to the “Invite / Copy Code” screen.

Help & Legal

Help & Support (mailto: support@trackpay.app
 with app version & user id in subject).

Privacy Policy, Terms of Service (open webviews).

Danger Zone

Sign Out (primary action).

Delete Account (destructive confirm modal) — show only if backend supports; otherwise omit.

Design tokens: use existing muted palette, card radius 16, pill radius 10, 44pt tap targets, tabular nums only where amounts appear (not here).

Behavior

Language updates UI instantly via i18n.changeLanguage(lang); persist to AsyncStorage & Supabase profile. First app launch still uses device locale fallback.

Haptics toggles a simple boolean flag; wrap success toasts/copies with conditional haptic.

Workspace rename is optimistic w/ toast + error fallback.

Mailto opens default mail composer; include app version + platform.

Navigation

Add gear icon to root list headers (provider: Clients; client: Providers).

Headers: headerLargeTitle: true, headerBackTitleVisible: false (chevron only).

Settings rows with next screens use chevrons; toggles have no chevron.

i18n Keys (add to en-US.json / es-US.json)
// en-US
{
  "settings.title": "Settings",
  "settings.sections.account": "Account",
  "settings.sections.preferences": "Preferences",
  "settings.sections.workspace": "Workspace",
  "settings.sections.help": "Help & Legal",
  "settings.sections.danger": "Danger Zone",

  "settings.profile": "Profile",
  "settings.name": "Name",
  "settings.email": "Email",
  "settings.language": "Language",
  "settings.lang.english": "English",
  "settings.lang.spanish": "Español",

  "settings.haptics": "Haptics",
  "settings.textSize": "Text size",
  "settings.textSize.note": "Adjust in iOS Settings → Accessibility → Display & Text Size.",

  "settings.workspaceName": "Workspace name",
  "settings.inviteClients": "Invite clients",

  "settings.support": "Help & Support",
  "settings.privacy": "Privacy Policy",
  "settings.terms": "Terms of Service",

  "settings.signOut": "Sign Out",
  "settings.delete": "Delete Account",
  "settings.delete.confirm": "This will permanently delete your account and data. Continue?"
}
// es-US
{
  "settings.title": "Ajustes",
  "settings.sections.account": "Cuenta",
  "settings.sections.preferences": "Preferencias",
  "settings.sections.workspace": "Espacio de trabajo",
  "settings.sections.help": "Ayuda y legal",
  "settings.sections.danger": "Zona de riesgo",

  "settings.profile": "Perfil",
  "settings.name": "Nombre",
  "settings.email": "Correo",
  "settings.language": "Idioma",
  "settings.lang.english": "English",
  "settings.lang.spanish": "Español",

  "settings.haptics": "Háptica",
  "settings.textSize": "Tamaño de texto",
  "settings.textSize.note": "Ajusta en Ajustes de iOS → Accesibilidad → Pantalla y tamaño de texto.",

  "settings.workspaceName": "Nombre del espacio",
  "settings.inviteClients": "Invitar clientes",

  "settings.support": "Ayuda y soporte",
  "settings.privacy": "Política de privacidad",
  "settings.terms": "Términos del servicio",

  "settings.signOut": "Cerrar sesión",
  "settings.delete": "Eliminar cuenta",
  "settings.delete.confirm": "Esto eliminará tu cuenta y datos de forma permanente. ¿Continuar?"
}

Dev Tasks

Route & header

Add SettingsScreen to navigator; add gear icon on root screens.

Screen layout

Grouped sections using our Card component; 16pt spacing; chevrons/toggles.

State & persistence

useLocale() hook for locale, setLocale.

Read/write lang to AsyncStorage + Supabase profile.

Haptics preference stored locally (and optionally profile).

Sub-screens

ProfileScreen (read-only for now).

WorkspaceNameScreen (provider only) with simple input + sticky CTA.

Legal WebViews.

QA

iPhone SE & 15 Pro, both languages.

Language switch live updates; persists after relaunch.

Gear → Settings → back animations feel native; no layout jumps.

Acceptance Criteria

Settings accessible from both roles; large title; iOS chevron back.

Language switch hot-swaps all text; persists.

Haptics toggle affects toasts/copy actions app-wide.

Provider sees Workspace section; client does not.

Support/legal links open correctly.

Sign Out works from Settings reliably.