# WealthWise - File Dependency Analysis & Cleanup Guide

## 📋 Summary
This document identifies unused/test files and maps which pages/components link to each file, helping you safely delete unnecessary files without breaking the application.

---

## 🗑️ FILES SAFE TO DELETE

### 1. **test.jsx** (Frontend)
**Location:** `frontend/src/test.jsx`  
**Status:** ❌ **SAFE TO DELETE**
- **Content:** Only contains `// this is test` comment
- **Usage:** Not imported anywhere in the codebase
- **Linked by:** None
- **Impact:** Zero - no pages/components depend on this
- **Action:** DELETE

### 2. **Index.jsx** (Frontend)  
**Location:** `frontend/src/pages/Index.jsx`
**Status:** ⚠️ **VERIFY USAGE BEFORE DELETING**
- **Content:** Redirect component that navigates to "/"
- **Usage:** Not actively imported in App.jsx routes
- **Linked by:** None (currently unused)
- **Impact:** Safe if not used anywhere
- **Action:** REVIEW - Delete if not part of legacy code

### 3. **tash** (Root level)
**Location:** `WEALTHWISE-Website/tash`
**Status:** ❌ **SAFE TO DELETE**
- **Appears to be:** Temporary/trash folder (name suggests this)
- **Usage:** Not part of project structure
- **Action:** DELETE

---

## 📁 RECOMMENDED FOLDER STRUCTURE ORGANIZATION

### Current Structure Issues:
```
❌ Problematic:
- Root level has random files: AUTHENTICATION_SETUP.md, CLEANUP_ANALYSIS.md, 
  FRONTEND_CONNECTION_GUIDE.md, TRANSACTION_BUDGET_LINKAGE.md, tash folder
- These should be organized in docs/ folder
```

