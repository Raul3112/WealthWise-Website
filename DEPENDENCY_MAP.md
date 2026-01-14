# 🔗 Interactive Dependency Map - Visual Guide

## 📱 Page → Dialog Relationships

### **DashboardHome.jsx** Uses These Dialogs:
```
DashboardHome.jsx
├── ScanReceiptDialog        ✅ (Import found)
├── AddExpenseDialog         ✅ (Import found)
├── AddGoalDialog            ✅ (Import found)
├── AddBudgetDialog          ✅ (Import found)
├── AddIncomeDialog          ✅ (Import found)
└── Calls all these on button clicks
```
⚠️ **WARNING:** If ANY of these dialogs are deleted → DashboardHome crashes

---

### **Goals.jsx** Uses These Dialogs:
```
Goals.jsx
├── AddGoalDialog            ✅ (Import found)
└── AddFundsDialog           ✅ (Import found)
```
⚠️ **WARNING:** Goals page won't work without these dialogs

---

### **Accounts.jsx** Uses These Dialogs:
```
Accounts.jsx
├── AddAccountDialog         ✅ (Import found)
└── AddFundsDialog           ✅ (Import found)
```
⚠️ **WARNING:** Accounts page won't work without these dialogs

---

### **Budgets.jsx** Uses:
```
Budgets.jsx (Check for dialogs)
├── api.js                   ✅ (CRITICAL)
├── supabase.js              ✅ (CRITICAL)
├── UI components            ✅
└── useToast hook            ✅
```
⚠️ **WARNING:** Missing api.js or supabase.js = Black screen

---

## 🌳 Full Component Dependency Tree

```
App.jsx (ROOT)
│
├── Landing.jsx
│   ├── Navbar.jsx
│   │   └── NavLink.jsx
│   ├── Footer.jsx
│   └── UI Components
│
├── Auth.jsx
│   └── UI Components + Supabase
│
├── DashboardLayout.jsx
│   ├── DashboardSidebar.jsx
│   ├── DashboardHeader.jsx (if used)
│   └── Outlet (nested routes)
│       │
│       ├── DashboardHome.jsx
│       │   ├── ScanReceiptDialog
│       │   ├── AddExpenseDialog
│       │   ├── AddGoalDialog
│       │   ├── AddBudgetDialog
│       │   ├── AddIncomeDialog
│       │   ├── Supabase
│       │   └── API Client
│       │
│       ├── Budgets.jsx
│       │   ├── API Client
│       │   ├── Supabase
│       │   └── UI Components
│       │
│       ├── Goals.jsx
│       │   ├── AddGoalDialog
│       │   ├── AddFundsDialog
│       │   └── UI Components
│       │
│       ├── Accounts.jsx
│       │   ├── AddAccountDialog
│       │   ├── AddFundsDialog
│       │   └── UI Components
│       │
│       ├── Transactions.jsx
│       │   ├── API Client
│       │   ├── Supabase
│       │   └── Various Dialogs
│       │
│       ├── UploadBill.jsx
│       │   └── UI Components
│       │
│       ├── Reports.jsx
│       │   ├── Chart Components
│       │   └── UI Components
│       │
│       └── Profile.jsx
│           ├── Supabase Auth
│           └── UI Components
│
├── SmartBudgetingTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── ExpenseAnalyticsTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── FinancialGoalsTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── OCRScanningTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── SubscriptionTrackingTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── ScheduledPaymentsTips.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
│
└── NotFound.jsx
```

---

## 🔴 Critical Dependencies (Delete = Black Screen)

### **Tier 1: CORE LIBRARIES** (If deleted = Complete failure)
```
❌ DELETE lib/supabase.js      → Black screen (used in 4+ pages)
❌ DELETE lib/api.js           → Black screen (used in 3+ pages)
❌ DELETE lib/utils.js         → Black screen (used everywhere)
❌ DELETE hooks/use-toast.js   → All dialogs crash
```

