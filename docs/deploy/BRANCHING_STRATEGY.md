# Git Branching Strategy
**TrackPay Project**
**Last Updated:** October 20, 2025

## 🌳 Branch Structure

```
main (production)
 └── develop (staging/integration)
      ├── feature/feature-name (active feature work)
      ├── feature/another-feature (active feature work)
      └── wip/experimental-work (work in progress)
```

### **Three-Tier Branch Model:**

1. **`main`** - Production-ready code
   - ✅ Always deployable
   - ✅ Protected branch (no direct commits)
   - ✅ Merges only from `develop` after testing

2. **`develop`** - Staging/Integration branch
   - ✅ Integration testing environment
   - ✅ Feature branches merge here first
   - ✅ When stable → merge to `main`

3. **`feature/*`** - Feature branches
   - ✅ Always branch from `develop`
   - ✅ One feature per branch
   - ❌ **DELETE immediately after merge**

4. **`wip/*`** - Work In Progress (Optional)
   - ✅ Experimental or incomplete work
   - ✅ Can be long-lived
   - ✅ When ready → rename to `feature/*`

---

## 🚀 Standard Workflow

### **1. Starting New Feature**

```bash
# Always start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/payment-flow

# Work and commit
git add .
git commit -m "feat: implement payment flow"
git push origin feature/payment-flow
```

### **2. Merging to Develop**

```bash
# When feature is complete and tested
git checkout develop
git pull origin develop
git merge feature/payment-flow

# Test thoroughly on develop
npm run web  # or other test commands

# Push to remote
git push origin develop
```

### **3. Delete Feature Branch Immediately** ⚠️ CRITICAL

```bash
# Delete local branch
git branch -d feature/payment-flow

# Delete remote branch
git push origin --delete feature/payment-flow

# Why? Keep repo clean, code is in develop's history
```

### **4. Merging to Production**

```bash
# When develop is stable and tested
git checkout main
git pull origin main
git merge develop

# Push to production
git push origin main
```

---

## 📋 Branch Naming Conventions

### **Feature Branches:**
```
feature/user-authentication
feature/payment-processing
feature/client-invitation
feature/ios-header-optimization
```

### **Bug Fixes:**
```
fix/login-crash
fix/payment-calculation
fix/white-screen-ios
```

### **Work In Progress:**
```
wip/phone-authentication
wip/multi-language-support
wip/performance-testing
```

### **Documentation:**
```
docs/api-documentation
docs/deployment-guide
```

### **Refactoring:**
```
refactor/storage-layer
refactor/authentication-service
```

---

## ⚠️ Critical Rules

### **DO:**
✅ **Always branch from `develop`** (even if you think you should branch from somewhere else)
✅ **Delete feature branches immediately after merge**
✅ **Test thoroughly on `develop` before merging to `main`**
✅ **Keep commits atomic and descriptive**
✅ **Pull latest `develop` before starting new branch**
✅ **Use conventional commit messages** (`feat:`, `fix:`, `docs:`, etc.)

### **DON'T:**
❌ **Never commit directly to `main`** (except hotfixes)
❌ **Never branch from another feature branch**
❌ **Never merge untested code to `main`**
❌ **Never keep merged feature branches**
❌ **Never use generic branch names** (like `temp`, `test`, `changes`)
❌ **Never force push to `main` or `develop`** (unless absolutely necessary and coordinated)

---

## 🔄 Feature Branch Lifecycle

```
DAY 1-3: Create & Develop
   │
   ├─ git checkout -b feature/awesome-feature
   ├─ (commit, commit, commit)
   └─ git push origin feature/awesome-feature

DAY 3-5: Review & Test
   │
   ├─ Create PR (if using GitHub/GitLab)
   ├─ Code review
   └─ Test locally

DAY 5: Merge & Delete
   │
   ├─ git merge feature/awesome-feature → develop
   ├─ Test on develop
   ├─ git branch -d feature/awesome-feature  ← DELETE
   └─ git push origin --delete feature/awesome-feature  ← DELETE
```

**Timeline:** Days to weeks maximum
**End Result:** Branch deleted, code lives in `develop`

---

## 🎯 Hotfix Workflow (Emergency Production Fixes)

```bash
# For critical production bugs only
git checkout main
git checkout -b hotfix/critical-bug

# Fix the bug
git add .
git commit -m "hotfix: resolve critical bug"

# Merge to main
git checkout main
git merge hotfix/critical-bug
git push origin main

# Also merge to develop (to keep in sync)
git checkout develop
git merge hotfix/critical-bug
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-bug
git push origin --delete hotfix/critical-bug
```

---

## 🧹 Regular Branch Cleanup