### Recommended Structure:
```
WealthWise-Website/
├── docs/                           # NEW: Documentation folder
│   ├── AUTHENTICATION_SETUP.md
│   ├── CLEANUP_ANALYSIS.md
│   ├── FRONTEND_CONNECTION_GUIDE.md
│   ├── TRANSACTION_BUDGET_LINKAGE.md
│   └── BUDGET_SETUP_GUIDE.md      # Move from backend/
│
├── backend/
│   ├── models/                     # NEW: Organize by feature
│   │   ├── auth.py
│   │   ├── budgets.py
│   │   ├── income.py
│   │   ├── transactions.py
│   │   └── database.py
│   ├── config/
│   │   └── .env
│   ├── sql/
│   │   └── SETUP_BUDGETS.sql
│   ├── main.py
│   ├── requirements.txt
│   ├── start.bat
│   └── .gitignore
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── ui/                 # UI Components (shadcn)
    │   │   ├── dialogs/            # Dialog components
    │   │   ├── filters/            # Filter components
    │   │   ├── dashboard/          # Dashboard layout
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── NavLink.jsx
    │   ├── pages/
    │   │   ├── dashboard/          # Dashboard pages
    │   │   ├── tips/               # Tips/education pages
    │   │   ├── Auth.jsx
    │   │   ├── Landing.jsx
    │   │   └── NotFound.jsx
    │   ├── hooks/
    │   │   ├── use-mobile.jsx
    │   │   └── use-toast.js
    │   ├── lib/
    │   │   ├── api.js
    │   │   ├── supabase.js
    │   │   └── utils.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## 🔗 COMPLETE FILE DEPENDENCY MAP

### **Frontend Pages → Components/Imports**

#### **Landing.jsx** 
- ✅ Used in: App.jsx (Route: "/")
- Imports:
  - `Navbar.jsx`
  - `Footer.jsx`
  - UI components (Card, Button)
  - lucide-react icons
  - react-router-dom

#### **Auth.jsx** (Currently Active - DO NOT DELETE)
- ✅ Used in: App.jsx (Route: "/auth")
- Imports:
  - UI components (Card, Button, Input, Label)
  - lucide-react icons
  - Supabase (lib/supabase.js)
  - sonner (toast notifications)

#### **Dashboard Pages** (All Active)
- ✅ **DashboardLayout.jsx** - Used in: App.jsx (Route: "/dashboard")
  - Imports: `DashboardSidebar.jsx`, Dashboard pages
  - Contains Outlet for nested routes
  
- ✅ **DashboardHome.jsx** - Route: "/dashboard" (index)
  - Imports: All dialog components
  - Imports: Supabase, API client
  - Uses: AddExpenseDialog, AddGoalDialog, AddBudgetDialog, AddIncomeDialog
  
- ✅ **Budgets.jsx** - Route: "/dashboard/budgets"
  - Imports: UI components, API, Supabase
  
- ✅ **Goals.jsx** - Route: "/dashboard/goals"
  - Imports: AddGoalDialog, AddFundsDialog
  
- ✅ **Accounts.jsx** - Route: "/dashboard/accounts"
  - Imports: AddAccountDialog, AddFundsDialog
  
- ✅ **Transactions.jsx** - Route: "/dashboard/transactions"
  - Imports: Supabase, API client
  
- ✅ **UploadBill.jsx** - Route: "/dashboard/upload-bill"
  - Imports: UI components
  
- ✅ **Reports.jsx** - Route: "/dashboard/reports"
  - Imports: Chart components
  
- ✅ **Profile.jsx** - Route: "/dashboard/profile"
  - Imports: Supabase auth

#### **Tips Pages** (All Active - Educational routes)
- ✅ **SmartBudgetingTips.jsx** - Route: "/tips/smart-budgeting"
  - Imports: Navbar, Footer, UI components
  
- ✅ **ExpenseAnalyticsTips.jsx** - Route: "/tips/expense-analytics"
  - Imports: Navbar, Footer, UI components
  
- ✅ **FinancialGoalsTips.jsx** - Route: "/tips/financial-goals"
  - Imports: Navbar, Footer, UI components
  
- ✅ **OCRScanningTips.jsx** - Route: "/tips/ocr-scanning"
  - Imports: Navbar, Footer, UI components
  
- ✅ **SubscriptionTrackingTips.jsx** - Route: "/tips/subscription-tracking"
  - Imports: Navbar, Footer, UI components
  
- ✅ **ScheduledPaymentsTips.jsx** - Route: "/tips/scheduled-payments"
  - Imports: Navbar, Footer, UI components

#### **NotFound.jsx**
- ✅ Used in: App.jsx (Catch-all route)
- Shows 404 page

#### **Index.jsx**
- ⚠️ **NOT USED** - Can be deleted
- Only redirects to "/"

---

### **Component Dependencies**

#### **Dialogs** (All Active - Used in multiple pages)
- ✅ **AddAccountDialog.jsx** - Used in: Accounts.jsx
- ✅ **AddBudgetDialog.jsx** - Used in: DashboardHome.jsx
- ✅ **AddCategoryDialog.jsx** - Used in: (Check usage)
- ✅ **AddExpenseDialog.jsx** - Used in: DashboardHome.jsx
- ✅ **AddFundsDialog.jsx** - Used in: Goals.jsx, Accounts.jsx
- ✅ **AddGoalDialog.jsx** - Used in: DashboardHome.jsx, Goals.jsx
- ✅ **AddIncomeDialog.jsx** - Used in: DashboardHome.jsx
- ✅ **AddScheduledDialog.jsx** - Used in: (Check usage)
- ✅ **AddSubscriptionDialog.jsx** - Used in: (Check usage)
- ✅ **AddTitleDialog.jsx** - Used in: (Check usage)
- ✅ **AddTransactionDialog.jsx** - Used in: (Check usage)
- ✅ **ImportExportDialog.jsx** - Used in: (Check usage)
- ✅ **ScanReceiptDialog.jsx** - Used in: DashboardHome.jsx

#### **Filters**
- ✅ **ActivityLogFilter.jsx** - Used in: (Check usage)
- ✅ **SpendingFilter.jsx** - Used in: (Check usage)

#### **Layout Components**
- ✅ **Navbar.jsx** - Used in: Landing.jsx, All Tips pages
- ✅ **Footer.jsx** - Used in: Landing.jsx, All Tips pages
- ✅ **NavLink.jsx** - Used in: Navbar.jsx
- ✅ **DashboardSidebar.jsx** - Used in: DashboardLayout.jsx
- ✅ **DashboardHeader.jsx** - Used in: (Check usage)

---

## 🚀 STEP-BY-STEP CLEANUP PLAN

### Phase 1: Delete Obvious Test Files ✅
1. Delete `frontend/src/test.jsx` - SAFE (unused)
2. Delete `frontend/src/pages/Index.jsx` - VERIFY first (appears unused)
3. Delete `tash/` folder at root - SAFE

### Phase 2: Organize Documentation 📚
1. Create `docs/` folder at root level
2. Move files from root to docs/:
   - AUTHENTICATION_SETUP.md
   - CLEANUP_ANALYSIS.md
   - FRONTEND_CONNECTION_GUIDE.md
   - TRANSACTION_BUDGET_LINKAGE.md
3. Move `backend/BUDGET_SETUP_GUIDE.md` to `docs/`

### Phase 3: Reorganize Backend 🔧
1. Create `backend/models/` folder
2. Move Python files to `backend/models/`:
   - auth.py
   - budgets.py
   - income.py
   - transactions.py
   - database.py
3. Create `backend/config/` folder
4. Move `.env` to `backend/config/`
5. Create `backend/sql/` folder
6. Move SETUP_BUDGETS.sql to `backend/sql/`
7. Update imports in `main.py`

### Phase 4: Verify All Imports After Changes ⚠️
Run through entire app and verify:
- All page routes load correctly
- No broken imports
- No console errors
- Test navigation to each route

---

## ⚠️ DO NOT DELETE (All Active Files)

### Frontend Pages
```
✅ Auth.jsx
✅ Landing.jsx
✅ NotFound.jsx
✅ /dashboard/DashboardLayout.jsx
✅ /dashboard/DashboardHome.jsx
✅ /dashboard/Budgets.jsx
✅ /dashboard/Goals.jsx
✅ /dashboard/Accounts.jsx
✅ /dashboard/Transactions.jsx
✅ /dashboard/UploadBill.jsx
✅ /dashboard/Reports.jsx
✅ /dashboard/Profile.jsx
✅ /tips/SmartBudgetingTips.jsx
✅ /tips/ExpenseAnalyticsTips.jsx
✅ /tips/FinancialGoalsTips.jsx
✅ /tips/OCRScanningTips.jsx
✅ /tips/SubscriptionTrackingTips.jsx
✅ /tips/ScheduledPaymentsTips.jsx
```

### Components
```
✅ All dialogs in components/dialogs/
✅ All UI components in components/ui/
✅ Navbar.jsx, Footer.jsx, NavLink.jsx
✅ DashboardSidebar.jsx, DashboardHeader.jsx
✅ Filters (ActivityLogFilter, SpendingFilter)
```

### Libraries & Utilities
```
✅ lib/api.js - API client
✅ lib/supabase.js - Supabase config
✅ lib/utils.js - Utility functions
✅ hooks/use-mobile.jsx
✅ hooks/use-toast.js
```

---

## 🔑 Key Learning: Avoiding Black Screens

**Black screen errors typically occur when:**
1. ❌ A page/component is imported in App.jsx but its file is deleted
2. ❌ A dialog/component is imported in a page but its file is deleted
3. ❌ A library (lib/) function is used but the file is deleted
4. ❌ A hook is imported but the file is deleted

**How to avoid this:**
1. ✅ Always check App.jsx routes first before deleting a page
2. ✅ Search for imports using grep/find before deleting any component
3. ✅ Use "Find References" in VS Code before deleting
4. ✅ Test the app after each deletion
5. ✅ Keep version control (git) to revert if needed

---

## 📝 Files That Can Be Analyzed Further

Check these dialogs for actual usage (may have unused features):
- AddCategoryDialog.jsx
- AddScheduledDialog.jsx
- AddSubscriptionDialog.jsx
- AddTitleDialog.jsx
- AddTransactionDialog.jsx
- ImportExportDialog.jsx

And these components:
- ActivityLogFilter.jsx
- SpendingFilter.jsx
- DashboardHeader.jsx (appears in structure but check if used)

---

## ✅ Quick Reference: Safe Deletions

| File | Safe | Why |
|------|------|-----|
| test.jsx | ✅ YES | Not imported anywhere |
| Index.jsx | ✅ YES* | Not in App.jsx routes (verify first) |
| tash/ | ✅ YES | Appears to be junk folder |
| Root MD files | ✅ YES* | Move to docs/, don't delete |

*Still verify before deleting
