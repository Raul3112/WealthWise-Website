# WealthWise Organization Guide - Visual Flowchart

## 🎯 App Entry Point Flow

```
main.jsx
    ↓
App.jsx (Routes defined here)
    ├── / → Landing.jsx → Navbar → Footer
    ├── /auth → Auth.jsx
    ├── /tips/* → Various Tips Pages → Navbar → Footer
    └── /dashboard → DashboardLayout.jsx
            ├── / → DashboardHome.jsx (with multiple dialogs)
            ├── /budgets → Budgets.jsx
            ├── /goals → Goals.jsx
            ├── /accounts → Accounts.jsx
            ├── /transactions → Transactions.jsx
            ├── /upload-bill → UploadBill.jsx
            ├── /reports → Reports.jsx
            └── /profile → Profile.jsx
```

---

## 📊 Component Import Tree

### **Landing Page**
```
Landing.jsx
├── Navbar.jsx
│   ├── NavLink.jsx
│   └── React Router Link
├── Footer.jsx
└── UI Components
    ├── Card
    ├── Button
    └── Icons (lucide-react)
```

### **Dashboard Layout**
```
DashboardLayout.jsx
├── DashboardSidebar.jsx
│   └── Navigation links
├── DashboardHeader.jsx (if used)
└── Outlet (nested routes)
    ├── DashboardHome.jsx
    │   ├── AddExpenseDialog
    │   ├── AddGoalDialog
    │   ├── AddBudgetDialog
    │   ├── AddIncomeDialog
    │   └── ScanReceiptDialog
    ├── Budgets.jsx
    │   └── API calls to backend
    ├── Goals.jsx
    │   ├── AddGoalDialog
    │   └── AddFundsDialog
    ├── Accounts.jsx
    │   ├── AddAccountDialog
    │   └── AddFundsDialog
    ├── Transactions.jsx
    │   ├── Supabase queries
    │   └── API client
    ├── Reports.jsx
    │   └── Chart components
    ├── Profile.jsx
    │   └── Supabase auth
    └── UploadBill.jsx
```

---

## 🔌 Library Dependencies

```
lib/
├── supabase.js
│   ├── Used by: Auth.jsx, DashboardHome.jsx, Transactions.jsx, Profile.jsx
│   └── Exports: supabase client
│
├── api.js
│   ├── Used by: Budgets.jsx, Transactions.jsx, DashboardHome.jsx
│   └── Exports: API client instance
│
└── utils.js
    ├── Used by: All components
    └── Exports: cn() utility function

hooks/
├── use-toast.js
│   ├── Used by: Transactions.jsx, Budgets.jsx, Dialogs
│   └── Exports: useToast() hook
│
└── use-mobile.jsx
    ├── Used by: Responsive components
    └── Exports: useIsMobile() hook
```

---

## 🗂️ Proposed New Structure with Dependencies

### **Before (Current)**
```
❌ Messy Root
WealthWise-Website/
├── AUTHENTICATION_SETUP.md
├── CLEANUP_ANALYSIS.md
├── FRONTEND_CONNECTION_GUIDE.md
├── TRANSACTION_BUDGET_LINKAGE.md
├── tash/                          ← TRASH FOLDER
├── backend/
│   ├── BUDGET_SETUP_GUIDE.md      ← Doc in wrong place
│   ├── auth.py
│   ├── budgets.py
│   ├── database.py
│   ├── income.py
│   ├── main.py
│   ├── transactions.py
│   ├── requirements.txt
│   ├── SETUP_BUDGETS.sql
│   ├── start.bat
│   ├── .env
│   └── __pycache__/
└── frontend/
    └── src/
        ├── test.jsx               ← TEST FILE (unused)
        └── pages/
            └── Index.jsx          ← UNUSED REDIRECT
```

