# Timesheet App Specification

## Overview
A two-sided time tracking + payment request app prototype for service providers and clients using Expo (React Native) with nativewind styling and AsyncStorage for persistence.

## User Roles

### Service Provider (Lucy)
- Manages a list of clients
- Tracks work sessions (start/stop)
- Views unpaid balances
- Requests payments from clients

### Client (Molly)
- Views activity feed of service provider's work
- Receives payment requests
- Marks payments as completed

## App Flow

### 1. Initial Account Selection
**Screen**: Login/Account Selection (Design 01)
- **Purpose**: Users choose their role to access appropriate functionality
- **Flow**:
  - App opens to account selection screen
  - Shows available accounts: Lucy (Service Provider), Molly/John/Sarah (Clients)
  - User taps their account type to enter the app
  - Navigates to appropriate home screen based on role
- **User Identification**: Selected user name is stored and displayed in app header
- **Logout Functionality**: Users can return to account selection from any screen via logout button

### 2. Service Provider Flow (Lucy's Perspective)

#### 2.1 Client Management
**Screen**: Client List → Client Summary
- **Client List**: Lucy sees all her clients with current unpaid balances
- **Add Clients**: Lucy can add new clients as she gets new customers
- **Navigation**: Tap on client (e.g., Molly) → goes to Client Summary

#### 2.2 Client Summary View (Design 02)

**Screen**: Lucy → Molly Summary
- **Header**: Shows client name (Molly) and "Session tracking" subtitle
- **Work Controls**:
  - **Default**: "I'm Here" button (green) to start work session
  - **Active**: "I'm Done" button (red) to end current session
- **Balance Information**:
  - **Balance Card**: Current unpaid amount owed (e.g., $135)
  - **Unpaid Hours Card**: Total unpaid hours (e.g., 4.5h)
- **Actions**:
  - **Request Payment Button**: "Request $135" (blue) when unpaid balance > 0
  - **History Icon**: Top-right corner to view detailed work history
- **Session Behavior**:
  - Simple clock in/out (no real-time money counter display)
  - When work is completed, history automatically updates
  - Balance calculations update with new session earnings

#### 2.3 Client History View (Design 03)
**Screen**: Lucy → Adda Activity Timeline
- **Summary Cards**:
  - **Unpaid Hours**: Total unpaid and requested hours (e.g., "4hr 30min")
  - **Unpaid Balance**: Total amount owed (e.g., "$135.00")
- **Activity Timeline**:
  - **Unified Timeline**: Clean, minimalistic design mixing work sessions and payments chronologically
  - **Work Sessions**: 🕒 icon with format:
    - Main line: "Work: MM/DD/YYYY"
    - Sub line: "4hr 30min (9:00am-1:30pm)"
    - Right side: Amount and status pill
  - **Payment Activities**: 💰 icon with format:
    - Main line: "Payment Received"
    - Sub line: "MM/DD/YYYY X sessions"
    - Right side: "$135.00 (zelle)"
  - **Layout**: Icon → Content → Amount/Status alignment
  - **Sorting**: Most recent activities first
  - **Display**: Last 20 entries with performance optimization

### 3. Client Flow (Molly's Perspective)

#### 3.1 Service Provider List
**Screen**: Molly's Service Provider List
- **View**: Molly sees Lucy as one of her service providers
- **Navigation**: Tap on Lucy → goes to Service Provider Summary

#### 3.2 Service Provider Summary View
**Screen**: Molly → Lucy Summary
- **Summary Information**:
  - **Unpaid Hours**: Total hours worked but not yet paid (e.g., "9 hrs")
  - **Amount Owed**: Total unpaid amount (e.g., "$270")
- **Actions**:
  - **Mark as Paid Button**: Allows Molly to mark payments as completed
  - **History Icon**: View detailed work session history
- **Payment Requests**: Shows any pending payment requests from Lucy

#### 3.3 Service Provider Activity View
**Screen**: Adda → Lucy Activity Timeline
- **Summary Cards**:
  - **Unpaid Amount**: Total amount owed to service provider (e.g., "$30.00")
  - **Unpaid Hours**: Total unpaid hours (e.g., "30min")