### **Tier 2: CRITICAL COMPONENTS** (If deleted = Feature broken)
```
❌ DELETE Navbar.jsx           → Landing page + all Tips pages broken
❌ DELETE Footer.jsx           → Landing page + all Tips pages broken
❌ DELETE DashboardSidebar.jsx → Dashboard completely broken
```

### **Tier 3: DIALOG CHAINS** (If deleted = Page feature broken)
```
❌ DELETE AddExpenseDialog      → Can't add expenses in dashboard
❌ DELETE AddGoalDialog        → Can't add goals in 2 places
❌ DELETE AddFundsDialog       → Can't add funds in 2 places
❌ DELETE AddAccountDialog     → Can't add accounts
```

### **Tier 4: PAGE COMPONENTS** (If deleted = Route shows 404)
```
❌ DELETE Landing.jsx          → / route broken
❌ DELETE Auth.jsx             → /auth route broken
❌ DELETE DashboardHome.jsx    → /dashboard route broken
❌ DELETE Budgets.jsx          → /dashboard/budgets broken
❌ DELETE Profile.jsx          → /dashboard/profile broken
```

---

## 🟢 Safe to Delete (No Dependencies)

```
✅ DELETE test.jsx             → Only contains comment
✅ DELETE Index.jsx            → Unused redirect (verify first!)
✅ DELETE tash/                → Junk folder
```

---

## 📊 Import Matrix: What Imports What

### **Files That Import Supabase**
```
✅ Auth.jsx             → import { supabase }
✅ DashboardHome.jsx    → import { supabase }
✅ Transactions.jsx     → import { supabase }
✅ Profile.jsx          → import { supabase }
✅ Budgets.jsx          → import { supabase }
```
If you delete `lib/supabase.js` → ALL 5 pages break

---

### **Files That Import API Client**
```
✅ DashboardHome.jsx    → import { api }
✅ Transactions.jsx     → import { api }
✅ Budgets.jsx          → import { api }
```
If you delete `lib/api.js` → ALL 3 pages break

---

### **Files That Import useToast Hook**
```
✅ Budgets.jsx          → import { useToast }
✅ Transactions.jsx     → import { toast }
✅ All Dialogs          → import { toast }
```
If you delete `hooks/use-toast.js` → All toast notifications break

---

### **Files That Import Navbar**
```
✅ Landing.jsx
✅ SmartBudgetingTips.jsx
✅ ExpenseAnalyticsTips.jsx
✅ FinancialGoalsTips.jsx
✅ OCRScanningTips.jsx
✅ SubscriptionTrackingTips.jsx
✅ ScheduledPaymentsTips.jsx
```
If you delete `Navbar.jsx` → All 7 pages lose header navigation

---

### **Files That Import Footer**
```
✅ Landing.jsx
✅ SmartBudgetingTips.jsx
✅ ExpenseAnalyticsTips.jsx
✅ FinancialGoalsTips.jsx
✅ OCRScanningTips.jsx
✅ SubscriptionTrackingTips.jsx
✅ ScheduledPaymentsTips.jsx
```
If you delete `Footer.jsx` → All 7 pages lose footer

---

## 🎯 Safe Deletion Verification Steps

### For `test.jsx`:
```bash
# Search for any imports
grep -r "test" src/

# Look specifically for: "import.*test" or "from.*test"
grep -r "import.*test\|from.*test" src/

# If zero results → SAFE TO DELETE
```

### For `Index.jsx`:
```bash
# Search in App.jsx
grep "Index" src/App.jsx

# Result: Should be empty or only in comments
# If empty → SAFE TO DELETE
```

### For any Dialog (e.g., AddCategoryDialog):
```bash
# Find all pages importing this dialog
grep -r "AddCategoryDialog" src/

# Count results
# If 0 results → Can delete (but check if feature needed)
# If 1+ results → DON'T DELETE
```

---

## 🔄 Verification After Deletion

