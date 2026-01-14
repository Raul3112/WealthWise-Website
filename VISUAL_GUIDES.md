# 📊 Visual Guides - Component & Dependency Diagrams

## 🎯 App Router Flow (Text Diagram)

```
WealthWise App Routes
└── App.jsx (Main Router)
    │
    ├─── / ──────────────────────────► Landing.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /auth ──────────────────────► Auth.jsx
    │                                  └─ Supabase Connection
    │
    ├─── /tips/smart-budgeting ──────► SmartBudgetingTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /tips/expense-analytics ───► ExpenseAnalyticsTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /tips/financial-goals ─────► FinancialGoalsTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /tips/ocr-scanning ────────► OCRScanningTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /tips/subscription-tracking ► SubscriptionTrackingTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /tips/scheduled-payments ──► ScheduledPaymentsTips.jsx
    │                                  ├─ Navbar.jsx
    │                                  └─ Footer.jsx
    │
    ├─── /dashboard ────────────────► DashboardLayout.jsx
    │    │                            ├─ DashboardSidebar.jsx
    │    │                            ├─ DashboardHeader.jsx
    │    │                            └─ Outlet (for nested routes)
    │    │
    │    ├─ /dashboard (index) ──────► DashboardHome.jsx
    │    │                            ├─ ScanReceiptDialog
    │    │                            ├─ AddExpenseDialog
    │    │                            ├─ AddGoalDialog
    │    │                            ├─ AddBudgetDialog
    │    │                            └─ AddIncomeDialog
    │    │
    │    ├─ /dashboard/budgets ──────► Budgets.jsx
    │    │                            ├─ Supabase
    │    │                            └─ API Client
    │    │
    │    ├─ /dashboard/goals ───────► Goals.jsx
    │    │                            ├─ AddGoalDialog
    │    │                            └─ AddFundsDialog
    │    │
    │    ├─ /dashboard/accounts ────► Accounts.jsx
    │    │                            ├─ AddAccountDialog
    │    │                            └─ AddFundsDialog
    │    │
    │    ├─ /dashboard/transactions ► Transactions.jsx
    │    │                            ├─ Supabase
    │    │                            └─ API Client
    │    │
    │    ├─ /dashboard/upload-bill ─► UploadBill.jsx
    │    │
    │    ├─ /dashboard/reports ─────► Reports.jsx
    │    │
    │    └─ /dashboard/profile ─────► Profile.jsx
    │                                  └─ Supabase Auth
    │
    └─── /* (404) ──────────────────► NotFound.jsx
```

---

## 🔗 Component Dependency Tree

```
App.jsx (ROOT)
│
├── Providers
│   ├─ TooltipProvider
│   ├─ QueryClientProvider
│   └─ BrowserRouter
│
├── UI Themes
│   ├─ Toaster (Shadcn)
│   └─ Toaster (Sonner)
│
└── Pages (17 total)
    │
    ├─ Landing.jsx
    │  └─ Uses: Navbar, Footer, UI Components
    │
    ├─ Auth.jsx
    │  └─ Uses: Supabase, UI Components, Toast
    │
    ├─ DashboardLayout.jsx
    │  ├─ Uses: DashboardSidebar, DashboardHeader
    │  └─ Nested Pages (8):
    │     ├─ DashboardHome.jsx
    │     │  └─ Uses: 5 Dialogs, Supabase, API
    │     ├─ Budgets.jsx
    │     │  └─ Uses: Supabase, API, Toast
    │     ├─ Goals.jsx
    │     │  └─ Uses: 2 Dialogs
    │     ├─ Accounts.jsx
    │     │  └─ Uses: 2 Dialogs
    │     ├─ Transactions.jsx
    │     │  └─ Uses: Supabase, API, Toast
    │     ├─ UploadBill.jsx
    │     ├─ Reports.jsx
    │     │  └─ Uses: Chart Components
    │     └─ Profile.jsx
    │        └─ Uses: Supabase Auth
    │
    ├─ Tips Pages (6 total)
    │  ├─ SmartBudgetingTips.jsx → Uses: Navbar, Footer
    │  ├─ ExpenseAnalyticsTips.jsx → Uses: Navbar, Footer
    │  ├─ FinancialGoalsTips.jsx → Uses: Navbar, Footer
    │  ├─ OCRScanningTips.jsx → Uses: Navbar, Footer
    │  ├─ SubscriptionTrackingTips.jsx → Uses: Navbar, Footer
    │  └─ ScheduledPaymentsTips.jsx → Uses: Navbar, Footer
    │
    └─ NotFound.jsx
```

---

## 🎨 Shared Components Architecture

