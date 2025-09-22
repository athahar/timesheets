# Apple App Store Deployment Requirements Specification

## Overview
Complete step-by-step guide to deploy TrackPay timesheet app to Apple App Store using Expo, starting with TestFlight testing.

## Prerequisites ✅
- [x] Apple Developer Account created
- [x] Expo React Native app built and working
- [x] App functionality tested and working locally

---

## Phase 1: Pre-Deployment Cleanup & Preparation

### 1.1 App Information & Branding
- [ ] **App Name**: Finalize official app name (currently "TrackPay")
- [ ] **Bundle Identifier**: Choose unique identifier (e.g., `com.yourcompany.trackpay`)
- [ ] **App Version**: Set initial version (e.g., `1.0.0`)
- [ ] **Build Number**: Set initial build (e.g., `1`)

### 1.2 App Icons & Assets
- [ ] **App Icon**: Create 1024x1024px app icon (PNG, no transparency)
- [ ] **Splash Screen**: Design launch screen/splash screen
- [ ] **Screenshots**: Prepare screenshots for different device sizes:
  - iPhone 6.7" (iPhone 14 Pro Max)
  - iPhone 6.5" (iPhone 14 Plus)
  - iPhone 5.5" (iPhone 8 Plus)
  - iPad Pro 12.9" (6th generation)
  - iPad Pro 12.9" (2nd generation)

### 1.3 App Store Metadata
- [ ] **App Description**: Write compelling app description (max 4,000 characters)
- [ ] **Keywords**: Research and select relevant keywords (max 100 characters)
- [ ] **Subtitle**: Short description (max 30 characters)
- [ ] **Promotional Text**: Marketing text (max 170 characters)
- [ ] **What's New**: Release notes for version 1.0.0
- [ ] **Support URL**: Create support page/email
- [ ] **Privacy Policy URL**: Create privacy policy page

### 1.4 Code Cleanup & Optimization
- [ ] **Remove Debug Code**: Remove all console.log statements and debug code
- [ ] **Environment Variables**: Ensure production Supabase credentials
- [ ] **Error Handling**: Add comprehensive error boundaries
- [ ] **Performance**: Optimize bundle size and loading times
- [ ] **Security**: Remove any hardcoded secrets or test data
- [ ] **Accessibility**: Add accessibility labels and support

---

## Phase 2: Expo Configuration

### 2.1 Update app.json/app.config.js
```json
{
  "expo": {
    "name": "TrackPay",
    "slug": "trackpay",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.trackpay",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses camera for profile photos",
        "NSPhotoLibraryUsageDescription": "This app accesses photo library for profile photos"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.trackpay"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 2.2 Create eas.json for Build Configuration
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Phase 3: Apple Developer Console Setup

### 3.1 App Store Connect Configuration
- [ ] **Log into App Store Connect**: https://appstoreconnect.apple.com
- [ ] **Create New App**:
  - Platform: iOS
  - Name: TrackPay
  - Primary Language: English
  - Bundle ID: com.yourcompany.trackpay
  - SKU: trackpay-ios-2024

### 3.2 Certificates & Provisioning
- [ ] **Distribution Certificate**: Create iOS Distribution certificate
- [ ] **App Store Provisioning Profile**: Create for your bundle ID
- [ ] **Push Notification Certificate**: If using push notifications
- [ ] **Associated Domains**: If using deep links (trackpay.app)

### 3.3 App Information Setup
- [ ] **Privacy Policy**: Upload privacy policy
- [ ] **App Category**: Business or Productivity
- [ ] **Content Rating**: Rate your app appropriately
- [ ] **App Review Information**: Contact info for Apple review team
- [ ] **Demo Account**: Provide test account if needed

---

## Phase 4: Build Process

### 4.1 Install EAS CLI
```bash
npm install -g eas-cli
eas login
eas init --id your-project-id
```

### 4.2 Configure Build
- [ ] **Update Dependencies**: Ensure all packages are up to date
- [ ] **Test Local Build**: `npx expo run:ios` locally first

### 4.3 Production Build & Deploy (TESTED WORKFLOW)

#### ✅ **Proven Deployment Steps:**

**Step 1: Build for Production**
```bash
eas build -p ios --profile production
```
- Uses App Store distribution (no device registration required)
- Builds with production environment variables
- Creates IPA file in EAS dashboard
- Build time: ~10-15 minutes

**Step 2: Submit to TestFlight**
```bash
eas submit --platform ios
```
- Automatically uploads IPA to App Store Connect
- Submits to TestFlight for internal testing
- Available for download on registered devices via TestFlight app
- Processing time: ~5-10 minutes

#### 🚫 **Avoid These Approaches:**
- `eas build --platform ios --profile preview` - Requires 1-hour device registration delay
- Manual IPA upload via Xcode - Unnecessary with EAS submit
- Internal distribution profiles - Use production profile for TestFlight

#### 📱 **TestFlight Testing:**
1. Build completes and appears in EAS dashboard
2. `eas submit` uploads to App Store Connect
3. TestFlight processes the build (5-10 minutes)
4. Download TestFlight app on iPhone
5. Install and test TrackPay from TestFlight
6. Gather feedback and iterate if needed

#### 🔄 **Iteration Cycle:**
For each new version:
1. Make code changes and commit
2. Increment build number in app.json
3. `eas build -p ios --profile production`
4. `eas submit --platform ios`
5. Test on TestFlight
6. Repeat until ready for App Store
- [ ] **Environment Setup**: Configure production environment variables

### 4.3 Create Production Build
```bash
# First build for internal testing
eas build --platform ios --profile preview