- **Activity Timeline**:
  - **Unified Timeline**: Same clean design as service provider view, but from client perspective
  - **Work Sessions**: 🕒 icon with format:
    - Main line: "Work: MM/DD/YYYY"
    - Sub line: "4hr 30min (9:00am-1:30pm)"
    - Right side: Amount and status pill
  - **Payment Activities**: 💰 icon with format:
    - Main line: "Payment Sent" (client perspective)
    - Sub line: "MM/DD/YYYY X sessions"
    - Right side: "$135.00 (zelle)"
  - **Mark as Paid Button**: When unpaid balance exists
- **Purpose**: Client can review all work sessions, verify hours, and mark payments as completed

### 4. Work Session Management

#### 4.1 Starting Work
- **Trigger**: Lucy taps "I'm Here" button at client location
- **System Action**:
  - Creates new session record with start time
  - Button changes to "I'm Done" (red)
  - Session becomes "active" status

#### 4.2 Ending Work
- **Trigger**: Lucy taps "I'm Done" button
- **System Actions**:
  - Records end time and calculates duration
  - Calculates earnings (hours × hourly rate)
  - Updates unpaid balance for client
  - Adds session to history with "unpaid" status
  - Button reverts to "I'm Here" (green)

#### 4.3 Session Data
- **Keep Simple**: No real-time money counter during work
- **Focus**: Clean start/stop functionality
- **Auto-calculation**: System handles time and payment calculations

### 5. Payment Request and Approval Flow

#### 5.1 Payment Request (Lucy Side)
- **Trigger**: Lucy taps "Request $XXX" button
- **System Action**:
  - Changes session status from "unpaid" to "requested"
  - Notifies client (for now, just status change)
  - Button becomes disabled/changes state

#### 5.2 Payment Approval (Molly Side)
- **View**: Molly sees payment request notification/status
- **Action**: Molly taps "Mark as Paid" button
- **System Action**:
  - Changes session status from "requested" to "paid"
  - Updates payment history
  - Removes from unpaid balance calculations

#### 5.3 Payment Status Tracking
- **Unpaid**: Session completed but not yet requested/paid (orange)
- **Requested**: Lucy has requested payment (pending state)
- **Paid**: Molly has marked as paid (green)

## Core Screens & Features

### 1. Client List Screen (Service Provider)
**Purpose**: Main dashboard for service provider
**Features**:
- **User Header**: Displays current user name with logout button
- **Total Outstanding**: Summary card showing total unpaid balance across all clients
- Display all clients with:
  - Client name and hourly rate
  - Current unpaid hours
  - Unpaid balance amount
- "Add Client" button (prominently displayed for easy access)
- Tap client → navigate to Client History Screen
- **Scrollable Interface**: Proper scroll behavior for long client lists

### 2. Session Tracking Screen (Service Provider)
**Purpose**: Track work sessions for a specific client
**Features**:
- Client name and hourly rate display
- Session control:
  - Default state: "I'm Here" button (starts session)
  - Active state: "I'm Done" button (ends session)
- Show current unpaid balance and hours
- "Request Payment" button (when unpaid > 0)

### 3. Client View Screen (Client)
**Purpose**: Unified activity timeline with payment management
**Features**:
- **Activity Timeline**: Clean, line-based design showing:
  - **Work Sessions**: 🕒 "Work: MM/DD/YYYY" with "4hr 30min (9:00am-1:30pm)"
  - **Payments**: 💰 "Payment Sent" with "MM/DD/YYYY X sessions" and amount
- **Payment Management**: Mark payments as "Paid" with:
  - Editable amount (for partial payments)
  - Payment method: Cash, Zelle, PayPal, Bank Transfer, Other
- **Status Indicators**: Color-coded pills for unpaid/requested/paid status
- **Chronological Order**: Most recent activities displayed first

### 4. History Screen
**Purpose**: View past sessions and payments
**Features**:
- List of sessions with:
  - Date, start/end time, duration
  - Amount and payment status
- Summary totals:
  - Total earned
  - Total hours worked
  - Paid vs unpaid breakdown

## Design Principles

### Unified Timeline Design
- **Consistency**: Both service provider and client views use the same clean, minimalistic timeline design
- **Icons**: 🕒 for work sessions, 💰 for payment activities
- **Layout**: Icon → Content → Amount/Status (right-aligned)
- **Time Format**: Always "Xhr Ymin" (e.g., "4hr 30min") instead of decimal hours
- **Date Format**: MM/DD/YYYY for all dates
- **Performance**: Optimized with useMemo for large datasets