### **Weekly Cleanup:**
```bash
# List all branches
git branch -a

# Delete merged local branches
git branch --merged develop | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d

# Clean up remote references
git fetch --prune
```

### **Check for Stale Branches:**
```bash
# Show branches with last commit date
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short) %(subject)'

# Delete branches older than 30 days (after confirming)
# Manual review recommended
```

---

## 📊 Current Branch Status

### **Active Branches (Keep):**
- ✅ `main` - Production
- ✅ `develop` - Staging

### **Work In Progress (Keep for now):**
- ⏸️ `feature/phone-authentication-wip` - Phone auth implementation
- ⏸️ `feature/ios-header-optimization` - iOS header work

### **Archived/Deleted:**
- ❌ `origin/prod-ready` - Deleted (merged)
- ❌ `origin/multi-crew` - Deleted (merged)
- ❌ `origin/ux-improvements` - Deleted (merged)
- ❌ `performance/optimization-audit` - Deleted (merged)
- ❌ `wip/performance-optimization-broken` - Deleted (broken)

---

## 🔐 GitHub Repository Settings

### **Protected Branches:**

**`main` branch protection rules:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (no bypass)
- ❌ Allow force pushes (disabled)
- ❌ Allow deletions (disabled)

**`develop` branch protection rules:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ❌ Allow force pushes (disabled for safety)

### **Default Branch:**
- Set to `develop` (not `main`)
- New clones start on `develop` for development

**⚠️ ACTION REQUIRED:**
1. Go to GitHub repo → Settings → Branches
2. Change default branch from `feature/stable-development` to `develop`
3. Delete `origin/feature/stable-development` manually via GitHub UI

---

## 🎓 Best Practices & Tips

### **Commit Messages:**
Use conventional commit format:
```
feat(scope): add new feature description
fix(scope): resolve bug description
docs(scope): update documentation
refactor(scope): restructure code
test(scope): add or update tests
chore(scope): maintenance tasks
```

Examples:
```
feat(auth): implement phone authentication
fix(payment): resolve calculation error
docs(deploy): update branching strategy
refactor(storage): migrate to new interface
```

### **Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Tested on develop
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

### **Branch Merging Strategy:**
- **Prefer merge commits** for feature branches (preserves history)
- **Use squash merge** for cleanup commits (optional)
- **Never rebase** `main` or `develop` (public branches)
- **Can rebase** your own feature branch before merge (clean up)

---

## 🚨 Emergency Procedures

### **Accidentally Committed to Main:**
```bash
# If not pushed yet
git reset HEAD~1  # Undo last commit
git checkout develop
git cherry-pick <commit-hash>

# If already pushed (coordinate with team)
git revert <commit-hash>  # Safer than force push
```

### **Need to Recover Deleted Branch:**
```bash
# Find the commit hash
git reflog

# Recreate branch
git checkout -b feature/recovered-branch <commit-hash>
```

### **Merge Conflict Resolution:**
```bash
# During merge conflict
git status  # See conflicted files
# Edit files to resolve conflicts
git add <resolved-files>
git commit  # Complete merge
```

---

## 📈 Metrics & Monitoring

### **Track Branch Health:**
- **Branch count:** Keep < 10 active branches
- **Branch age:** Delete branches > 30 days old
- **Merge frequency:** Merge to develop daily/weekly
- **Main deployments:** Weekly or on-demand

### **Regular Audits:**
- **Monthly:** Review all branches, archive/delete old ones
- **Quarterly:** Review branching strategy effectiveness
- **Annually:** Update strategy based on team growth

---

## 🤖 Automation (Future)

### **GitHub Actions:**
```yaml
# Auto-delete branches after merge
on:
  pull_request:
    types: [closed]
jobs:
  delete-branch:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Delete branch
        run: git push origin --delete ${{ github.head_ref }}
```

### **Branch Protection:**
- Require CI/CD checks before merge
- Require code review approval
- Auto-merge dependabot PRs (with caution)

---

## ✅ Quick Reference

```bash
# Start new feature
git checkout develop && git pull
git checkout -b feature/my-feature

# Complete feature
git checkout develop
git merge feature/my-feature
git branch -d feature/my-feature
git push origin --delete feature/my-feature

# Deploy to production
git checkout main
git merge develop
git push origin main

# Cleanup
git fetch --prune
git branch --merged | grep -v "\*\|main\|develop" | xargs git branch -d
```

---

**Remember:**
- 🌱 Branch from `develop`
- 🔨 Work on `feature/*`
- 🧪 Test on `develop`
- 🚀 Deploy from `main`
- 🗑️ **Delete after merge!**

**When in doubt:** Keep the repository clean. Delete merged branches immediately.
