# Environment Switching Guide
**TrackPay iOS App**

## 🎯 Quick Start

### **Easy Environment Switching:**

```bash
# Development/Staging Database (qpoqeqasefatyrjeronp)
npm run start:dev:clear        # Start Expo with dev/staging DB (recommended)
npm run web:dev:clear          # Start web with dev/staging DB (recommended)

# Staging Database (same as dev)
npm run start:staging:clear    # Start Expo with staging DB (recommended)
npm run web:staging:clear      # Start web with staging DB (recommended)

# Production Database (ddxggihlncanqdypzsnn)
npm run start:prod:clear       # Start Expo with production DB ⚠️ (recommended)
npm run web:prod:clear         # Start web with production DB ⚠️ (recommended)
```

**💡 Pro Tip:** Always use the `:clear` versions when switching environments to avoid cache issues!

---

## 📋 Available Commands

### **Start Server with Environment:**
```bash
npm run start:dev        # Development (staging DB)
npm run start:staging    # Staging
npm run start:prod       # Production ⚠️ Be careful!

# Clear cache and start (recommended when switching environments)
npm run start:dev:clear       # Development with cache clear
npm run start:staging:clear   # Staging with cache clear
npm run start:prod:clear      # Production with cache clear ⚠️

# Specify port if 8081 is busy
PORT=8084 npm run start:dev
PORT=8084 npm run web:prod
```

### **Web-Specific Commands:**
```bash
npm run web:dev          # Web development mode
npm run web:staging      # Web staging mode
npm run web:prod         # Web production mode ⚠️

# Clear cache and start web
npm run web:dev:clear         # Web development with cache clear
npm run web:staging:clear     # Web staging with cache clear
npm run web:prod:clear        # Web production with cache clear ⚠️
```

### **Switch Environment (without starting server):**
```bash
npm run env:dev          # Switch to development
npm run env:staging      # Switch to staging
npm run env:prod         # Switch to production ⚠️
```

### **Check Current Environment:**
```bash
npm run env:check        # Shows current database and environment
```

---

## 🗂️ Environment Files