### Information Hierarchy
- **Service Provider Focus**: Unpaid hours and unpaid balance (not total lifetime stats)
- **Client Focus**: Amount owed and unpaid hours for transparency
- **Perspective Labels**: "Payment Received" (service provider) vs "Payment Sent" (client)
- **Status Indicators**: Color-coded pills for quick status recognition

### User Experience
- **Single Timeline**: Mixed work sessions and payments in chronological order
- **Clean Design**: No card backgrounds, simple line-based layout
- **Touch Targets**: Appropriate sizing for mobile interaction
- **Loading States**: Proper loading indicators and error handling

## Data Models

### Client
```typescript
{
  id: string
  name: string
  hourlyRate: number
}
```

### Session
```typescript
{
  id: string
  clientId: string
  startTime: Date
  endTime?: Date
  duration?: number // in hours
  hourlyRate: number // snapshot at time of session
  amount?: number // duration × hourlyRate
  status: 'active' | 'unpaid' | 'paid'
}
```

### Payment
```typescript
{
  id: string
  clientId: string
  sessionIds: string[] // array of session IDs included in payment
  amount: number
  method: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other'
  paidAt: Date
}
```

## Key Functions (AsyncStorage)
- `addClient(name, hourlyRate)` - Add new client
- `startSession(clientId)` - Start timing work session
- `endSession(sessionId)` - End session and calculate payment
- `requestPayment(clientId, sessionIds)` - Create payment request
- `markPaid(paymentId, amount, method)` - Mark payment as completed

## UI/UX Guidelines

### Styling
- Use nativewind (Tailwind for React Native)
- Large, accessible CTA buttons
- Color scheme:
  - Green: Paid/positive balances
  - Orange: Unpaid amounts
  - Blue: Summary totals

### Navigation
- Tab navigation between:
  - Clients (Service Provider)
  - Activity Feed (Client View)
  - History
- Stack navigation for client details

### Components
- Chat-style feed for client updates
- Card layout for history items
- Form inputs for adding clients
- Timer display for active sessions

## Technical Requirements

### Platform Support
- Expo Web (browser)
- Expo Go (mobile)

### Dependencies
- Expo (React Native)
- nativewind v4+
- AsyncStorage
- React Navigation
- TypeScript

### Seed Data
Include demo data:
- 2-3 sample clients
- A few completed sessions
- Mixed paid/unpaid status for testing

## Development Phases

### **Phase 1: Account Selection & Lucy's View Foundation** ✅
**Goal**: Implement the initial account selection and basic Lucy functionality

**Tasks**:
- [x] Create Account Selection Screen (Design 01 mockup)
- [x] Route to appropriate view based on selected account
- [x] Initialize Lucy's client list with seed data
- [x] Test data persistence and loading

**Verification**: Account selection works, Lucy sees her client list

---

### **Phase 2: Add New Client Functionality** ✅
**Goal**: Lucy can add new clients and see data persistence

**Tasks**:
- [x] Create "Add Client" modal/screen
- [x] Implement form validation (name + hourly rate)
- [x] Save new client to AsyncStorage
- [x] Refresh client list to show new client
- [x] Test data persistence across app reloads

**Verification**: Lucy can add clients, data persists, client list updates

---

### **Phase 3: Session Tracking & Time Management** ✅
**Goal**: Lucy can start/stop work sessions with clients

**Major Updates - Interface Redesign & Bug Fixes**:
- [x] **REDESIGNED**: Moved session tracking directly to ClientHistoryScreen (no separate page)
- [x] **FIXED**: Client ID duplication bug causing wrong pages to load
- [x] **ENHANCED**: Added live timer display on "I'm Done" button (hr:min format)
- [x] **OPTIMIZED**: Timer updates every minute (not second) to reduce re-renders
- [x] **ADDED**: Client profile page with editable hourly rates
- [x] **SIMPLIFIED**: Removed distracting session counters and value displays

**Known Issues**:
- [ ] **BUG**: Web browser scrolling not working properly on Client List screen - still needs investigation
- [x] **FIXED**: Sarah and Mike showing Molly's page (duplicate client IDs)
- [x] **FIXED**: Sessions showing $0.00 instead of correct amounts
- [x] **FIXED**: StatusPill re-rendering every second causing performance issues