```
Shared Components
│
├─ Navigation Layer
│  ├─ Navbar.jsx ◄─── Used by 7 pages
│  ├─ NavLink.jsx
│  └─ Footer.jsx ◄─── Used by 7 pages
│
├─ Dashboard Layer
│  ├─ DashboardLayout.jsx
│  ├─ DashboardSidebar.jsx
│  └─ DashboardHeader.jsx
│
├─ Dialog Layer (13 Dialogs)
│  ├─ AddAccountDialog ◄─── Used by Accounts.jsx
│  ├─ AddBudgetDialog ◄─── Used by DashboardHome.jsx
│  ├─ AddCategoryDialog
│  ├─ AddExpenseDialog ◄─── Used by DashboardHome.jsx
│  ├─ AddFundsDialog ◄─── Used by Goals.jsx, Accounts.jsx
│  ├─ AddGoalDialog ◄─── Used by DashboardHome.jsx, Goals.jsx
│  ├─ AddIncomeDialog ◄─── Used by DashboardHome.jsx
│  ├─ AddScheduledDialog
│  ├─ AddSubscriptionDialog
│  ├─ AddTitleDialog
│  ├─ AddTransactionDialog
│  ├─ ImportExportDialog
│  └─ ScanReceiptDialog ◄─── Used by DashboardHome.jsx
│
├─ Filter Layer
│  ├─ ActivityLogFilter.jsx
│  └─ SpendingFilter.jsx
│
└─ UI Components Layer (40+ from shadcn)
   ├─ Button
   ├─ Card
   ├─ Dialog
   ├─ Input
   ├─ Select
   ├─ Checkbox
   ├─ Badge
   ├─ Progress
   └─ ... (30+ more)
```

---

## 📚 Library & Utilities Architecture

```
lib/ (Core Utilities)
│
├─ supabase.js ◄─── CRITICAL: Used by 5 files
│  └─ supabase client initialization
│
├─ api.js ◄─── CRITICAL: Used by 3 files
│  └─ API client with endpoints
│
└─ utils.js ◄─── CRITICAL: Used everywhere
   └─ cn() utility for className merging

hooks/ (React Hooks)
│
├─ use-toast.js ◄─── CRITICAL: Used by all dialogs
│  └─ Toast notification system
│
└─ use-mobile.jsx
   └─ Mobile responsiveness detection
```

---

## 🔄 Data Flow Diagram

```
User Actions
    │
    ├── Clicks button in Landing.jsx
    │   └─► Navigate to /auth or /tips/*
    │       └─► Page renders
    │
    ├── Logs in in Auth.jsx
    │   └─► Supabase (lib/supabase.js) authenticates
    │       └─► Navigate to /dashboard
    │
    ├── In Dashboard, clicks "Add Budget"
    │   └─► Opens AddBudgetDialog
    │       └─► Dialog calls API (lib/api.js)
    │           └─► Backend responds
    │               └─► useToast shows success message
    │                   └─► Page updates
    │
    └── In Budgets page
        └─► Fetches from Supabase (lib/supabase.js)
            └─► Renders data
                └─► Can delete or edit
                    └─► Calls API (lib/api.js)
                        └─► Updates database
```

---

## 🗂️ File Organization Before & After

### BEFORE (Messy)
```
WealthWise-Website/
│
├─ AUTHENTICATION_SETUP.md ❌ (at root)
├─ CLEANUP_ANALYSIS.md ❌ (at root)
├─ FRONTEND_CONNECTION_GUIDE.md ❌ (at root)
├─ TRANSACTION_BUDGET_LINKAGE.md ❌ (at root)
├─ tash/ ❌ (junk folder)
│
├─ backend/
│   ├─ BUDGET_SETUP_GUIDE.md ❌ (doc in backend)
│   ├─ auth.py ❌ (loose)
│   ├─ budgets.py ❌ (loose)
│   ├─ database.py ❌ (loose)
│   ├─ income.py ❌ (loose)
│   ├─ transactions.py ❌ (loose)
│   ├─ .env ❌ (at root of backend)
│   ├─ SETUP_BUDGETS.sql ❌ (loose)
│   └─ main.py
│
└─ frontend/
    └─ src/
        ├─ test.jsx ❌ (test file)
        └─ pages/
            └─ Index.jsx ❌ (unused)
```

### AFTER (Organized)
```
WealthWise-Website/
│
├─ docs/ ✅ (all documentation)
│  ├─ AUTHENTICATION_SETUP.md
│  ├─ CLEANUP_ANALYSIS.md
│  ├─ FRONTEND_CONNECTION_GUIDE.md
│  ├─ TRANSACTION_BUDGET_LINKAGE.md
│  ├─ BUDGET_SETUP_GUIDE.md
│  └─ ...
│
├─ backend/
│  ├─ models/ ✅ (organized)
│  │  ├─ auth.py
│  │  ├─ budgets.py
│  │  ├─ database.py
│  │  ├─ income.py
│  │  └─ transactions.py
│  ├─ config/ ✅ (centralized)
│  │  └─ .env
│  ├─ sql/ ✅ (organized)
│  │  └─ SETUP_BUDGETS.sql
│  └─ main.py
│
└─ frontend/
    └─ src/ (clean!)
       ├─ components/
       ├─ pages/
       ├─ hooks/
       ├─ lib/
       ├─ App.jsx
       ├─ main.jsx
       └─ index.css
```

---

## 🚨 Critical Path Dependencies

