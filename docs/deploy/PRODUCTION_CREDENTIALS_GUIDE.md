# TrackPay Production Credentials Setup Guide

**Created:** October 20, 2025
**Production Database:** prod-db (shared across projects)
**Project Ref:** ddxggihlncanqdypzsnn

---

## 🔐 **How to Get Your Production Credentials**

### **Step 1: Go to Supabase Dashboard**
Open this URL in your browser:
```
https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn
```

### **Step 2: Navigate to API Settings**
1. Click **"Settings"** in the left sidebar
2. Click **"API"** (under "Project Settings" section)

### **Step 3: Copy Your API Keys**

You'll see a section called **"Project API keys"** with two keys:

#### **Anon/Public Key** (Safe for client apps)
- Look for: `anon` `public`
- This is the key that goes in your iOS app
- Safe to use in client-side code
- Used for: User authentication, RLS-protected queries

**Copy this key and paste it into:**
```
ios-app/.env.production
→ EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

#### **Service Role Key** (⚠️ KEEP SECRET!)
- Look for: `service_role` `secret`
- This key has **full database access** (bypasses RLS)
- **NEVER** commit to git or expose in client apps
- Used for: Admin operations, server-side scripts

**Copy this key and paste it into:**
```
ios-app/.env.production
→ EXPO_SERVICE_ROLE_KEY=
```

---

## 📋 **What to Do Next**

### **After Filling in Credentials:**

1. **Open the file:**
   ```bash
   cd ios-app
   nano .env.production
   # or use your preferred editor
   ```

2. **Replace these placeholders:**
   ```bash
   EXPO_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_YOUR_ANON_KEY
   EXPO_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SERVICE_ROLE_KEY
   ```

3. **Save the file**

4. **Tell Claude:** "Production credentials filled in, ready to deploy"

---

## 🔍 **What the Keys Look Like**

**Anon Key format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NjQwMDAsImV4cCI6MjA0NTA0MDAwMH0...
```
(Starts with `eyJ`, very long string, about 200+ characters)

**Service Role Key format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ2NDAwMCwiZXhwIjoyMDQ1MDQwMDAwfQ...
```
(Similar format, but has `service_role` in it)

---

## ⚠️ **Security Best Practices**

### **DO:**
- ✅ Keep `.env.production` file local (never commit)
- ✅ Store service role key in password manager
- ✅ Use anon key in iOS app (it's designed for this)
- ✅ Review who has access to production dashboard

### **DON'T:**
- ❌ Commit `.env.production` to git
- ❌ Share service role key in Slack/email/Discord
- ❌ Use service role key in iOS app (use anon key instead)
- ❌ Expose keys in screenshots or screen recordings

---

## 🛡️ **What if Keys are Compromised?**

If you accidentally expose keys:

1. **Go to Supabase Dashboard** → Settings → API
2. Click **"Reset API Keys"**
3. Copy new keys
4. Update `.env.production`
5. Redeploy iOS app with new keys

---

## 📝 **Environment File Locations**

TrackPay uses different environment files for different purposes:

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `.env` | Current environment (staging or local) | ❌ No |
| `.env.local` | Local Supabase (Docker) | ❌ No |
| `.env.production` | Production database | ❌ No |
| `.env.sample` | Template (no real keys) | ✅ Yes |

---

## 🔗 **Quick Links**

- **Production Dashboard:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn
- **API Settings:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/settings/api
- **Database Settings:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/settings/database
- **Table Editor:** https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/editor

---

## 📊 **What Happens After Credentials are Set**

Once you fill in the credentials, Claude will:

1. **Link Supabase CLI** to production project
2. **Review migrations** to be deployed (dry run)
3. **Deploy all 9 migrations** to production
4. **Verify deployment** (check tables, RLS, indexes)
5. **Test connection** from iOS app
6. **Configure EAS** secrets for production builds

**Estimated time:** ~30 minutes

---

**Ready?** Fill in the keys and let Claude know!
