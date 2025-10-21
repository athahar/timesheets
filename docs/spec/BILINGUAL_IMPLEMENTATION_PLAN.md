# TrackPay Bilingual MVP - Apple Store Ready

## 🎯 Surgical Implementation with Apple Compliance

**Focus:** Essential bilingual + Apple Store deployment readiness

## 📊 **CURRENT STATUS SUMMARY (September 23, 2025)**

**✅ MAJOR MILESTONES COMPLETED:**
- **Core Infrastructure:** i18n system, formatters, persistence ✅
- **Authentication Flow:** Login, Register, ForgotPassword, InviteClaim fully bilingual ✅
- **Main App Screens:** SimpleClientListScreen + ServiceProviderListScreen fully localized ✅
- **Settings System:** Language control with instant hot-swap ✅
- **Welcome Experience:** Bilingual welcome with language picker ✅

**🚀 READY FOR TESTING:**
- Complete provider and client workflows in Spanish/English
- Dynamic content localization (money, time, status indicators)
- Persistent language preferences across app sessions
- Production-ready bilingual foundation

**📋 REMAINING PHASES:**
- Phase 3: Additional provider workflow screens (ClientHistory, SessionTracking, etc.)
- Phase 4: Client workflow refinements
- Phase 5: Shared component localization
- Phase 6: Apple Store pre-flight
- Phase 7: QA testing

---

### **✅ PHASE 1: i18n Foundation + Apple Compliance (COMPLETED)**
**Goal:** Core multilingual infrastructure, Apple Store ready

**Tasks:**
1. **Install dependencies**
   ```bash
   expo install expo-localization i18next react-i18next
   ```

2. **Apple compliance setup**
   - **NO console.log statements** - Use `if (__DEV__) console.log()` only
   - **Production environment variables** in eas.json
   - **Error boundaries** for crash prevention

3. **i18n structure** (locked per your spec)
   ```
   /src/i18n/
     index.ts          // init + language detection + changeLanguage
     resources/
       en-US.json      // Your provided translations
       es-US.json      // Your provided Spanish translations
   ```

4. **Core implementation**
   - `useLocale()` hook: `{ t, locale, setLocale }`
   - AsyncStorage persistence (no Supabase sync yet)
   - **Missing-key dev logger** + English fallback
   - **No string concatenation** - ICU variables only ({{amount}})

5. **Formatters (locked rules)**
   - **Currency:** USD style both languages ($1,234.56)
   - **Dates:** en-US "Sep 22, 2025", es-US "22 sep 2025" (lowercase)
   - **Times:** en-US "8:44–9:57 pm", es-US "8:44–9:57 p. m."
   - **Durations:** en-US "1hr 13min", es-US "1 h 13 min"
   - **Tabular numerals:** money/timers ONLY

**Deliverables:** ✅ Apple-compliant i18n system, formatters, persistence

---

### **✅ PHASE 2: Welcome + Settings + Core Screen Localization (COMPLETED)**
**Goal:** Language selection with hot-swap + main app screen localization

**COMPLETED BEYOND ORIGINAL SCOPE:**
- ✅ Complete Authentication screens localized (Login, Register, ForgotPassword, InviteCllaim)
- ✅ SimpleClientListScreen fully bilingual with dynamic content
- ✅ ServiceProviderListScreen fully bilingual with dynamic content
- ✅ Variable interpolation system for money amounts, timers, hours
- ✅ Status pill localization per locked specifications

**Original Tasks:**
1. **WelcomeScreen language picker**
   - Segmented control "English | Español"
   - **Hot-swap content instantly** (no reload)
   - Device locale detection: es → Español, else English
   - AsyncStorage persistence

2. **Minimal SettingsScreen**
   - Large title "Settings / Ajustes"
   - **Language:** English/Español segmented (live updates)
   - **Help:** mailto support link
   - **Sign Out:** authentication logout
   - iOS grouped sections, 16pt spacing

3. **Navigation**
   - Gear icon on root screens → Settings
   - Chevron-only back buttons

4. **Accessibility compliance**
   - **VoiceOver labels** for language controls
   - **44pt touch targets**
   - Large titles on root lists

**Deliverables:** ✅ Welcome + Settings + Auth screens + Core business screens with instant language switching

---

### **PHASE 3: Provider Daily Flows (Days 3-4)**
**Goal:** Spanish provider workflows, keyboard safety

**Files:**
- `SimpleClientListScreen.tsx` - client list
- `ClientHistoryScreen.tsx` - summary cards, timeline
- `StyledSessionTrackingScreen.tsx` - session controls
- `AddClientModal.tsx` - client creation
- `MarkAsPaidModal.tsx` - payment recording // this shoudl be requestpaymentmodal