### **After (Organized)**
```
✅ Clean Organization
WealthWise-Website/
│
├── docs/                          ← ALL DOCS IN ONE PLACE
│   ├── AUTHENTICATION_SETUP.md
│   ├── CLEANUP_ANALYSIS.md
│   ├── FRONTEND_CONNECTION_GUIDE.md
│   ├── TRANSACTION_BUDGET_LINKAGE.md
│   ├── BUDGET_SETUP_GUIDE.md
│   └── FILE_DEPENDENCY_ANALYSIS.md (THIS FILE)
│
├── backend/
│   ├── models/                    ← FEATURE ORGANIZED
│   │   ├── auth.py
│   │   ├── budgets.py
│   │   ├── database.py
│   │   ├── income.py
│   │   └── transactions.py
│   │
│   ├── config/
│   │   └── .env
│   │
│   ├── sql/
│   │   └── SETUP_BUDGETS.sql
│   │
│   ├── main.py
│   ├── requirements.txt
│   ├── start.bat
│   ├── .gitignore
│   └── .venv/
│
└── frontend/
    ├── public/
    │   └── robots.txt
    │
    ├── src/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── accordion.jsx
    │   │   │   ├── alert.jsx
    │   │   │   ├── button.jsx
    │   │   │   ├── card.jsx
    │   │   │   ├── dialog.jsx
    │   │   │   └── ... (all UI)
    │   │   │
    │   │   ├── dialogs/
    │   │   │   ├── AddAccountDialog.jsx
    │   │   │   ├── AddBudgetDialog.jsx
    │   │   │   ├── AddExpenseDialog.jsx
    │   │   │   ├── AddFundsDialog.jsx
    │   │   │   ├── AddGoalDialog.jsx
    │   │   │   ├── AddIncomeDialog.jsx
    │   │   │   ├── ScanReceiptDialog.jsx
    │   │   │   └── ... (all dialogs)
    │   │   │
    │   │   ├── filters/
    │   │   │   ├── ActivityLogFilter.jsx
    │   │   │   └── SpendingFilter.jsx
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── DashboardLayout.jsx
    │   │   │   ├── DashboardSidebar.jsx
    │   │   │   └── DashboardHeader.jsx
    │   │   │
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── NavLink.jsx
    │   │
    │   ├── pages/
    │   │   ├── dashboard/
    │   │   │   ├── DashboardHome.jsx
    │   │   │   ├── Budgets.jsx
    │   │   │   ├── Goals.jsx
    │   │   │   ├── Accounts.jsx
    │   │   │   ├── Transactions.jsx
    │   │   │   ├── UploadBill.jsx
    │   │   │   ├── Reports.jsx
    │   │   │   └── Profile.jsx
    │   │   │
    │   │   ├── tips/
    │   │   │   ├── SmartBudgetingTips.jsx
    │   │   │   ├── ExpenseAnalyticsTips.jsx
    │   │   │   ├── FinancialGoalsTips.jsx
    │   │   │   ├── OCRScanningTips.jsx
    │   │   │   ├── SubscriptionTrackingTips.jsx
    │   │   │   └── ScheduledPaymentsTips.jsx
    │   │   │
    │   │   ├── Auth.jsx
    │   │   ├── Landing.jsx
    │   │   └── NotFound.jsx
    │   │
    │   ├── hooks/
    │   │   ├── use-mobile.jsx
    │   │   └── use-toast.js
    │   │
    │   ├── lib/
    │   │   ├── api.js
    │   │   ├── supabase.js
    │   │   └── utils.js
    │   │
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    │
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── eslint.config.js
    ├── postcss.config.js
    ├── components.json
    └── .gitignore
```

---

## 🚨 Critical Links - DO NOT BREAK

These are the imports that will cause black screens if files are deleted:

### **In App.jsx (MAIN ROUTING)**
```javascript
import Landing from "./pages/Landing";              ← IF DELETED → Black screen
import Auth from "./pages/Auth";                    ← IF DELETED → Black screen
import DashboardLayout from "./components/dashboard/DashboardLayout";  
import SmartBudgetingTips from "./pages/tips/SmartBudgetingTips";
import DashboardHome from "./pages/dashboard/DashboardHome";
// ... ALL 6 Tips pages
// ... ALL 8 Dashboard pages
```