# Production build for App Store
eas build --platform ios --profile production
```

---

## Phase 5: TestFlight Deployment

### 5.1 Upload to TestFlight
```bash
# Automatic submission to TestFlight
eas submit --platform ios
```

### 5.2 TestFlight Configuration
- [ ] **Test Information**: Add what to test notes
- [ ] **Beta App Review**: Submit for beta review if using external testing
- [ ] **Internal Testing**: Add internal testers (up to 100)
- [ ] **External Testing**: Add external testers (up to 10,000) if needed

### 5.3 Testing Process
- [ ] **Internal Testing**: Test with team members
- [ ] **Bug Fixes**: Address any issues found
- [ ] **User Feedback**: Collect feedback from testers
- [ ] **Iterate**: Upload new builds as needed

---

## Phase 6: App Store Submission

### 6.1 Final Preparation
- [ ] **Final Testing**: Complete end-to-end testing
- [ ] **Screenshots**: Upload all required screenshots
- [ ] **App Preview Video**: Optional but recommended
- [ ] **Age Rating**: Complete age rating questionnaire
- [ ] **Pricing**: Set app price (free recommended for initial launch)

### 6.2 App Review Preparation
- [ ] **Review Guidelines**: Ensure compliance with App Store Review Guidelines
- [ ] **Test Account**: Provide working test account with sample data
- [ ] **Demo Video**: Prepare demo video if app functionality is complex
- [ ] **Contact Information**: Ensure contact info is accurate

### 6.3 Submit for Review
- [ ] **Submit for Review**: Click submit in App Store Connect
- [ ] **Monitor Status**: Track review status
- [ ] **Respond to Feedback**: Address any reviewer feedback quickly

---

## Phase 7: Post-Launch

### 7.1 Launch Monitoring
- [ ] **Crash Monitoring**: Monitor for crashes using Expo/Sentry
- [ ] **User Reviews**: Monitor and respond to user reviews
- [ ] **Analytics**: Track user engagement and usage patterns
- [ ] **Performance**: Monitor app performance metrics

### 7.2 Ongoing Maintenance
- [ ] **Bug Fixes**: Regular bug fix releases
- [ ] **Feature Updates**: Plan and implement new features
- [ ] **OS Updates**: Test and update for new iOS versions
- [ ] **Security Updates**: Keep dependencies updated

---

## Required Assets Checklist

### App Icons (Required)
- [ ] 1024x1024px - App Store icon (PNG, no transparency)
- [ ] Generate all other sizes using Expo icon tool

### Screenshots (Required for each device size)
- [ ] iPhone 6.7" - at least 3 screenshots
- [ ] iPhone 6.5" - at least 3 screenshots
- [ ] iPhone 5.5" - at least 3 screenshots
- [ ] iPad Pro 12.9" - at least 3 screenshots
- [ ] iPad Pro 12.9" (2nd gen) - at least 3 screenshots

### Marketing Assets (Optional but Recommended)
- [ ] App Preview videos (up to 3 per device size)
- [ ] Feature graphic for marketing
- [ ] Press kit materials

---

## Timeline Estimate

- **Phase 1-2 (Cleanup & Config)**: 2-3 days
- **Phase 3 (Apple Setup)**: 1 day
- **Phase 4 (Build Process)**: 1 day
- **Phase 5 (TestFlight)**: 1-2 weeks testing
- **Phase 6 (App Store)**: 1-7 days review
- **Total**: 2-4 weeks from start to App Store approval

---

## Common Issues & Solutions

### Build Failures
- Ensure all dependencies are compatible
- Check for missing assets or configurations
- Verify bundle identifier matches exactly

### App Store Rejection Reasons
- Missing privacy policy
- Incomplete app functionality
- Crashes during review
- Missing required metadata

### TestFlight Issues
- Beta app review required for external testing
- Builds expire after 90 days
- Maximum 100 internal testers

---

## Next Steps

1. **Start with Phase 1**: Clean up the app and prepare assets
2. **Create App Store Connect app**: Set up the basic app listing
3. **Configure Expo**: Update app.json and create eas.json
4. **First TestFlight build**: Get internal testing working
5. **Iterate and improve**: Based on testing feedback
6. **Submit to App Store**: When ready for public release

Would you like me to help you start with any specific phase or create any of these assets?