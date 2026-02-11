import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle, CheckCircle2, Plus, Trash2, Wallet, TrendingDown, PiggyBank, Target, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data: Budget categories
const CATEGORIES = [
  { value: "food", label: "Food & Groceries", icon: "🍽️" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "bills", label: "Bills & Utilities", icon: "💡" },
  { value: "rent", label: "Rent", icon: "🏠" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "entertainment", label: "Entertainment", icon: "🎮" },
  { value: "healthcare", label: "Healthcare", icon: "🏥" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "emi", label: "EMI / Loans", icon: "💳" },
  { value: "savings", label: "Savings & Investments", icon: "💰" },
  { value: "others", label: "Others", icon: "📦" },
];

// Mock data: Initial budgets
const INITIAL_BUDGETS = [
  { id: 1, category: "food", type: "Monthly", amount: 8000, spent: 5600, startDate: "2026-01", alertThreshold: 80 },
  { id: 2, category: "transport", type: "Monthly", amount: 3000, spent: 2700, startDate: "2026-01", alertThreshold: 80 },
  { id: 3, category: "shopping", type: "Weekly", amount: 2000, spent: 1200, startDate: "2026-01-01", alertThreshold: 80 },
  { id: 4, category: "bills", type: "Monthly", amount: 5000, spent: 4800, startDate: "2026-01", alertThreshold: 80 },
  { id: 5, category: "entertainment", type: "Weekly", amount: 1500, spent: 1650, startDate: "2026-01-01", alertThreshold: 80 },
];