### **In DashboardHome.jsx**
```javascript
import { ScanReceiptDialog } from "@/components/dialogs/ScanReceiptDialog";
import { AddExpenseDialog } from "@/components/dialogs/AddExpenseDialog";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { AddBudgetDialog } from "@/components/dialogs/AddBudgetDialog";
import { AddIncomeDialog } from "@/components/dialogs/AddIncomeDialog";
// If ANY of these are deleted → DashboardHome crashes
```

### **In Budgets.jsx**
```javascript
import { api } from "@/lib/api";                    ← IF DELETED → Black screen
import { supabase } from "@/lib/supabase";          ← IF DELETED → Black screen
```

### **In All Dialog Files**
```javascript
import { toast } from "@/hooks/use-toast";          ← IF DELETED → All dialogs crash
import { Button } from "@/components/ui/button";    ← IF DELETED → All UIs break
// UI components are CRITICAL
```

---

## ⚡ Safe Deletion Checklist

Before deleting ANY file:

1. ☐ **Search for imports**: `Ctrl+Shift+F` and search filename
2. ☐ **Check if in App.jsx**: Is it imported in App.jsx routes?
3. ☐ **Check dependencies**: Are other files importing it?
4. ☐ **Test app**: Run `npm run dev` and verify no console errors
5. ☐ **Navigate around**: Visit each route to ensure they load
6. ☐ **Test dialogs**: Open each dialog to ensure they render

**Files to Search Before Deleting:**
- test.jsx → Search for "test" imports
- Index.jsx → Search for "Index" imports
- Any component → Search for component name

---

## 🔄 Reorganization Steps with Safety

### Step 1: Create New Directories
```bash
mkdir docs
mkdir backend/models
mkdir backend/config
mkdir backend/sql
```

### Step 2: Move Files (Don't Delete Yet)
```bash
# Docs
mv AUTHENTICATION_SETUP.md docs/
mv CLEANUP_ANALYSIS.md docs/
mv FRONTEND_CONNECTION_GUIDE.md docs/
mv TRANSACTION_BUDGET_LINKAGE.md docs/
mv backend/BUDGET_SETUP_GUIDE.md docs/

# Backend
mv backend/auth.py backend/models/
mv backend/budgets.py backend/models/
mv backend/database.py backend/models/
mv backend/income.py backend/models/
mv backend/transactions.py backend/models/
mv backend/.env backend/config/
mv backend/SETUP_BUDGETS.sql backend/sql/
```

### Step 3: Update Imports in backend/main.py
```python
# OLD:
# from auth import *
# from budgets import *

# NEW:
from models.auth import *
from models.budgets import *
from models.database import *
from models.income import *
from models.transactions import *
```

### Step 4: Test Everything
```bash
# Frontend
cd frontend
npm run dev
# Visit http://localhost:5173
# Test all routes

# Backend
cd backend
python main.py
# Verify no import errors
```

### Step 5: Delete Unused Files
```bash
# Only after confirming App.jsx doesn't use them:
rm frontend/src/test.jsx
rm frontend/src/pages/Index.jsx

# Remove junk folder
rm -rf tash/
```

### Step 6: Commit to Git
```bash
git add .
git commit -m "refactor: organize folder structure and remove unused files

- Move docs to docs/ folder
- Reorganize backend with models/, config/, sql/ folders
- Delete unused test.jsx and Index.jsx
- Remove tash/ junk folder
- Update import paths in backend/main.py"
```

---

## 📞 Quick Reference: Why Files Matter

| File Type | If Deleted | Result |
|-----------|-----------|--------|
| Pages in App.jsx routes | Route breaks | That page shows 404 |
| Dialogs imported by pages | Dialog crashes | Page loads but dialog errors |
| lib/ utilities | Missing function | Black screen + console error |
| hooks/ | Missing hook | Black screen + console error |
| UI components | Missing UI element | Black screen + console error |
| test.jsx | Not imported | NO PROBLEM - safe to delete |
| Index.jsx | Not in routes | NO PROBLEM - safe to delete |

---

## ✨ Final Result After Cleanup

✅ **Clear, organized structure**  
✅ **No unused/test files**  
✅ **All docs centralized**  
✅ **Backend organized by features**  
✅ **Easy to navigate**  
✅ **Easy to onboard new developers**  
✅ **All functionality works perfectly**  
✅ **No black screens!**