**Status pills (locked glossary):**
- "Due $X" → "Adeuda $X"
- "Requested" → "Solicitado"
- "Paid up" → "Al día"
- "Active" → "Activa"

**Timeline labels (frozen exactly):**
- "Work started" → "Trabajo iniciado" (no money)
- "Work done" → "Trabajo realizado"
- "Money requested" → "Dinero solicitado"
- "Payment received" → "Pago recibido" (provider view)

**Keyboard safety guardrail:**
- **StickyCTA** on Add Client, Mark as Paid
- **Return-key chaining** on all forms
- **Verified on iPhone SE**

**Deliverables:** Complete Spanish provider flows, keyboard safe

---

### **PHASE 4: Client Daily Flows (Day 5)**
**Goal:** Spanish client workflows

**Files:**
- `ServiceProviderListScreen.tsx` - provider browsing
- `ServiceProviderSummaryScreen.tsx` - work summary, payments
- `MarkAsPaidModal.tsx` - payment marking (client version)

**Key difference (locked):**
- Client timeline: "Payment sent" → "Pago enviado"
- Provider timeline: "Payment received" → "Pago recibido"

**Deliverables:** Complete Spanish client flows

---

### **PHASE 5: Critical Shared Components (Day 6)**
**Goal:** Bilingual shared elements + auth screens

**Components:**
- `StatusPill.tsx` - status indicators
- `Toast.tsx` - notifications
- `ConfirmationModal.tsx` - dialogs
- Form validation errors

**Auth screens:**
- `LoginScreen.tsx` - **StickyCTA** + return-key chaining
- `RegisterScreen.tsx` - **StickyCTA** + return-key chaining
- `InviteClaimScreen.tsx` - invite claiming

**Deliverables:** All critical components bilingual, auth keyboard safe

---

### **PHASE 6: Apple Store Pre-Flight (Day 7)**
**Goal:** Production readiness per Apple spec

**Code cleanup (Phase 1.4 requirements):**
- **Remove ALL console.log** statements (or wrap with `if (__DEV__)`)
- **Production Supabase** credentials in eas.json
- **Comprehensive error boundaries**
- **Bundle optimization**
- **Security audit** - no hardcoded secrets

**Accessibility final pass:**
- **VoiceOver labels** complete
- **44pt touch targets** verified
- **Large titles** on root screens
- **Focus management** proper

**Version management:**
- Increment to v1.2.0 for bilingual feature
- Build number increment

**Deliverables:** Apple Store ready codebase

---

### **PHASE 7: QA + Apple Compliance Testing (Day 8)**
**Goal:** Execute test script + Apple requirements

**QA snippet (paste for test run):**
1. **Toggle EN↔ES on Welcome** → hot-swap → relaunch → persists
2. **Provider (ES):** add client → start/end session → request payment → timeline shows:
   - "Trabajo iniciado" (no money)
   - "Trabajo realizado"
   - "Dinero solicitado"
   - "Pago recibido"
3. **Client (ES):** mark as paid → timeline shows "Pago enviado"
4. **iPhone SE & 15 Pro:** no clipping in summary card, pills, modals
5. **Currency/date/time** match locked rules; tabular numerals applied

**Apple compliance verification:**
- No console.log in production build
- All crashes caught by error boundaries
- VoiceOver navigation works
- Performance acceptable on older devices

**Deliverables:** Fully tested, Apple Store compliant bilingual MVP

---

## 🔒 **LOCKED SPECIFICATIONS**

**Timeline labels (frozen):**
- Work started → Trabajo iniciado (no money)
- Work done → Trabajo realizado
- Money requested → Dinero solicitado
- Payment received → Pago recibido / Payment sent → Pago enviado

**Status pills (locked):**
- Due $X → Adeuda $X
- Requested → Solicitado
- Paid up → Al día
- Active → Activa

**Formatting (locked):**
- Currency: $1,234.56 (USD style both languages)
- Dates: en-US "Sep 22, 2025", es-US "22 sep 2025"
- Times: en-US "8:44–9:57 pm", es-US "8:44–9:57 p. m."
- Tabular numerals: money/timers only

**Apple requirements:**
- NO console.log (use `if (__DEV__)` wrapper only)
- Production environment variables
- Error boundaries for crash prevention
- VoiceOver accessibility compliance
- 44pt touch targets minimum

**Keyboard safety:**
- StickyCTA on Login, Register, Add Client, Mark as Paid
- Return-key focus chaining
- iPhone SE verification

This delivers essential bilingual functionality with Apple Store deployment readiness, keeping scope tight and focused on Spanish-speaking service worker needs.