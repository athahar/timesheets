# TrackPay Authentication System Design

## Overview
Implement secure authentication using Supabase Auth while preserving the existing dual-role system (service provider/client).

## Authentication Flow

### 1. App Launch
```
App Start → Check Auth State
├── Authenticated → Role Selection/Main App
└── Not Authenticated → Welcome/Login Screen
```

### 2. Authentication Screens
- **WelcomeScreen**: Introduction with Login/Register buttons
- **LoginScreen**: Email/password login
- **RegisterScreen**: Sign up with email/password + role selection
- **ForgotPasswordScreen**: Password reset

### 3. Protected Routes
- All main app functionality requires authentication
- Role-based access control (provider vs client views)

## Database Schema Integration

### User Profile Enhancement
Extend existing `trackpay_users` table to include auth:
- `auth_user_id` (references Supabase auth.users.id)
- `email` (from auth, also stored locally)
- `role` (provider/client)
- `display_name`
- `created_at`, `updated_at`

## Implementation Plan

### Phase 1: Auth Infrastructure
1. Create authentication context/hooks
2. Add auth screens (Welcome, Login, Register)
3. Implement auth guards for navigation

### Phase 2: User Management
1. Link Supabase auth with trackpay_users table
2. Profile management screens
3. Role-based data access

### Phase 3: Enhanced Features
1. Password reset functionality
2. Email verification
3. Social auth (optional)

## Technical Implementation

### Auth Context
```typescript
interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  role: 'provider' | 'client' | null;
}

interface AuthMethods {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

### Navigation Structure
```
AuthStack (if not authenticated)
├── Welcome
├── Login
├── Register
└── ForgotPassword

AppStack (if authenticated)
├── RoleSelection (if role not set)
└── MainApp (existing screens)
```

### Security Features
- Auto-logout on token expiry
- Secure session storage
- Protected route guards
- Role-based access control
- Password validation
- Email verification

## Benefits
1. **Security**: Proper user authentication and authorization
2. **Data Isolation**: Each user sees only their data
3. **Scalability**: Support multiple users per role
4. **Compliance**: Industry-standard auth practices
5. **UX**: Seamless login/logout experience

## Migration Strategy
1. Implement auth alongside existing system
2. Gradually migrate from local-only to auth-based
3. Maintain backward compatibility during transition
4. Test thoroughly before full deployment