export default function Budgets() {
  // State management
  const now = new Date();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", type: "Monthly", alertThreshold: "80" });
  const [formData, setFormData] = useState({
    type: "Monthly",
    category: "",
    amount: "",
    otherDescription: "",
    startDate: new Date().toISOString().slice(0, 7), // YYYY-MM format
    alertThreshold: "80",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const { toast } = useToast();

  // Get user ID from Supabase auth
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Fallback for dev/testing
        setUserId("test_user_123");
      }
    };
    getUserId();
  }, []);

  // Fetch budgets and categories on mount and when month changes
  useEffect(() => {
    if (!userId) return; // Wait for userId to be loaded
    
    let isInitialLoad = true;
    
    const fetchData = async () => {
      // Only show loading spinner on initial load, not during polling
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [budgetsData, categoriesData] = await Promise.all([
          api.getBudgets({ month: selectedMonth, year: selectedYear }),
          api.getCategories(),
        ]);
        
        setBudgets(budgetsData);
        setCategories(categoriesData.all || []);
      } catch (err) {
        setError(err.message);
        toast({ 
          title: "Failed to load budgets", 
          description: err.message, 
          variant: "destructive" 
        });
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
          isInitialLoad = false;
        }
      }
    };
    
    fetchData();
    
    // Polling: refetch every 5 seconds to catch updates (reduced frequency to prevent blinking)
    const pollInterval = setInterval(fetchData, 5000);
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedMonth, selectedYear, userId]);

  // TODO: Calculate spent from transactions when backend is ready
  // const calculateSpent = (budget, transactions) => {
  //   return transactions
  //     .filter(txn => {
  //       const txnDate = new Date(txn.date);
  //       const budgetStart = new Date(budget.startDate);
  //       
  //       // For monthly budgets, check if transaction is in same month/year
  //       if (budget.type === "Monthly") {
  //         return txnDate.getMonth() === budgetStart.getMonth() &&
  //                txnDate.getFullYear() === budgetStart.getFullYear() &&
  //                txn.category === budget.category;
  //       }
  //       
  //       // For weekly budgets, check if transaction is in same week
  //       if (budget.type === "Weekly") {
  //         const weekStart = new Date(budgetStart);
  //         const weekEnd = new Date(budgetStart);
  //         weekEnd.setDate(weekEnd.getDate() + 7);
  //         return txnDate >= weekStart && txnDate < weekEnd &&
  //                txn.category === budget.category;
  //       }
  //       return false;
  //     })
  //     .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  // };

  // Calculate totals
  const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const remainingBudget = totalBudget - totalSpent;
  const overallUsage = totalBudget ? (totalSpent / totalBudget) * 100 : 0;

  const overallStatus = useMemo(() => {
    if (totalBudget === 0) return { label: "No budgets", color: "bg-secondary text-muted-foreground" };
    if (overallUsage >= 100) return { label: "Exceeded", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (overallUsage >= 80) return { label: "Near limit", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: "On track", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" };
  }, [overallUsage, totalBudget]);

  // Get category label
  const getCategoryLabel = (value) => {
    const cat = categories.find((c) => c.value === value) || CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  // Get category icon
  const getCategoryIcon = (value) => {
    const cat = categories.find((c) => c.value === value) || CATEGORIES.find((c) => c.value === value);
    return cat ? cat.icon : "💰";
  };

  // Calculate percentage used
  const getPercentage = (spent, amount) => {
    if (!amount || amount === 0) return 0;
    return (spent / amount) * 100;
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage < 70) return "bg-emerald-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Check status per budget
  const getStatusForBudget = (spent, amount, alertThreshold = 80) => {
    const percentage = getPercentage(spent, amount);
    if (spent > amount) return { label: "Exceeded", tone: "text-red-700", pill: "bg-red-100 text-red-700" };
    if (percentage >= alertThreshold) return { label: "Near limit", tone: "text-amber-700", pill: "bg-amber-100 text-amber-800" };
    return { label: "On track", tone: "text-emerald-700", pill: "bg-emerald-100 text-emerald-800" };
  };

  const budgetsWithWarnings = budgets.filter((b) => {
    const percentage = getPercentage(b.spent, b.amount);
    const threshold = b.alertThreshold || 80;
    return percentage >= threshold && percentage < 100;
  });
  const budgetsExceeded = budgets.filter((b) => b.spent > b.amount);

  // Calculate days remaining in selected month
  const getDaysRemaining = () => {
    const now = new Date();
    const currentDate = now.getDate();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Calculate for the selected month/year
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    // If viewing a future month, show full days remaining
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      return { daysRemaining: daysInMonth, percentagePassed: 0 };
    }
    
    // If viewing a past month, show 0 days remaining, 100% passed
    if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
      return { daysRemaining: 0, percentagePassed: 100 };
    }
    
    // If viewing current month, calculate based on today's date
    const daysRemaining = daysInMonth - currentDate;
    const percentagePassed = ((currentDate / daysInMonth) * 100).toFixed(0);
    return { daysRemaining, percentagePassed };
  };

  const { daysRemaining, percentagePassed } = getDaysRemaining();

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      toast({ 
        title: "Missing fields", 
        description: "Please fill all required fields",
        variant: "destructive" 
      });
      return;
    }

    // Validate Others category description
    if (formData.category === "others" && !formData.otherDescription.trim()) {
      toast({ 
        title: "Description required", 
        description: "Please provide a description for Others category",
        variant: "destructive" 
      });
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ 
        title: "Invalid amount", 
        description: "Budget amount must be a positive number",
        variant: "destructive" 
      });
      return;
    }

    const parsedThreshold = parseInt(formData.alertThreshold);
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 100) {
      toast({ 
        title: "Invalid threshold", 
        description: "Alert threshold must be between 1 and 100",
        variant: "destructive" 
      });
      return;
    }

    // Create budget via API
    try {
      setIsLoading(true);
      
      // Convert YYYY-MM to YYYY-MM-DD format
      const startDate = formData.startDate.includes('-') && formData.startDate.split('-').length === 2
        ? `${formData.startDate}-01`
        : formData.startDate;
      
      const newBudget = await api.createBudget({
        category: formData.category,
        budget_type: formData.type,
        amount: parsedAmount,
        start_date: startDate,
        alert_threshold: parsedThreshold,
        custom_category_name: formData.category === "others" ? formData.otherDescription : null,
      });

      setBudgets((prev) => [...prev, newBudget]);
      
      // Refresh categories if custom category was added
      if (formData.category === "others") {
        const categoriesData = await api.getCategories();
        setCategories(categoriesData.all || []);
      }

      setFormData({ 
        type: "Monthly", 
        category: "", 
        amount: "", 
        otherDescription: "",
        startDate: new Date().toISOString().slice(0, 7),
        alertThreshold: "80"
      });

      toast({ 
        title: "Budget saved", 
        description: `${getCategoryLabel(newBudget.category)} added for ${newBudget.budget_type}.` 
      });
    } catch (err) {
      console.error('Budget creation error:', err);
      toast({ 
        title: "Failed to create budget", 
        description: err.message || String(err), 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete budget
  // Confirmation dialog state for delete
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsLoading(true);
      await api.deleteBudget(confirmDeleteId);
      setBudgets((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      toast({ 
        title: "Budget removed", 
        description: "The category has been deleted.", 
        variant: "destructive" 
      });
    } catch (err) {
      toast({ 
        title: "Failed to delete budget", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const startEditing = (budget) => {
    setEditingId(budget.id);
    setEditForm({ 
      amount: budget.amount.toString(), 
      type: budget.type,
      alertThreshold: (budget.alertThreshold || 80).toString()
    });
  };

  const handleUpdateBudget = async (e, id) => {
    e.preventDefault();
    const parsed = parseFloat(editForm.amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast({ 
        title: "Invalid amount", 
        description: "Budget amount must be a positive number",
        variant: "destructive" 
      });
      return;
    }

    const parsedThreshold = parseInt(editForm.alertThreshold);
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 100) {
      toast({ 
        title: "Invalid threshold", 
        description: "Alert threshold must be between 1 and 100",
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsLoading(true);
      const updated = await api.updateBudget(id, {
        amount: parsed,
        budget_type: editForm.type,
        alert_threshold: parsedThreshold,
      });

      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? updated : b)),
      );
      setEditingId(null);
      toast({ title: "Budget updated", description: "Limits adjusted for this category." });
    } catch (err) {
      toast({ 
        title: "Failed to update budget", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Budget Planner</h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Step 2: Set Budgets</Badge>
          </div>
          <p className="text-muted-foreground">Set monthly limits and track your spending</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">January</SelectItem>
              <SelectItem value="2">February</SelectItem>
              <SelectItem value="3">March</SelectItem>
              <SelectItem value="4">April</SelectItem>
              <SelectItem value="5">May</SelectItem>
              <SelectItem value="6">June</SelectItem>
              <SelectItem value="7">July</SelectItem>
              <SelectItem value="8">August</SelectItem>
              <SelectItem value="9">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem>
              <SelectItem value={String(now.getFullYear() - 1)}>{now.getFullYear() - 1}</SelectItem>
              <SelectItem value={String(now.getFullYear() - 2)}>{now.getFullYear() - 2}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Budget */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Budget</p>
                <p className="text-2xl font-bold mt-1">₹{totalBudget.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">All categories combined</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spent So Far */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Spent So Far</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">₹{totalSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">From logged transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Remaining</p>
                <p className={`text-2xl font-bold mt-1 ${remainingBudget >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  ₹{remainingBudget.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Safe to spend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status % */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Budget Status</p>
                <Badge className={overallStatus.color}>
                  <span className="text-xs">{overallStatus.label}</span>
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{overallUsage.toFixed(0)}%</p>
                <Progress value={Math.min(overallUsage, 120)} className="h-2.5" />
                <p className="text-xs text-muted-foreground">Used this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Left */}
        <Card variant="elevated" className="border-primary/40">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Period Remaining</p>
                <p className="text-2xl font-bold mt-1">{daysRemaining} days</p>
                <p className="text-xs text-muted-foreground mt-1">{percentagePassed}% of month passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-semibold">Error loading budgets</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(budgetsWithWarnings.length > 0 || budgetsExceeded.length > 0) && (
        <Card variant="outline" className="border-dashed">
          <CardContent className="p-4 space-y-2">
            {budgetsExceeded.length > 0 && (
              <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Budget exceeded</p>
                  <p className="text-sm">
                    {budgetsExceeded.length} {budgetsExceeded.length === 1 ? "category" : "categories"} crossed the limit. Tighten spending or raise the limit.
                  </p>
                </div>
              </div>
            )}
            {budgetsWithWarnings.length > 0 && (
              <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Approaching limit</p>
                  <p className="text-sm">
                    {budgetsWithWarnings.length} {budgetsWithWarnings.length === 1 ? "category" : "categories"} are above 80% usage.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category-wise Budgets</CardTitle>
                <CardDescription>Live progress with under/near/exceeded signals</CardDescription>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Target className="w-4 h-4" /> {budgets.length} categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
                    <div className="h-6 bg-secondary rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-secondary rounded w-full mb-2"></div>
                    <div className="h-4 bg-secondary rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && budgets.length === 0 && (
              <p className="text-center text-muted-foreground py-10">No budgets yet. Create one to get started.</p>
            )}

            {!isLoading && budgets.map((budget) => {
              const percentage = getPercentage(budget.spent, budget.amount);
              const remaining = budget.amount - budget.spent;
              const status = getStatusForBudget(budget.spent, budget.amount, budget.alertThreshold || 80);

              return (
                <div key={budget.id} className="rounded-xl border border-border px-4 py-3 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] bg-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(budget.category)}</span>
                      <div>
                        <p className="font-semibold">
                          {budget.custom_category_name || getCategoryLabel(budget.category)}
                          {budget.category === "others" && budget.custom_category_name && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">(Custom)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{budget.budget_type || budget.type} budget</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.pill}>{status.label}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(budget)}
                        className="hover:bg-primary/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(budget.id)}
                        className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                          {/* Confirm Delete Dialog */}
                          <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Budget?</DialogTitle>
                              </DialogHeader>
                              <p>Are you sure you want to delete this budget? This action cannot be undone.</p>
                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-semibold">₹{budget.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">₹{budget.spent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className={`font-semibold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {remaining >= 0 ? "₹" : "-₹"}{Math.abs(remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {editingId === budget.id && (
                    <form className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] items-end" onSubmit={(e) => handleUpdateBudget(e, budget.id)}>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-amount-${budget.id}`}>New amount (₹)</Label>
                        <Input
                          id={`edit-amount-${budget.id}`}
                          type="number"
                          value={editForm.amount}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-type-${budget.id}`}>Period</Label>
                        <Select
                          value={editForm.type}
                          onValueChange={(value) => setEditForm((prev) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger id={`edit-type-${budget.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-threshold-${budget.id}`}>Alert %</Label>
                        <Input
                          id={`edit-threshold-${budget.id}`}
                          type="number"
                          min="1"
                          max="100"
                          className="w-20"
                          value={editForm.alertThreshold}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, alertThreshold: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="mt-3 space-y-1">
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 110)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% used</span>
                      {percentage >= 100 ? <span className="text-red-600 dark:text-red-400 font-semibold">Exceeded</span> : null}
                    </div>
                    {percentage >= (budget.alertThreshold || 80) && (
                      <div className="flex items-center gap-2 text-xs">
                        {percentage >= 100 ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        )}
                        <span className={percentage >= 100 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
                          {percentage >= 100
                            ? `Exceeded by ₹${Math.abs(remaining).toLocaleString()}`
                            : `Almost at limit: ${percentage.toFixed(0)}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Add Budget</CardTitle>
              <CardDescription>Plan limits by category and period. No receipts or payment details here.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBudget} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Time period</Label>
                    <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                        {categories.filter(c => !CATEGORIES.some(pc => pc.value === c.value)).map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === "others" && (
                    <div className="space-y-2">
                      <Label htmlFor="otherDescription">Describe this category</Label>
                      <Input
                        id="otherDescription"
                        type="text"
                        placeholder="E.g., Pet care, gifts, hobbies"
                        value={formData.otherDescription}
                        onChange={(e) => handleChange("otherDescription", e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amount">Budget amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={formData.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="month"
                      value={formData.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                    <Select value={formData.alertThreshold} onValueChange={(value) => handleChange("alertThreshold", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select threshold" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50% - Early Warning</SelectItem>
                        <SelectItem value="75">75% - Moderate</SelectItem>
                        <SelectItem value="80">80% - Standard</SelectItem>
                        <SelectItem value="90">90% - Late Warning</SelectItem>
                        <SelectItem value="95">95% - Critical Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4" /> Save budget
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card variant="flat" className="border border-dashed border-emerald-100 dark:border-emerald-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Budget tips
              </CardTitle>
              <CardDescription>Small nudges to keep you on track</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Keep essentials (rent, bills, groceries) at the top of your list.</p>
              <p>• Use weekly budgets for fast-moving spends like food or transport.</p>
              <p>• Revisit categories when alerts start firing; adjust limits, not just spending.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
