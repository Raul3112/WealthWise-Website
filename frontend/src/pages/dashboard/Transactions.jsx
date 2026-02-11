import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, TrendingUp, TrendingDown, Plus, Edit2, Calendar, Upload, FileText, Loader2, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

const paymentModes = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const monthlyBudget = 25000;

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [summary, setSummary] = useState({
    total_expense: 0,
    total_income: 0,
    expenses_by_category: {},
  });
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [budgets, setBudgets] = useState([]);

  const [formData, setFormData] = useState({
    amount: "",
    type: "expense",
    category: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    paymentMode: "",
  });

  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scannedTransactionId, setScannedTransactionId] = useState(null);  // Track OCR transaction for rescan
  const fileInputRef = useRef(null);

  // Filter states
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get current user and load transactions
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Fallback for dev/testing
        setUserId("test_user_123");
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchCategories();
      fetchTransactions();
      fetchSummary();
      fetchIncomeTotal();
      fetchBudgets();
      
      // Polling: refetch summary, income, and budgets every 5 seconds to catch updates (reduced frequency to prevent blinking)
      const pollInterval = setInterval(() => {
        fetchSummary();
        fetchIncomeTotal();
        fetchBudgets();
      }, 5000);
      
      return () => clearInterval(pollInterval);
    }
  }, [userId, selectedMonth, selectedYear, filterCategory, filterPaymentMode, searchQuery]);

  const fetchIncomeTotal = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "test_user_123"; // Fallback for dev

      const res = await fetch(`http://127.0.0.1:8000/income/total?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setIncomeTotal(typeof body.total === "number" ? body.total : 0);
      }
    } catch (err) {
      console.warn("Unable to load income total", err);
    }
  };

  const fetchBudgets = async () => {
    try {
      const data = await api.getBudgets({ month: selectedMonth, year: selectedYear });
      setBudgets(data || []);
    } catch (err) {
      console.warn("Unable to load budgets", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data.all || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      // Fallback to basic categories if API fails
      setCategories([
        { value: "food", label: "Food & Dining", icon: "🍽️" },
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
      ]);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const month = String(selectedMonth).padStart(2, '0');
      const startDate = `${selectedYear}-${month}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const filters = {
        start_date: startDate,
        end_date: endDate,
      };

      if (filterCategory !== 'all') filters.category = filterCategory;
      if (filterPaymentMode !== 'all') filters.payment_mode = filterPaymentMode;
      if (searchQuery) filters.search = searchQuery;

      console.log("[Transactions] Fetching with filters:", filters);
      const data = await api.getTransactions(filters);
      
      console.log("[Transactions] Got data:", data, "Type:", typeof data, "Is array:", Array.isArray(data));
      
      // Ensure data is an array
      const txnArray = Array.isArray(data) ? data : [];
      
      // Transform API response to match component format
      const formatted = txnArray.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.txn_type,
        category: t.category,
        date: t.txn_date,
        description: t.description || 'No description',
        paymentMode: t.payment_mode,
        source: t.source || 'manual',  // Include source field for OCR/Manual badge
      }));
      
      console.log("[Transactions] Formatted:", formatted);
      setTransactions(formatted);
    } catch (error) {
      console.error('[Transactions] Error fetching transactions:', error);
      console.error('[Transactions] Error details:', error.message);
      toast({ title: "Error loading transactions", description: error.message || "Failed to load transactions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getTransactionSummary(selectedMonth, selectedYear);
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  // Calculate summary from fetched data
  const currentMonthExpenses = transactions.filter((t) => t.type === "expense");
  const totalExpenses = summary.total_expense;
  const budgetLeft = monthlyBudget - totalExpenses;

  const expensesByCategory = summary.expenses_by_category || {};

  const overspentCategories = Object.values(expensesByCategory).filter(
    (amount) => amount > 5000
  ).length;

  // Calculate Net Flow
  const netFlow = (incomeTotal || 0) - (totalExpenses || 0);

  // Calculate Top Category
  const getTopCategory = () => {
    if (!expensesByCategory || Object.keys(expensesByCategory).length === 0) {
      return { name: "No data", amount: 0, percentage: 0, icon: "📊" };
    }
    const topCat = Object.entries(expensesByCategory).reduce((max, [cat, amount]) => 
      amount > max.amount ? { category: cat, amount } : max, 
      { category: "", amount: 0 }
    );
    const categoryData = categories.find(c => c.value === topCat.category);
    const percentage = totalExpenses > 0 ? ((topCat.amount / totalExpenses) * 100).toFixed(0) : 0;
    return {
      name: categoryData?.label || topCat.category,
      amount: topCat.amount,
      percentage,
      icon: categoryData?.icon || "💰"
    };
  };

  // Calculate Over Budget Categories
  const getOverBudgetCount = () => {
    const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
    const overBudgetCategories = budgets.filter((b) => b.spent > b.amount);
    return {
      count: overBudgetCategories.length,
      categories: overBudgetCategories.map(b => categories.find(c => c.value === b.category)?.label || b.category).join(", ")
    };
  };

  const topCategory = getTopCategory();
  const overBudget = getOverBudgetCount();

  // Filter transactions (client-side for already fetched data)
  const filteredTransactions = currentMonthExpenses;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount is required and must be greater than 0";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.paymentMode) {
      newErrors.paymentMode = "Payment mode is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingId) {
      updateTransaction();
    } else {
      createTransaction();
    }
  };

  const createTransaction = async () => {
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        txn_type: formData.type,
        category: formData.category,
        description: formData.description || "No description",
        payment_mode: formData.paymentMode,
        txn_date: formData.date,
      };

      const response = await api.createTransaction(payload);
      
      setFormData({
        amount: "",
        type: "expense",
        category: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        paymentMode: "",
      });
      setShowAddDialog(false);
      
      // Check for budget warning in response
      if (response.budget_warning && response.budget_warning.warning) {
        const warning = response.budget_warning;
        toast({ 
          title: warning.warning === "budget_exceeded" ? "⚠️ Budget Exceeded!" : "⚠️ Budget Alert",
          description: warning.message,
          variant: warning.warning === "budget_exceeded" ? "destructive" : "default",
          duration: 6000,
        });
      } else {
        toast({ title: "Success", description: "Transaction created successfully" });
      }
      
      // Refresh data
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast({ title: "Error", description: error.message || "Failed to create transaction", variant: "destructive" });
    }
  };

  const updateTransaction = async () => {
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || "No description",
        payment_mode: formData.paymentMode,
        txn_date: formData.date,
      };

      await api.updateTransaction(editingId, payload);
      
      setEditingId(null);
      setFormData({
        amount: "",
        type: "expense",
        category: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        paymentMode: "",
      });
      setShowAddDialog(false);
      toast({ title: "Success", description: "Transaction updated successfully" });
      
      // Refresh data
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast({ title: "Error", description: error.message || "Failed to update transaction", variant: "destructive" });
    }
  };


  // Confirmation dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Remove undo state

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteTransaction(confirmDeleteId);
      toast({
        title: "Deleted",
        description: "Transaction removed",
        duration: 4000
      });
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast({ title: "Error", description: error.message || "Failed to delete transaction", variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Undo logic removed

  // deleteTransaction is now handled by confirmDelete

  const handleEdit = (transaction) => {
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description,
      paymentMode: transaction.paymentMode,
    });
    setEditingId(transaction.id);
    setShowAddDialog(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      amount: "",
      type: "expense",
      category: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      paymentMode: "",
    });
    setShowAddDialog(false);
  };

  const handleScanFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      try {
        const result = await api.scanReceipt(file);
        console.log(">>> OCR Transactions: Backend response:", result);
        
        // New flow: transaction created directly by backend with source='ocr'
        if (result?.transaction) {
          console.log(">>> OCR Transactions: Transaction created with source:", result.transaction.source);
          
          // Store transaction ID so we can delete if user rescans
          setScannedTransactionId(result.transaction.id);
          
          setScannedData({
            description: result.transaction.description || "Scanned Receipt",
            amount: result.transaction.amount.toString(),
            date: result.transaction.txn_date,
            category: result.transaction.category || "shopping",
          });
          toast({ 
            title: "Receipt Scanned", 
            description: "Data extracted successfully. Review and confirm below." 
          });
        } else {
          throw new Error("Invalid response: missing transaction data");
        }
      } catch (error) {
        console.error("OCR Error:", error);
        toast({ 
          title: "Scan Failed", 
          description: error.message || "Could not process receipt. Please try another image.",
          variant: "destructive"
        });
        setScannedData(null);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleScanSave = () => {
    if (scannedData) {
      // OCR transaction is already created in backend with source='ocr'
      // Clear the transaction ID so it won't be deleted on dialog close
      setScannedTransactionId(null);
      // Just close the dialog and refresh
      setShowScanDialog(false);
      setScannedData(null);
      toast({ 
        title: "Receipt Saved", 
        description: "Transaction created from OCR scan" 
      });
      // Trigger refresh of transactions list
      fetchTransactions();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryLabel = (value) => {
    const category = categories.find((c) => c.value === value);
    return category ? category.label : value;
  };

  const getCategoryIcon = (value) => {
    const category = categories.find((c) => c.value === value);
    return category ? category.icon : "📦";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Expenses</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:border-primary/30">Step 3: Log Expenses</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Track and manage your daily spending</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <Button variant="hero" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Expenses */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This month • Live from transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Flow */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Net Flow</p>
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${netFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{Math.abs(netFlow).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Income - Expenses (balance for month)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Spending Category */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Top Category</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl">{topCategory.icon}</span>
                <div>
                  <p className="font-semibold">{topCategory.name}</p>
                  <p className="text-xs text-red-600">₹{topCategory.amount.toLocaleString()} ({topCategory.percentage}% of total)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Over Budget */}
        <Card variant="elevated" className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Over Budget Alert</p>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-amber-600">{overBudget.count} {overBudget.count === 1 ? "Category" : "Categories"}</p>
                <p className="text-xs text-amber-700">{overBudget.categories || "All on track"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5" />
            <h3 className="font-semibold">Filters</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search by note</Label>
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    cat.subcategories ? (
                      // Render Others with subcategories for filter
                      <div key={cat.value}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {cat.icon} {cat.label}
                        </div>
                        {cat.subcategories.map((subcat) => (
                          <SelectItem key={subcat.value} value={subcat.value} className="pl-6">
                            {subcat.icon} {subcat.label}
                          </SelectItem>
                        ))}
                      </div>
                    ) : (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={filterPaymentMode} onValueChange={setFilterPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Expenses</h3>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Mode</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Amount</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xl">{getCategoryIcon(transaction.category)}</span>
                        <p className="text-xs text-muted-foreground mt-1">{getCategoryLabel(transaction.category)}</p>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {transaction.description}
                          {transaction.source === 'ocr' ? (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:border-primary/30">
                              📷 OCR
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                              ✏️ Manual
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(transaction.date)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">
                          {paymentModes.find((m) => m.value === transaction.paymentMode)?.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-red-600">
                        -₹{transaction.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          className="hover:bg-secondary hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                          className="hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                            {/* Confirm Delete Dialog */}
                            <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Transaction?</DialogTitle>
                                </DialogHeader>
                                <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                  <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      cat.subcategories ? (
                        // Render Others with subcategories
                        <div key={cat.value}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {cat.icon} {cat.label}
                          </div>
                          {cat.subcategories.map((subcat) => (
                            <SelectItem key={subcat.value} value={subcat.value} className="pl-6">
                              {subcat.icon} {subcat.label}
                            </SelectItem>
                          ))}
                        </div>
                      ) : (
                        // Regular category
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={formData.paymentMode} onValueChange={(v) => handleChange("paymentMode", v)}>
                  <SelectTrigger className={errors.paymentMode ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMode && <p className="text-sm text-red-500">{errors.paymentMode}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label>Note / Description</Label>
              <Input
                type="text"
                placeholder="E.g., Dinner at restaurant"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" variant="hero" className="flex-1">
                {editingId ? "Update Expense" : "Add Expense"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowScanDialog(true);
              }}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Bill / Scan Receipt
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scan Receipt Dialog */}
      <Dialog open={showScanDialog} onOpenChange={async (open) => {
        // If dialog is closing and there's a scanned transaction that wasn't saved, delete it
        if (!open && scannedTransactionId && scannedData) {
          try {
            await api.deleteTransaction(scannedTransactionId);
            console.log(">>> OCR: Deleted unsaved scan transaction:", scannedTransactionId);
            toast({ 
              title: "Scan Cancelled", 
              description: "Receipt scan was discarded" 
            });
          } catch (error) {
            console.error(">>> OCR: Error deleting unsaved scan:", error);
          }
          setScannedTransactionId(null);
        }
        setShowScanDialog(open);
        if (!open) {
          setScannedData(null);
          setScannedTransactionId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Scan Receipt (OCR)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={handleScanFileUpload}
              className="hidden"
            />

            {!scannedData && !scanning && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Upload a receipt image or PDF</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </div>
            )}

            {scanning && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin mb-4" />
                <p className="text-muted-foreground">Processing receipt...</p>
              </div>
            )}

            {scannedData && !scanning && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-sm text-emerald-600 font-medium">✓ Extracted Data:</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={scannedData.description}
                    onChange={(e) => setScannedData({ ...scannedData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    value={scannedData.amount}
                    onChange={(e) => setScannedData({ ...scannedData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scannedData.date}
                    onChange={(e) => setScannedData({ ...scannedData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={scannedData.category}
                    onValueChange={(value) => setScannedData({ ...scannedData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      // Delete the previous OCR transaction if user rescans
                      if (scannedTransactionId) {
                        try {
                          await api.deleteTransaction(scannedTransactionId);
                          console.log(">>> OCR: Deleted previous scan transaction:", scannedTransactionId);
                        } catch (error) {
                          console.error(">>> OCR: Error deleting previous scan:", error);
                        }
                      }
                      setScannedData(null);
                      setScannedTransactionId(null);
                      fileInputRef.current.value = "";
                    }}
                    className="flex-1"
                  >
                    Rescan
                  </Button>
                  <Button variant="hero" onClick={handleScanSave} className="flex-1">
                    Use This Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
