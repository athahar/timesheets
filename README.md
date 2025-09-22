# Timesheet App Prototype

A two-sided time tracking and payment request app built with Expo (React Native), featuring service provider and client views with real-time activity feeds.

## Features

### Service Provider View (Lucy)
- **Client List**: Manage multiple clients with hourly rates
- **Session Tracking**: Start/stop work sessions with live timer
- **Payment Requests**: Request payment for unpaid work
- **Real-time Calculations**: Automatic time and payment calculations

### Client View (Molly)
- **Activity Feed**: Chat-style feed of service provider activities
- **Payment Processing**: Mark payments as completed with method selection
- **Session Notifications**: Real-time updates on work sessions

### Shared Features
- **History View**: Complete session history with filtering
- **Summary Analytics**: Total hours, earnings, and payment breakdowns
- **Persistent Storage**: Data saved locally using AsyncStorage

## Tech Stack

- **Framework**: Expo (React Native) with TypeScript
- **Styling**: nativewind (Tailwind CSS for React Native)
- **Navigation**: React Navigation with stack and bottom tab navigators
- **Storage**: AsyncStorage for local data persistence
- **Platform Support**: Web browser and mobile (iOS/Android via Expo Go)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- For mobile testing: Expo Go app on your device

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:

**For Web:**
```bash
npm run web
```
Opens in browser at `http://localhost:8081`

**For Mobile:**
```bash
npm start
```
Scan QR code with Expo Go app

**Platform-specific:**
```bash
npm run ios     # iOS simulator
npm run android # Android emulator
```

## App Usage

### Getting Started
1. App launches with sample data (3 clients with existing sessions)
2. Navigate between tabs: Clients, Activity Feed, History

### Service Provider Flow
1. **Clients Tab**: View all clients and their unpaid balances
2. **Add New Client**: Tap "Add New Client" → Enter name and hourly rate
3. **Start Session**: Tap client → "I'm Here" to start timing
4. **End Session**: "I'm Done" to stop and calculate payment
5. **Request Payment**: Use "Request Payment" for outstanding balances

### Client Flow
1. **Activity Tab**: See real-time updates from service provider
2. **Payment Requests**: Tap "Mark as Paid" on payment requests
3. **Payment Details**: Enter amount and select payment method

### History & Analytics
1. **History Tab**: View all sessions with status filtering
2. **Summary Cards**: See total hours, earnings, paid/unpaid breakdown
3. **Filter Options**: All, Paid, Unpaid, Active sessions

## Data Model

### Clients
- ID, name, hourly rate

### Sessions
- Start/end times, duration, amount, status (active/unpaid/paid)
- Linked to client with rate snapshot

### Payments
- Amount, method, session IDs, completion date

### Activities
- Real-time feed items for session events and payments

## Project Structure

```
src/
├── components/     # Reusable UI components
├── navigation/     # App navigation setup
├── screens/        # Main app screens
├── services/       # AsyncStorage data layer
└── types/          # TypeScript type definitions
```

## Development Notes

- Uses AsyncStorage for prototype persistence
- Includes seed data for demo purposes
- Live timer updates during active sessions
- Real-time activity feed updates
- Responsive design for web and mobile

## Future Enhancements

- User authentication
- Cloud database integration (Supabase)
- Push notifications
- Offline sync
- Payment processing integration

## Troubleshooting

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Web styling issues:**
Ensure tailwind.config.js includes nativewind preset

**Navigation issues:**
Check that all dependencies are installed:
```bash
npx expo install react-dom react-native-web
```




use accounts

provider:
  - Email: athahar+lucy@gmail.com
  - Password: lucy123456

provider:

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