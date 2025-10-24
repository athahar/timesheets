# Database Debug & RLS Security Files

This directory contains SQL scripts and documentation for securing the production database with Row Level Security (RLS) policies.

## 🎯 Purpose

Fix critical production issues:
- ❌ 406 errors preventing users from accessing their data
- ❌ Invite flow broken during registration
- ❌ Inconsistent security policies across tables
- ❌ Overly permissive public access

## 📁 Files Overview

### 🚀 DEPLOYMENT FILES (Use These!)

| File | Purpose | Status |
|------|---------|--------|
| **`APPLY_THIS_secure-all-rls.sql`** | 🎯 **MASTER FILE** - Apply this to production | ✅ Ready |
| **`DEPLOYMENT_GUIDE.md`** | Step-by-step deployment instructions | ✅ Ready |
| **`verify-rls-deployment.sql`** | Pre/post deployment verification | ✅ Ready |

### 📚 REFERENCE FILES (Historical Context)

| File | Purpose | Notes |
|------|---------|-------|
| `secure-production-rls.sql` | trackpay_users policies only | Superseded by master file |
| `secure-all-tables-rls.sql` | All tables except users | Superseded by master file |
| `proper-users-rls.sql` | Earlier attempt (insecure) | ⚠️ Don't use - has `WITH CHECK (true)` |
| `disable-users-rls.sql` | Nuclear option | ⚠️ Never use in production |
| `check-current-rls.sql` | Query current state | Use verify script instead |

### 🔧 DEBUG SCRIPTS (Already Applied)

| File | Purpose | Status |
|------|---------|--------|
| `apply-staging-rls-to-prod.sql` | Initial migration attempt | ✅ Applied |
| `force-cleanup.sql` | Handle special chars in policy names | ✅ Applied |
| `fix-user-hana.sql` | Fix broken user account | ✅ Applied |

## 🚀 Quick Start

### 1. Review Deployment Guide
```bash
cat DEPLOYMENT_GUIDE.md
```

### 2. Check Current State
Run `verify-rls-deployment.sql` in Supabase SQL Editor and save output.

### 3. Apply Master File
Copy entire contents of `APPLY_THIS_secure-all-rls.sql` → Supabase SQL Editor → Run

### 4. Verify Success
Run `verify-rls-deployment.sql` again and compare with saved output.

### 5. Test End-to-End
Follow testing checklist in `DEPLOYMENT_GUIDE.md`.

## 📊 What Gets Deployed

### 24 Secure Policies Across 7 Tables:

| Table | Policies | Key Access Pattern |
|-------|----------|-------------------|
| `trackpay_users` | 6 | Own profile + related users |
| `trackpay_relationships` | 3 | Provider creates, both read |
| `trackpay_sessions` | 4 | Provider creates/updates, both read |
| `trackpay_payments` | 4 | Provider creates, both read/update |
| `trackpay_requests` | 4 | Provider creates, both read/update |
| `trackpay_activities` | 3 | Both create/read |
| `trackpay_invites` | 0 | RLS disabled (intentional) |

### Security Model

**Authentication Pattern:**
```
auth.users.id → trackpay_users.auth_user_id → trackpay_users.id
```

**Access Control:**
- ✅ All operations require authentication (except invite validation)
- ✅ Users can only access their own data + related users
- ✅ Role-based permissions (provider vs client)
- ✅ Transaction-wrapped for atomic application
- ❌ No anon key abuse possible
- ❌ No cross-user data leakage

## 🔒 Security Highlights

### ✅ What's Allowed
- Authenticated users registering (with their own auth.uid())
- Users reading/updating their own data
- Users seeing related users (via relationships)
- Providers creating sessions/payments/requests
- Clients claiming unclaimed invites
- Public validating invite codes (limited data)

### ❌ What's Prevented
- Anon users creating arbitrary records
- Users reading other users' data (unless related)
- Users modifying others' profiles
- Role changes during invite claim
- Invite hijacking
- Cross-relationship data access

## 🆘 Rollback Plan

If deployment fails:

**Option 1: Transaction Auto-Rollback**
- If ANY error occurs, transaction automatically rolls back
- Database remains in previous state

**Option 2: Restore from Backup**
- Supabase Dashboard → Database → Backups

**Option 3: Emergency RLS Disable (UNSAFE!)**
```sql
-- ONLY in emergency to restore service
ALTER TABLE trackpay_users DISABLE ROW LEVEL SECURITY;
-- etc. for other tables
```

## 📝 Testing Checklist

After applying policies, test:

- [ ] Invite flow (generate → register → verify relationship)
- [ ] User isolation (can't see other users' data)
- [ ] Session tracking (provider → client visibility)
- [ ] Payment flow (request → update status)
- [ ] Activity feed (no cross-user leakage)
- [ ] No 406 errors in app console

See `DEPLOYMENT_GUIDE.md` for detailed test procedures.

## 📞 Support

If issues occur:
1. Check `verify-rls-deployment.sql` output
2. Review browser console for specific RLS errors
3. Check Supabase logs for denied queries
4. Verify user authentication (auth.uid() exists)

## ✅ Success Criteria

Deployment successful when:
- All 24 policies created
- All verification checks pass (✅ Match)
- Invite flow works end-to-end
- No 406 errors in production
- All tests pass

---

**Created:** Oct 2025
**Context:** Production RLS security hardening based on ChatGPT Codex review
**Risk Level:** Low (transaction-wrapped, reversible)
**Impact:** Fixes critical security and functionality issues