### After Deleting a File:
```bash
# 1. Search for imports of deleted file
grep -r "deleted_filename" src/

# 2. If any results found → RESTORE: git checkout deleted_filename
# 3. If no results → Safe to stay deleted

# 4. Check for TypeScript/Jest errors
npm run lint

# 5. Start dev server
npm run dev

# 6. Manually test routes:
# - / (Landing)
# - /auth (Auth)
# - /dashboard (Home)
# - /dashboard/budgets (Budgets)
# - /dashboard/goals (Goals)
# - /dashboard/accounts (Accounts)
# - /dashboard/transactions (Transactions)
# - /dashboard/upload-bill (Upload)
# - /dashboard/reports (Reports)
# - /dashboard/profile (Profile)
# - /tips/* (All tips pages)

# 7. Open console in DevTools - Any red errors?
# 8. If no errors and all pages load → Deletion successful!
```

---

## 📈 Deletion Safety Checklist

```markdown
## Before Deleting test.jsx
- [ ] Search for "test.jsx" in codebase - Found 0 results?
- [ ] Check App.jsx - test.jsx not in routes?
- [ ] npm run dev - Dev server still starts?
- [ ] Check console - Any 404 errors?
- [ ] Manually navigate around - Any errors?
- [ ] If all ✅ → Safe to delete

## Before Deleting Index.jsx
- [ ] Search for "Index" imports - Found 0 results?
- [ ] Check App.jsx - Index not imported?
- [ ] Verify redirect not needed - / already routes to Landing?
- [ ] npm run dev - Dev server starts?
- [ ] Navigate to / - Landing page shows?
- [ ] If all ✅ → Safe to delete

## Before Deleting tash/
- [ ] Check what's in tash/ - Any important files?
- [ ] Git log - Any recent commits with tash/?
- [ ] git status - Is tash/ marked as untracked?
- [ ] If just junk → Safe to delete
```

---

## ⚠️ The Black Screen Cause Checklist

### If you see a black screen after deletion:

1. **Check browser console** (F12 → Console tab)
2. **Look for errors mentioning**:
   - `Cannot find module`
   - `Module not found`
   - `./filename not found`
   - `Export undefined`
3. **The error will tell you**:
   - Which file couldn't be imported
   - Which file is trying to import it
4. **Solution**:
   ```bash
   # Restore the deleted file
   git checkout filename
   
   # Restart dev server
   npm run dev
   ```

### Example Error → Solution:

```
❌ ERROR: Cannot find module '/supabase.js'
   Imported by: DashboardHome.jsx

✅ SOLUTION:
   You deleted lib/supabase.js
   Restore it: git checkout lib/supabase.js
```

---

## 🎓 Learning: Dependency Analysis Tips

### Good Practices:
```
✅ Always search before deleting
✅ Use "Find References" in VS Code (Ctrl+Shift+H)
✅ Check git blame to see who added the file
✅ Test after each deletion
✅ Commit between deletions for easy rollback
```

### Bad Practices:
```
❌ Bulk delete multiple files at once
❌ Delete without searching for imports
❌ Ignore console errors
❌ Not testing in browser
❌ Deleting files from old branches without understanding them
```

---

## 📞 Quick Help Commands

```bash
# Find what a file exports
grep "export" frontend/src/components/Navbar.jsx

# Find all imports of a file
grep -r "Navbar" src/ | grep import

# Find unused files (files with 0 exports and 0 usage)
# Manual but thorough process:
for file in frontend/src/**/*.jsx; do
  imports=$(grep -r "import.*$file\|from.*$file" .)
  if [ -z "$imports" ]; then
    echo "Possibly unused: $file"
  fi
done

# Safe way: Use VS Code Find References feature
# Right-click on import → "Find All References"
```

---

## ✨ Summary

| Action | Impact | Safety |
|--------|--------|--------|
| Delete `test.jsx` | Zero impact | ✅ SAFE |
| Delete `Index.jsx` | Low (verify first) | ⚠️ CHECK |
| Delete `tash/` | Zero impact | ✅ SAFE |
| Delete `Navbar.jsx` | 7 pages break | ❌ CRITICAL |
| Delete `lib/supabase.js` | 5 pages break | ❌ CRITICAL |
| Delete Dialog | 1-2 pages affected | ❌ RISKY |
| Delete Page | That route 404s | ❌ RISKY |

**Rule of Thumb:** *Search before you delete, test after you delete!*