### **Files:**
- `.env.development` → Development/Staging DB (qpoqeqasefatyrjeronp)
- `.env.staging` → Staging DB (qpoqeqasefatyrjeronp)
- `.env.production` → Production DB (ddxggihlncanqdypzsnn) ⚠️
- `.env` → **Active environment** (auto-generated, don't edit)

### **What's the difference?**
- **Development** = Safe testing environment (staging DB)
- **Staging** = Pre-production testing (staging DB)
- **Production** = Live user data ⚠️ **BE CAREFUL!**

---

## ⚙️ How It Works

When you run `npm run start:dev`, it:
1. Copies `.env.development` → `.env`
2. Starts Expo server
3. App connects to **staging database**

When you run `npm run start:prod`, it:
1. Copies `.env.production` → `.env`
2. Starts Expo server
3. App connects to **production database** ⚠️

---

## 🔍 Verify Which Database You're Connected To

### **Method 1: Check npm script**
```bash
npm run env:check
```

Output:
```
📋 Current environment:
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://qpoqeqasefatyrjeronp.supabase.co
```

### **Method 2: Check .env file**
```bash
cat .env | grep EXPO_PUBLIC_SUPABASE_URL
```

**Development/Staging:**
```
EXPO_PUBLIC_SUPABASE_URL=https://qpoqeqasefatyrjeronp.supabase.co
```

**Production:**
```
EXPO_PUBLIC_SUPABASE_URL=https://ddxggihlncanqdypzsnn.supabase.co
```

### **Method 3: In the app**
Look at the Supabase client initialization logs in the browser console:
```
🔧 Supabase Client Initialization:
   URL: https://qpoqeqasefatyrjeronp.supabase.co  ← Staging
   Platform: web
```

---

## 🎨 Visual Indicators (Future Enhancement)

**Consider adding to the app UI:**
```tsx
// Show environment badge in dev mode
{__DEV__ && (
  <View style={{ position: 'absolute', top: 50, right: 10 }}>
    <Text style={{
      backgroundColor: process.env.EXPO_PUBLIC_ENV === 'production' ? 'red' : 'green',
      color: 'white',
      padding: 5
    }}>
      {process.env.EXPO_PUBLIC_ENV?.toUpperCase()}
    </Text>
  </View>
)}
```

---

## ⚠️ Safety Guidelines

### **Development/Staging (Safe):**
✅ Use for testing new features
✅ Safe to create/delete test data
✅ Can reset database if needed
✅ Default for daily development

### **Production (Dangerous):**
⚠️ Contains real user data
⚠️ Changes affect live users
⚠️ Only use for critical testing
⚠️ Always double-check before making changes

### **Best Practices:**
1. **Default to development** for all testing
2. **Only switch to production** when absolutely necessary
3. **Check environment** before making database changes
4. **Never commit .env file** (it's in .gitignore)

---

## 📝 Workflow Examples

### **Example 1: Testing a new feature**
```bash
# Use development environment (safe)
npm run start:dev

# Make changes, test, break things - it's safe!
# Database: qpoqeqasefatyrjeronp (staging)
```

### **Example 2: Pre-production testing**
```bash
# Use staging to simulate production
npm run start:staging

# Test with production-like data
# Database: qpoqeqasefatyrjeronp (staging)
```

### **Example 3: Testing production issue**
```bash
# ⚠️ ONLY when you need to test against live data
npm run start:prod

# Be extremely careful!
# Database: ddxggihlncanqdypzsnn (production)

# When done, switch back immediately:
npm run env:dev
```

### **Example 4: Switching environments mid-session**
```bash
# Start with development
npm run start:dev

# Need to check production? Stop server (Ctrl+C), then:
npm run start:prod

# Done? Switch back:
npm run start:dev
```

---

## 🔧 Troubleshooting

### **Issue: Environment not changing**
**Problem:** Started with `:dev` but still seeing production data

**Solution:**
1. Stop the server (Ctrl+C)
2. Check: `npm run env:check`
3. Switch: `npm run env:dev`
4. Restart with cache clear: `npm run start:dev:clear`

**Why this happens:** Metro bundler caches environment variables. Always use `:clear` scripts when switching environments.

### **Issue: Cache showing wrong environment**
**Problem:** Used `npx expo start --clear` but it loaded wrong environment

**Solution:**
❌ **DON'T:** `npx expo start --clear` (bypasses environment switching)
✅ **DO:** `npm run start:prod:clear` (copies .env AND clears cache)

**Explanation:** The babel plugin loads `.env.development` by default. You MUST use npm scripts to copy the correct .env file first.

### **Issue: Port already in use**
**Problem:** `Port 8081 is running...`

**Solution:**
```bash
PORT=8084 npm run start:dev
# or
PORT=8084 npm run web:staging
```

### **Issue: Not sure which database I'm connected to**
**Solution:**
```bash
npm run env:check
```

### **Issue: .env file missing**
**Problem:** `.env` file doesn't exist

**Solution:**
```bash
# Create from development template
npm run env:dev
```

---

## 🚀 Advanced: Custom Port & Environment

```bash
# Development on port 8084
PORT=8084 npm run start:dev

# Production on port 8090
PORT=8090 npm run start:prod

# Web production on port 3000
PORT=3000 npm run web:prod
```

---

## 📊 Environment Comparison

| Aspect | Development | Staging | Production |
|--------|-------------|---------|------------|
| **Database** | qpoqeqasefatyrjeronp | qpoqeqasefatyrjeronp | ddxggihlncanqdypzsnn |
| **Safety** | ✅ Very Safe | ✅ Safe | ⚠️ Dangerous |
| **Data** | Test data | Test data | Real users |
| **Changes** | Encouraged | Allowed | Avoid |
| **Default** | Yes | No | No |
| **Use For** | Daily dev | Pre-prod testing | Critical issues only |

---

## 🎯 Quick Reference Card

**Copy this to your desk:**

```
┌─────────────────────────────────────┐
│     TrackPay Environment Cheat Sheet │
├─────────────────────────────────────┤
│                                     │
│  🟢 DEVELOPMENT (Safe)              │
│     npm run start:dev               │
│     npm run web:dev                 │
│                                     │
│  🟡 STAGING (Safe)                  │
│     npm run start:staging           │
│     npm run web:staging             │
│                                     │
│  🔴 PRODUCTION (Dangerous!)         │
│     npm run start:prod              │
│     npm run web:prod                │
│                                     │
│  📋 CHECK ENVIRONMENT               │
│     npm run env:check               │
│                                     │
│  ⚡ WITH PORT                        │
│     PORT=8084 npm run start:dev     │
│                                     │
└─────────────────────────────────────┘
```

---

**Remember:** When in doubt, use **development** mode! 🟢
