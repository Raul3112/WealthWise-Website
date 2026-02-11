import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import SmartBudgetingTips from "./pages/tips/SmartBudgetingTips";
import ExpenseAnalyticsTips from "./pages/tips/ExpenseAnalyticsTips";
import FinancialGoalsTips from "./pages/tips/FinancialGoalsTips";
import OCRScanningTips from "./pages/tips/OCRScanningTips";
import SubscriptionTrackingTips from "./pages/tips/SubscriptionTrackingTips";
import ScheduledPaymentsTips from "./pages/tips/ScheduledPaymentsTips";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Budgets from "./pages/dashboard/Budgets";
import Goals from "./pages/dashboard/Goals";
import Accounts from "./pages/dashboard/Accounts";
import Transactions from "./pages/dashboard/Transactions";
import Reports from "./pages/dashboard/Reports";
import Profile from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/tips/smart-budgeting" element={<SmartBudgetingTips />} />
              <Route path="/tips/expense-analytics" element={<ExpenseAnalyticsTips />} />
              <Route path="/tips/financial-goals" element={<FinancialGoalsTips />} />
              <Route path="/tips/ocr-scanning" element={<OCRScanningTips />} />
              <Route path="/tips/subscription-tracking" element={<SubscriptionTrackingTips />} />
              <Route path="/tips/scheduled-payments" element={<ScheduledPaymentsTips />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="goals" element={<Goals />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="reports" element={<Reports />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;