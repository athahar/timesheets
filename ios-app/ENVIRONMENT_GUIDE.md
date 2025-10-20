# TrackPay Environment Management Guide

**Last Updated:** October 20, 2025

---

## 📁 **Environment Files Available**

| File | Environment | Database | Committed to Git? |
|------|-------------|----------|-------------------|
| `.env` | **Active** (changes based on what you copy) | Varies | ❌ No |
| `.env.local` | Local Supabase (Docker) | http://127.0.0.1:54321 | ❌ No |
| `.env.staging` | Staging | qpoqeqasefatyrjeronp | ❌ No |
| `.env.production` | Production (LIVE) | ddxggihlncanqdypzsnn | ❌ No |
| `.env.sample` | Template (no real keys) | - | ✅ Yes |

**Current Active:** Production (ddxggihlncanqdypzsnn)

---

## 🔄 **How to Switch Environments**

### **Switch to Local Development (Docker):**

```bash
# Make sure local Supabase is running
supabase start

# Switch environment
cp .env.local .env

# Restart Expo
npm start
```

**Use for:**
- Local development without internet
- Testing migrations before deploying
- Safe experimentation (data in Docker, not cloud)

---

### **Switch to Staging:**

```bash
# Switch environment
cp .env.staging .env

# Restart Expo
npm start
```

**Use for:**
- Testing with cloud database
- Pre-production testing
- Sharing test builds with team
- Testing before deploying to production

---

### **Switch to Production:**

```bash
# Switch environment
cp .env.production .env

# Restart Expo
npm start
```

**Use for:**
- Testing production database locally
- Verifying production deployment
- Emergency production debugging

⚠️ **WARNING:** This uses LIVE production data!

---

## 🔍 **Check Current Environment**

```bash
# See which environment is active
cat .env | grep -E "EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_ENV"
```

**Expected output examples:**

**Local:**
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_ENV=local
```

**Staging:**
```
EXPO_PUBLIC_SUPABASE_URL=https://qpoqeqasefatyrjeronp.supabase.co
EXPO_PUBLIC_ENV=staging
```

**Production:**
```
EXPO_PUBLIC_SUPABASE_URL=https://ddxggihlncanqdypzsnn.supabase.co
EXPO_PUBLIC_ENV=production
```

---

## 📊 **Environment Details**

### **Local (Docker)**
- **URL:** http://127.0.0.1:54321
- **Studio:** http://127.0.0.1:54323
- **Database:** PostgreSQL 15 in Docker
- **Data:** Empty (or seed data)
- **Start:** `supabase start`
- **Stop:** `supabase stop`
- **Reset:** `supabase db reset`

**Pros:**
- ✅ Works offline
- ✅ Fast reset/reload
- ✅ Safe to experiment
- ✅ No cost/limits

**Cons:**
- ❌ Requires Docker running
- ❌ Data lost when reset
- ❌ Can't share with team

---

### **Staging (qpoqeqasefatyrjeronp)**
- **URL:** https://qpoqeqasefatyrjeronp.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/qpoqeqasefatyrjeronp
- **Database:** PostgreSQL 15 in Supabase cloud
- **Data:** Test data, shared with team
- **Migrations:** Applied manually or via CLI

**Pros:**
- ✅ Cloud-hosted (always accessible)
- ✅ Team can share test data
- ✅ Pre-production testing
- ✅ Real-time features work

**Cons:**
- ❌ Shared environment (others may modify)
- ❌ Not isolated testing
- ❌ Counts toward API limits

**Use for:**
- Testing before production deployment
- QA testing
- Preview builds (`eas build --profile preview`)

---

### **Production (ddxggihlncanqdypzsnn)**
- **URL:** https://ddxggihlncanqdypzsnn.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn
- **Database:** PostgreSQL 17 in Supabase cloud (prod-db)
- **Data:** **LIVE PRODUCTION DATA** ⚠️
- **Migrations:** Deployed via `supabase db push --linked`

**Pros:**
- ✅ Real production environment
- ✅ Live data for testing
- ✅ Multi-project support (prod-db)

**Cons:**
- ❌ Real user data (handle carefully!)
- ❌ Changes affect live app
- ❌ Costs apply for usage

**Use for:**
- Production deployment verification
- Emergency debugging
- Production builds (`eas build --profile production`)

---

## 🚀 **Recommended Workflow**

### **Daily Development:**
```bash
# Use local Supabase
supabase start
cp .env.local .env
npm start
```

### **Testing New Features:**
```bash
# Test locally first
supabase start
cp .env.local .env
npm start

# Then test on staging
cp .env.staging .env
npm start
```

### **Pre-Production Testing:**
```bash
# Use staging for QA
cp .env.staging .env
npm start

# Or build preview
eas build --platform ios --profile preview
```

### **Production Deployment:**
```bash
# Verify production works
cp .env.production .env
npm start
# Test thoroughly!

# Build for production
eas build --platform ios --profile production
```

---

## ⚠️ **Important Rules**

### **NEVER:**
- ❌ Commit `.env` files to git (they're in .gitignore)
- ❌ Share `.env.production` file or credentials
- ❌ Test with real user data in staging/local
- ❌ Deploy to production without testing in staging first

### **ALWAYS:**
- ✅ Check which environment is active before testing
- ✅ Use test email addresses (`test-*@trackpay.app`)
- ✅ Clean up test data after testing production
- ✅ Test migrations locally before deploying to production

---

## 🧹 **Clean Up Test Data**

### **In Local (Docker):**
```bash
supabase db reset
# All data gone, reapplies migrations and seed data
```

### **In Staging/Production:**

**Via SQL Editor:**
```sql
-- Delete test users and related data
DELETE FROM trackpay_users WHERE email LIKE 'test-%@trackpay.app';
-- Related data cascades automatically
```

**Via Dashboard:**
1. Go to Table Editor
2. Select `trackpay_users`
3. Filter: `email` contains `test-`
4. Delete rows

---

## 🔗 **Quick Access Links**

### **Dashboards:**
- **Local:** http://127.0.0.1:54323
- **Staging:** https://supabase.com/dashboard/project/qpoqeqasefatyrjeronp
- **Production:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn

### **Table Editors:**
- **Local:** http://127.0.0.1:54323/project/default/editor
- **Staging:** https://supabase.com/dashboard/project/qpoqeqasefatyrjeronp/editor
- **Production:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/editor

---

## 🛠️ **Troubleshooting**

### **Problem: App not connecting to local Supabase**
```bash
# Check if local Supabase is running
supabase status

# If not running:
supabase start

# Verify .env has correct local URL
cat .env | grep EXPO_PUBLIC_SUPABASE_URL
# Should show: http://127.0.0.1:54321
```

### **Problem: Wrong environment is active**
```bash
# Check current environment
cat .env | grep EXPO_PUBLIC_ENV

# Switch to correct one
cp .env.staging .env  # or .env.local or .env.production

# Restart Expo
npm start
```

### **Problem: Staging/Production credentials not working**
1. Check Supabase dashboard is accessible
2. Verify API keys in `.env.staging` or `.env.production`
3. Check if RLS policies are blocking (they should be enabled)
4. Try re-copying credentials from dashboard

---

**Need to switch environments?** Just copy the appropriate `.env.*` file to `.env` and restart Expo! 🚀