**Tasks**:
- [x] Implement "I'm Here" button functionality (start session)
- [x] Implement "I'm Done" button functionality (end session)
- [x] Calculate session duration and earnings automatically
- [x] Update client balance and hours in real-time
- [x] Test session state management
- [x] **NEW**: Add live timer display to active session button
- [x] **NEW**: Move session controls to client history page (eliminate extra navigation)
- [x] **NEW**: Create client profile editing capability
- [x] **NEW**: Fix unique ID generation with triple-layer protection
- [x] **NEW**: Optimize component re-rendering performance
- [x] **NEW**: Limit session history to last 10 items chronologically
- [x] **NEW**: Enhanced visual hierarchy with primary/secondary actions

**Technical Improvements**:
- **ID Generation**: Fixed race condition with `timestamp-counter-random` format
- **Performance**: Reduced timer frequency from 1s to 60s updates
- **Data Management**: Added `clearAllDataAndReinitialize()` function
- **UX Flow**: Direct session tracking without navigation complexity
- **Component Design**: Focused interface showing only actionable information

**Verification**: ✅ Lucy can start/stop sessions, time tracked correctly, earnings calculated, unique client pages load, live timer displays, performance optimized

---

### **Phase 4: Work History & Session Display** ✅
**Goal**: Display work history with proper status indicators

**Tasks**:
- [x] Implement session history display with new StatusPill component
- [x] Show session date, time range, duration, amount
- [x] Display payment status (paid/unpaid/requested)
- [x] Test with multiple sessions per client
- [x] Verify dashboard stats calculations
- [x] **NEW**: Added 'requested' status to Session type
- [x] **NEW**: Enhanced test data with 6 sessions across all clients
- [x] **NEW**: Sessions display chronologically (newest first)
- [x] **NEW**: Limited to last 10 sessions for performance

**Technical Enhancements**:
- **Session Data**: Added comprehensive test sessions with all status types
- **StatusPill**: Supports paid (green), unpaid (orange), requested (blue)
- **Display Format**: Date, time range, duration, amount all properly formatted
- **Stats Accuracy**: Unpaid hours/balance calculations working correctly

**Phase 4 Extension - Enhanced Client List Cards**:
- [x] **REDESIGNED**: Client card layout with better information hierarchy
- [x] **NEW**: "Balance due: $X" format instead of just "$X"
- [x] **NEW**: Inline "[Xhr Ymin unpaid]" format replacing separate hours block
- [x] **NEW**: Inline "Request Payment" button on each client card
- [x] **NEW**: Confirmation dialog for payment requests
- [x] **NEW**: Improved visual layout with client info on left, financial info on right
- [x] **NEW**: Better space utilization and actionable interface

**Enhanced Client Card Features**:
- **Layout**: Client name + hourly rate (left), Balance + hours + action (right)
- **Information**: "Balance due: $238" with "[6hr 30min unpaid]" context
- **Actions**: Direct payment request with confirmation dialog
- **Integration**: Works with existing payment request system

**Verification**: ✅ History shows correctly, stats accurate, status pills display properly, all session types represented, enhanced client cards provide better utility and actionable interface

---

### **Phase 4.5: Client View Implementation (Molly's Perspective)** ✅
**Goal**: Complete client-side functionality for viewing service providers and managing payments

**Tasks**:
- [x] **Dynamic Account Selection**: Updated AccountSelectionScreen to load all clients from storage dynamically
- [x] **Client Navigation Flow**: Route clients to ServiceProviderList instead of provider's ClientList
- [x] **ServiceProviderListScreen**: Client's dashboard showing service providers they work with
- [x] **ServiceProviderSummaryScreen**: Detailed view of service provider with unpaid amounts and work history
- [x] **MarkAsPaidModal**: Full payment recording functionality with date picker and payment method dropdown
- [x] **Enhanced Storage Functions**: Added client-provider relationship support
- [x] **Cross-App Updates**: Payment status changes reflect in both client and provider views

**Key Features Implemented**:
- **Dynamic Account Loading**: All clients (including newly added Adda, Kel) appear in account selection
- **Client Dashboard**: Shows service providers with unpaid amounts in card format
- **Payment Recording**:
  - Pre-filled date (editable with manual input)
  - Payment method dropdown (Cash, Zelle, PayPal, Bank Transfer, Other)
  - Custom payment amount input with validation
  - Confirmation dialog with payment recording
- **Unified Work History**: Same session display as Lucy sees, but from client perspective
- **Real-time Updates**: Payment changes immediately visible on both sides

