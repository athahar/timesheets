# Testing TrackPay Production Database Locally

**Date:** October 20, 2025
**Production Database:** prod-db (ddxggihlncanqdypzsnn)
**Testing Method:** Expo Go + QR Code

---

## ✅ **Current Configuration**

Your app is now pointing to **PRODUCTION DATABASE**:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ddxggihlncanqdypzsnn.supabase.co
EXPO_PUBLIC_ENV=production
```

⚠️ **WARNING:** Any data you create will go to the REAL production database!

---

## 📱 **How to Test with Expo Go**

### **Step 1: Start Expo Development Server**

```bash
npm start
```

This will show you a QR code in the terminal.

### **Step 2: Scan QR Code**

**On iPhone:**
1. Open **Camera app**
2. Point at the QR code
3. Tap the notification that appears
4. App will open in **Expo Go**

**On Android:**
1. Open **Expo Go app**
2. Tap "Scan QR code"
3. Point at the QR code

### **Step 3: App Loads with Production Database**

The app will now connect to:
- **Production Supabase:** ddxggihlncanqdypzsnn.supabase.co
- **Live Database:** All CRUD operations go to production

---

## 🧪 **Recommended Testing Flow**

### **1. Test Provider Registration**

- [ ] Tap "Register" (assuming you have registration screen)
- [ ] Use test email: `test-provider-oct20@trackpay.app`
- [ ] Password: `TestPassword123!`
- [ ] Select role: **Provider**
- [ ] Submit registration

**Verify in Supabase Dashboard:**
```
https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/editor
→ Table: trackpay_users
→ Should see new user with role='provider'
```

### **2. Test Client Registration (via Invite)**

**As Provider:**
- [ ] Create an invite code
- [ ] Note the invite code

**As Client (use different device or logout):**
- [ ] Use invite code to register
- [ ] Email: `test-client-oct20@trackpay.app`
- [ ] Password: `TestPassword123!`

**Verify in Dashboard:**
```
→ Table: trackpay_invites (should show claimed=true)
→ Table: trackpay_users (should see new client user)
→ Table: trackpay_relationships (should see provider-client link)
```

### **3. Test Session Tracking**

**As Provider:**
- [ ] View clients list
- [ ] Select a client
- [ ] Start a work session
- [ ] Let timer run for 1-2 minutes
- [ ] Stop session

**Verify in Dashboard:**
```
→ Table: trackpay_sessions
→ Should see session with:
  - start_time (timestamp)
  - end_time (timestamp)
  - duration_minutes (calculated)
  - amount (hourly_rate * duration)
```

### **4. Test Payment Request**

**As Provider:**
- [ ] View unpaid sessions
- [ ] Request payment for a session

**Verify in Dashboard:**
```
→ Table: trackpay_requests
→ Should see payment request with status='pending'
→ Table: trackpay_activities
→ Should see activity entry for payment request
```

**As Client:**
- [ ] View pending payment requests
- [ ] Mark payment as sent

**Verify in Dashboard:**
```
→ Table: trackpay_payments
→ Should see payment record
→ Table: trackpay_sessions
→ Session status should update to 'paid'
```

### **5. Test Real-time Updates**

**Setup:** Use two devices (or web + mobile)
- Device 1: Logged in as Provider
- Device 2: Logged in as Client

**Test:**
- [ ] Provider starts session → Client should see it update
- [ ] Client marks payment → Provider should see it update
- [ ] Provider creates activity → Client should see it in feed

---

## 🔍 **Monitoring Production Data**

### **Supabase Dashboard:**

**View Tables:**
```
https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/editor
```

**Check Auth Users:**
```
https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/auth/users
```

**Monitor API Usage:**
```
https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/settings/api
→ Check request counts
→ Verify no errors
```

---

## 🧹 **Cleaning Up Test Data**

After testing, you can delete test data via SQL Editor:

```sql
-- Delete test users and all related data
DELETE FROM trackpay_activities WHERE user_id IN (
  SELECT id FROM trackpay_users WHERE email LIKE 'test-%@trackpay.app'
);

DELETE FROM trackpay_sessions WHERE provider_id IN (
  SELECT id FROM trackpay_users WHERE email LIKE 'test-%@trackpay.app'
);

DELETE FROM trackpay_relationships WHERE provider_id IN (
  SELECT id FROM trackpay_users WHERE email LIKE 'test-%@trackpay.app'
);

DELETE FROM trackpay_users WHERE email LIKE 'test-%@trackpay.app';
```

**Or delete manually:**
1. Go to Table Editor
2. Select `trackpay_users` table
3. Find test users (email contains "test-")
4. Delete rows (related data will cascade delete)

---

## 🔄 **Switching Back to Local/Staging**

### **Switch to Local Supabase (Docker):**

```bash
# Make sure local Supabase is running
supabase start

# Copy local environment
cp .env.local .env

# Restart Expo
npm start
```

### **Switch to Staging:**

```bash
# Copy staging environment
cp .env.staging .env   # (you may need to create this file)

# Or manually edit .env to use staging:
# EXPO_PUBLIC_SUPABASE_URL=https://qpoqeqasefatyrjeronp.supabase.co
```

---

## ⚠️ **Important Warnings**

### **DO NOT:**
- ❌ Use real client names or data during testing
- ❌ Commit `.env` file to git (it's in .gitignore)
- ❌ Share screenshots with API keys visible
- ❌ Leave test data in production for too long

### **DO:**
- ✅ Use obviously fake test emails (`test-*@trackpay.app`)
- ✅ Clean up test data after testing
- ✅ Monitor Supabase dashboard during testing
- ✅ Test both Provider and Client flows
- ✅ Verify RLS is working (users can only see their own data)

---

## 📊 **Expected Console Output**

When app connects to production, you should see (in Metro bundler console):

```
✅ Supabase client initialized
Environment: production
URL: https://ddxggihlncanqdypzsnn.supabase.co
```

**If you see errors:**
- Check `.env` file has correct credentials
- Verify Supabase dashboard is accessible
- Check RLS policies are enabled (they are - we deployed them)
- Look for auth errors (sign in with correct credentials)

---

## 🚀 **Next Steps After Testing**

Once you've verified production works:

### **Option 1: Continue Testing Locally**
Keep using Expo Go with production database

### **Option 2: Build for TestFlight**
```bash
# Build preview (staging database)
eas build --platform ios --profile preview

# Build production (prod-db)
eas build --platform ios --profile production
```

### **Option 3: Switch Back to Staging for Development**
```bash
cp .env.staging .env  # or create .env.staging if it doesn't exist
npm start
```

---

## 🔗 **Quick Reference**

| Environment | Supabase URL | Database |
|-------------|--------------|----------|
| **Local** | http://127.0.0.1:54321 | Docker (empty/seed data) |
| **Staging** | https://qpoqeqasefatyrjeronp.supabase.co | Staging DB |
| **Production** | https://ddxggihlncanqdypzsnn.supabase.co | prod-db (LIVE) |

**Current:** ✅ **PRODUCTION** (ddxggihlncanqdypzsnn)

---

**Ready to test!** Run `npm start` and scan the QR code. 📱