```
IF YOU DELETE THESE → BLACK SCREEN:

lib/supabase.js (CRITICAL)
    │
    ├── Auth.jsx
    ├── DashboardHome.jsx
    ├── Transactions.jsx
    ├── Profile.jsx
    └── Budgets.jsx

lib/api.js (CRITICAL)
    │
    ├── DashboardHome.jsx
    ├── Transactions.jsx
    └── Budgets.jsx

lib/utils.js (CRITICAL)
    │
    └── Imported everywhere (App.jsx and all components)

hooks/use-toast.js (CRITICAL)
    │
    ├── Budgets.jsx
    ├── Transactions.jsx
    ├── All Dialog files (13 total)
    └── All pages using dialogs

Navbar.jsx (CRITICAL for 7 pages)
    │
    ├── Landing.jsx
    ├── SmartBudgetingTips.jsx
    ├── ExpenseAnalyticsTips.jsx
    ├── FinancialGoalsTips.jsx
    ├── OCRScanningTips.jsx
    ├── SubscriptionTrackingTips.jsx
    └── ScheduledPaymentsTips.jsx
```

---

## ✅ Safe to Delete

```
IF YOU DELETE THESE → NO IMPACT:

test.jsx (SAFE)
    │
    └── Not imported anywhere ✅

Index.jsx (SAFE)
    │
    └── Not in App.jsx routes ✅

tash/ (SAFE)
    │
    └── Junk/temporary folder ✅
```

---

## 🔀 Import Relationship Matrix

```
                    | supabase.js | api.js | utils.js | use-toast | Navbar
─────────────────────────────────────────────────────────────────────────────
Auth.jsx            |     YES     |   NO   |   YES    |    NO     |   NO
DashboardHome.jsx   |     YES     |  YES   |   YES    |   YES     |   NO
Budgets.jsx         |     YES     |  YES   |   YES    |   YES     |   NO
Goals.jsx           |      NO     |   NO   |   YES    |   YES     |   NO
Accounts.jsx        |      NO     |   NO   |   YES    |   YES     |   NO
Transactions.jsx    |     YES     |  YES   |   YES    |   YES     |   NO
Profile.jsx         |     YES     |   NO   |   YES    |   YES     |   NO
Landing.jsx         |      NO     |   NO   |   YES    |    NO     |  YES
Tips Pages (6x)     |      NO     |   NO   |   YES    |    NO     |  YES
All Dialogs (13x)   |      NO     |   NO   |   YES    |   YES     |   NO
```

**Legend:** YES = Depends on this file

---

## 📋 Success Criteria Checklist

```
✅ Code Cleanliness
   ☐ No test files (test.jsx deleted)
   ☐ No unused pages (Index.jsx deleted)
   ☐ No junk folders (tash/ deleted)

✅ Organization
   ☐ All docs in docs/ folder
   ☐ Backend organized by concern
   ☐ All imports working
   ☐ Clear folder structure

✅ Testing
   ☐ Frontend serves without errors
   ☐ All 16 routes accessible
   ☐ All dialogs open and close
   ☐ All buttons clickable
   ☐ No console errors
   ☐ API calls working
   ☐ Supabase connections working

✅ Git
   ☐ All changes committed
   ☐ Clean commit history
   ☐ Able to rollback if needed

✅ Documentation
   ☐ Guides available for reference
   ☐ Team understands new structure
   ☐ Setup instructions updated
```

---

## 🎯 Quick Reference Matrix

```
File Type              | Count | Delete | Keep | Status
───────────────────────────────────────────────────────────
Pages                  |  17   |   0    | 17   | ✅ Safe
Components             |  50+  |   0    | 50+  | ✅ Safe
Dialogs                |  13   |   0    | 13   | ✅ Safe
UI Components          |  40+  |   0    | 40+  | ✅ Safe
Hooks                  |   2   |   0    |  2   | ✅ Safe
Libraries              |   3   |   0    |  3   | ✅ CRITICAL
Test Files             |   1   |   1    |  0   | 🗑️ DELETE
Unused Pages           |   1   |   1    |  0   | 🗑️ DELETE
Junk Folders           |   1   |   1    |  0   | 🗑️ DELETE
───────────────────────────────────────────────────────────
TOTAL                  | 128   |   3    | 125  | 97.7% Keep
```

---

## 🚀 Implementation Timeline

```
Time    | Task                           | Duration | Status
────────────────────────────────────────────────────────────
T+0m    | Delete test files              | 2 min    | 🟢 Quick
T+2m    | Test frontend                  | 2 min    | ✅
T+4m    | Commit cleanup                 | 1 min    | ✅
─────────────────────────────────────────────────────────────
        | (Optional Reorganization Below)
─────────────────────────────────────────────────────────────
T+5m    | Create new folders             | 3 min    | 
T+8m    | Move documentation             | 5 min    | 
T+13m   | Move backend files             | 5 min    | 
T+18m   | Update imports                 | 5 min    | 
T+23m   | Test backend                   | 5 min    | 
T+28m   | Test frontend                  | 5 min    | 
T+33m   | Final verification             | 5 min    | 
T+38m   | Commit reorganization          | 2 min    | 
─────────────────────────────────────────────────────────────
        | COMPLETE                       | ~40 min  |
```

---

*All diagrams verified accurate as of January 14, 2026*