**Apple-Style Design Principles Applied**:
- Clean information hierarchy with clear visual separation
- Consistent spacing and typography throughout
- Subtle shadows and rounded corners for depth
- Color coding: Green for paid status, Orange for unpaid amounts
- Large, accessible touch targets for primary actions
- Modal overlays with proper backdrop dimming

**Technical Enhancements**:
- Added `getServiceProvidersForClient()` and `getClientSessionsForProvider()` storage functions
- Enhanced navigation with new routes: ServiceProviderList, ServiceProviderSummary
- Integrated @react-native-picker/picker for payment method selection
- Cross-component state management for payment flow

**Verification**: ✅ Clients can view service providers, see unpaid amounts, mark payments as paid with full payment details, and changes reflect across the entire app

---

### **Phase 5: Payment Request Flow (Lucy Side)** ✅
**Goal**: Lucy can request payments for unpaid work

**Tasks**:
- [x] Implement "Request Payment" button functionality (completed in Phase 4 enhancement)
- [x] Change session status from "unpaid" to "requested" (completed in Phase 4 enhancement)
- [x] Update UI to reflect payment request status (completed in Phase 4 enhancement)
- [x] Test payment request flow with multiple sessions (completed in Phase 4 enhancement)
- [x] Verify status changes persist (completed in Phase 4 enhancement)

**Verification**: ✅ Lucy can request payments, status updates to "requested"

---

### **Phase 6: Client View Implementation (Molly's Perspective)** ✅
**Goal**: Create client-side view for Molly to see Lucy's work

**Tasks**:
- [x] Create Service Provider List screen for clients (completed in Phase 4.5)
- [x] Create Service Provider Summary screen (client version) (completed in Phase 4.5)
- [x] Show unpaid hours, amount owed, payment requests (completed in Phase 4.5)
- [x] Implement client-side work history view (completed in Phase 4.5)
- [x] Test switching between Lucy and Molly accounts (completed in Phase 4.5)

**Verification**: ✅ Molly can see Lucy's work summary and payment requests

---

### **Phase 7: Payment Approval & Management** ✅
**Goal**: Molly can mark payments as paid

**Tasks**:
- [x] Implement "Mark as Paid" functionality (completed in Phase 4.5)
- [x] Change session status from "requested" to "paid" (completed in Phase 4.5)
- [x] Update balances and calculations (completed in Phase 4.5)
- [x] Create payment confirmation flow (completed in Phase 4.5)
- [x] Test end-to-end payment cycle (completed in Phase 4.5)

**Verification**: ✅ Complete payment cycle works (request → approve → paid)

---

### **Phase 8: Testing & Bug Fixes**
**Goal**: Comprehensive testing and refinement

**Tasks**:
- [ ] Test all user flows end-to-end
- [ ] Test data persistence across app reloads
- [ ] Test edge cases (no data, multiple sessions, etc.)
- [ ] Fix any bugs or UI issues
- [ ] Verify design matches mockups

**Verification**: App works reliably, all flows complete successfully

---

### **Phase 9: Final Polish & Commit**
**Goal**: Code cleanup and final commit

**Tasks**:
- [ ] Code cleanup and optimization
- [ ] Remove any debug logging
- [ ] Final design refinements
- [ ] Comprehensive testing
- [ ] Git commit with all changes

**Verification**: Clean, production-ready code committed

## Success Criteria
1. ✅ Runs in both web browser and Expo Go
2. ✅ Service provider can add clients and track sessions
3. ✅ Sessions correctly calculate time and payment amounts
4. ✅ Client view shows real-time activity feed
5. ✅ Payment flow works (request → mark paid)
6. ✅ Data persists using AsyncStorage
7. ✅ UI is responsive and follows design guidelines





 Future V2 Notes (won't implement now)

     - Client profile with name/rate editing -- this was done
     - Monthly/yearly earning statistics  
     - Earning potential estimations
     - Comprehensive analytics



  - Email: athahar+lucy@gmail.com
  - Password: lucy123456

  athhar+test@gmail.com
  123456@

📋 Client Login Credentials:
 Password (same for all): demo123$
Emails:
  - Kel K: ath.sub.007+kel@gmail.com 
  - Molly Johnson: ath.sub.007+molly@gmail.com 
  - Mash n: athmash247@gmail.com 
  - Sarah Davis: ath.sub.007+sarah@gmail.com
  - Sam Li: ath.sub.007+sam@gmail.com 
  - Adda Smith: ath.sub.007+adda@gmail.com 

🚀 To test client accounts:
