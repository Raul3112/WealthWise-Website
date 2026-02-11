import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Filter,
  Loader2,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const COLORS = ["#10b981", "#f59e42", "#3b82f6", "#a78bfa", "#f87171", "#6b7280", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6"];

export default function Reports() {
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [trendMonths, setTrendMonths] = useState(12);
  const [activeTab, setActiveTab] = useState("overview");

  // Data State
  const [incomeVsExpense, setIncomeVsExpense] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [paymentModeBreakdown, setPaymentModeBreakdown] = useState([]);
  const [goalsProgress, setGoalsProgress] = useState([]);
  const [budgetsPerformance, setBudgetsPerformance] = useState([]);
  const [savingsRate, setSavingsRate] = useState([]);
  const [topTransactions, setTopTransactions] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [spendingAnomalies, setSpendingAnomalies] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [detailedSummary, setDetailedSummary] = useState(null);
  const [exporting, setExporting] = useState(false);

  const pieCategoryData = useMemo(() => {
    if (!categoryBreakdown?.length) {
      return [];
    }

    const sorted = [...categoryBreakdown].sort(
      (a, b) => (b.total_amount || 0) - (a.total_amount || 0)
    );
    const maxItems = 6;

    if (sorted.length <= maxItems) {
      return sorted;
    }

    const top = sorted.slice(0, maxItems - 1);
    const rest = sorted.slice(maxItems - 1);
    const restTotal = rest.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const total = sorted.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const restPercentage = total > 0 ? Number(((restTotal / total) * 100).toFixed(1)) : 0;

    return [
      ...top,
      {
        category: "Others",
        total_amount: restTotal,
        percentage: restPercentage,
      },
    ];
  }, [categoryBreakdown]);

  // Fetch month-specific reports data
  useEffect(() => {
    const fetchMonthReports = async () => {
      try {
        setIsLoading(true);
        const [categorySpend, paymentModes, budgetPerf, summary] = await Promise.all([
          api.getCategorySpendingBreakdown(selectedYear, selectedMonth),
          api.getPaymentModeBreakdown(selectedYear, selectedMonth),
          api.getBudgetsPerformance(selectedYear, selectedMonth),
          api.getDetailedSummary(selectedYear, selectedMonth),
        ]);

        setCategoryBreakdown(categorySpend.breakdown || []);
        setPaymentModeBreakdown(paymentModes);
        setBudgetsPerformance(budgetPerf);
        setDetailedSummary(summary);
      } catch (error) {
        console.error("Error fetching month reports:", error);
        toast({
          title: "Error",
          description: "Failed to load monthly reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthReports();
  }, [selectedMonth, selectedYear]);

  // Fetch trend reports data (depends on trend period)
  useEffect(() => {
    const fetchTrendReports = async () => {
      try {
        const [iveTrends, savingsRateTrend] = await Promise.all([
          api.getIncomeVsExpenseTrends(trendMonths),
          api.getSavingsRateTrend(trendMonths),
        ]);

        setIncomeVsExpense(iveTrends);
        setSavingsRate(savingsRateTrend);
      } catch (error) {
        console.error("Error fetching trend reports:", error);
      }
    };

    fetchTrendReports();
  }, [trendMonths]);

  // Fetch static reports data (load once)
  useEffect(() => {
    const fetchStaticReports = async () => {
      try {
        const [goalsProg, topTxns, recurringTxns, anomalies, monthComp] = await Promise.all([
          api.getGoalsProgress(),
          api.getTopTransactionsReport(10, "expense"),
          api.getRecurringExpensesReport(),
          api.getSpendingAnomaliesReport(),
          api.getMonthlyComparison(),
        ]);

        setGoalsProgress(goalsProg.goals || []);
        setTopTransactions(topTxns.transactions || []);
        setRecurringExpenses(recurringTxns.recurring_expenses || []);
        setSpendingAnomalies(anomalies.anomalies || []);
        setMonthlyComparison(monthComp);
      } catch (error) {
        console.error("Error fetching static reports:", error);
      }
    };

    fetchStaticReports();
  }, []);

  // ======================== Export Functions ========================

  const exportToCSV = async (type) => {
    try {
      setExporting(true);
      const data = await api.exportToCSV(selectedYear, selectedMonth, type);
      
      // Create blob and download
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wealthwise-${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${type} exported to CSV`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      
      // Get summary data
      const summaryData = await api.getExportSummaryData(selectedYear, selectedMonth);
      
      // Import jsPDF
      const { jsPDF } = await import("jspdf");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let currentY = 18;
      
      // Set default font
      pdf.setFont("helvetica");
      
      // ==================== HEADER ====================
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235);
      pdf.setFont("helvetica", "bold");
      pdf.text("WealthWise Financial Report", 15, currentY);
      currentY += 6;
      
      // Period info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Period: ${summaryData.report_period} | Generated: ${summaryData.report_date}`, 15, currentY);
      currentY += 8;
      
      // Separator line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.line(15, currentY, pageWidth - 15, currentY);
      currentY += 8;
      
      // ==================== EXECUTIVE SUMMARY ====================
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Executive Summary", 15, currentY);
      currentY += 7;
      
      // Financial analysis
      const income = summaryData.summary.total_income;
      const expense = summaryData.summary.total_expense;
      const savings = summaryData.summary.net_savings;
      const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
      
      const topCategory = summaryData.categories.length > 0 ? summaryData.categories[0].name : "N/A";
      const topCategoryAmount = summaryData.categories.length > 0 ? summaryData.categories[0].amount : 0;
      const topCategoryPct = expense > 0 ? ((topCategoryAmount / expense) * 100).toFixed(1) : 0;
      
      // Narrative
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      let narrative = "";
      if (savings > 0) {
        narrative = `You maintained healthy finances with a ${savingsRate}% savings rate. `;
      } else if (savings < 0) {
        narrative = `Expenses exceeded income by Rs.${Math.abs(savings).toLocaleString('en-IN')}. `;
      } else {
        narrative = `Income and expenses balanced this period. `;
      }
      
      if (topCategory !== "N/A") {
        narrative += `Top spending: ${topCategory} (${topCategoryPct}% of expenses).`;
      }
      
      const lines = pdf.splitTextToSize(narrative, pageWidth - 30);
      lines.forEach(line => {
        pdf.text(line, 15, currentY);
        currentY += 4.5;
      });
      currentY += 6;
      
      // ==================== FINANCIAL METRICS ====================
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Financial Overview", 15, currentY);
      currentY += 6;
      
      const metrics = [
        { label: "Total Income", value: `Rs. ${income.toLocaleString('en-IN')}`, color: [34, 197, 94] },
        { label: "Total Expenses", value: `Rs. ${expense.toLocaleString('en-IN')}`, color: [239, 68, 68] },
        { label: "Net Savings", value: `Rs. ${savings.toLocaleString('en-IN')}`, color: savings >= 0 ? [37, 99, 235] : [220, 38, 38] },
        { label: "Savings Rate", value: `${savingsRate}%`, color: [147, 51, 234] },
      ];
      
      const cardWidth = (pageWidth - 40) / 2;
      const cardHeight = 18;
      let cardX = 15;
      
      metrics.forEach((metric, idx) => {
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, "F");
        
        pdf.setFillColor(...metric.color);
        pdf.rect(cardX, currentY, 2.5, cardHeight, "F");
        
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont("helvetica", "normal");
        pdf.text(metric.label, cardX + 6, currentY + 6);
        
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(metric.value, cardX + 6, currentY + 13);
        
        if ((idx + 1) % 2 === 0) {
          cardX = 15;
          currentY += cardHeight + 4;
        } else {
          cardX += cardWidth + 10;
        }
      });
      
      if (metrics.length % 2 !== 0) {
        currentY += cardHeight + 4;
      }
      
      currentY += 6;
      
      // Page break check
      if (currentY > pageHeight - 60) {
        pdf.addPage();
        currentY = 18;
      }
      
      // ==================== CATEGORY BREAKDOWN TABLE ====================
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text("Category-wise Spending", 15, currentY);
      currentY += 7;
      
      // Fixed column positions for proper alignment
      const colCat = 18;
      const colAmtEnd = pageWidth - 20;  // Right edge for amount
      const colPctEnd = pageWidth - 70;  // Right edge for percentage
      const rowH = 7;
      
      // Headers
      pdf.setFillColor(37, 99, 235);
      pdf.rect(15, currentY - 1, pageWidth - 30, rowH, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Category", colCat, currentY + 3.5);
      
      // Right-aligned headers
      const headerAmt = "Amount";
      const headerPct = "%";
      const amtWidth = pdf.getTextWidth(headerAmt);
      const pctWidth = pdf.getTextWidth(headerPct);
      pdf.text(headerAmt, colPctEnd - amtWidth, currentY + 3.5);
      pdf.text(headerPct, colAmtEnd - pctWidth, currentY + 3.5);
      currentY += rowH;
      
      // Rows
      pdf.setFont("helvetica", "normal");
      const validCategories = summaryData.categories.filter(cat => cat.name && cat.amount > 0);
      
      validCategories.forEach((cat, idx) => {
        pdf.setTextColor(0, 0, 0);
        
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, currentY - 1, pageWidth - 30, rowH, "F");
        
        pdf.setFontSize(9);
        pdf.text(String(cat.name), colCat, currentY + 3.5);
        
        // Right-aligned amount (bold)
        pdf.setFont("helvetica", "bold");
        const amountText = `Rs. ${cat.amount.toLocaleString('en-IN')}`;
        const amtTextWidth = pdf.getTextWidth(amountText);
        pdf.text(amountText, colPctEnd - amtTextWidth, currentY + 3.5);
        
        // Right-aligned percentage
        pdf.setFont("helvetica", "normal");
        const percentage = expense > 0 ? ((cat.amount / expense) * 100).toFixed(1) : 0;
        const pctText = `${percentage}%`;
        const pctTextWidth = pdf.getTextWidth(pctText);
        pdf.text(pctText, colAmtEnd - pctTextWidth, currentY + 3.5);
        
        currentY += rowH;
        
        if (currentY > pageHeight - 30) {
          pdf.addPage();
          currentY = 18;
        }
      });
      
      currentY += 6;
      
      // Page break check
      if (currentY > pageHeight - 60) {
        pdf.addPage();
        currentY = 18;
      }
      
      // ==================== TRANSACTIONS TABLE ====================
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Recent Transactions", 15, currentY);
      currentY += 7;
      
      // Column positions
      const txRowH = 7;
      const txColDate = 18;
      const txColCat = 48;
      const txColDesc = 80;
      const txColAmtEnd = pageWidth - 20;
      
      // Headers
      pdf.setFillColor(37, 99, 235);
      pdf.rect(15, currentY - 1, pageWidth - 30, txRowH, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Date", txColDate, currentY + 3.5);
      pdf.text("Category", txColCat, currentY + 3.5);
      pdf.text("Description", txColDesc, currentY + 3.5);
      
      const headerTxAmt = "Amount";
      const txAmtWidth = pdf.getTextWidth(headerTxAmt);
      pdf.text(headerTxAmt, txColAmtEnd - txAmtWidth, currentY + 3.5);
      currentY += txRowH;
      
      // Rows
      pdf.setFont("helvetica", "normal");
      summaryData.transactions.forEach((txn, idx) => {
        pdf.setTextColor(0, 0, 0);
        
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, currentY - 1, pageWidth - 30, txRowH, "F");
        
        pdf.setFontSize(8);
        const dateStr = String(txn.date || "-").split("T")[0];
        pdf.text(dateStr, txColDate, currentY + 3.5);
        
        // Standardize category name
        const catName = String(txn.category || "-");
        pdf.text(catName, txColCat, currentY + 3.5);
        
        // Clean description - standardize merchant names
        let desc = String(txn.description || "N/A");
        desc = desc.replace(/\s+/g, ' ').trim();  // Remove extra spaces
        desc = desc.substring(0, 26);
        pdf.text(desc, txColDesc, currentY + 3.5);
        
        // Right-aligned amount (bold)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        const amountStr = `Rs. ${txn.amount.toLocaleString('en-IN')}`;
        const txAmtTextWidth = pdf.getTextWidth(amountStr);
        pdf.text(amountStr, txColAmtEnd - txAmtTextWidth, currentY + 3.5);
        pdf.setFont("helvetica", "normal");
        
        currentY += txRowH;
        
        if (currentY > pageHeight - 25) {
          pdf.addPage();
          currentY = 18;
        }
      });
      
      // ==================== FOOTER ====================
      currentY = pageHeight - 12;
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "italic");
      const footerText = "Generated by WealthWise - Your Personal Finance Companion";
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageWidth - footerWidth) / 2, currentY);
      
      // Save PDF
      const filename = `wealthwise-report-${summaryData.report_period.replace(/ /g, '-')}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "Success",
        description: "Professional financial report exported successfully",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Error",
        description: `Failed to export PDF: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ======================== Header & Controls ======================== */}
      <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">Deep dive analytics and detailed insights</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => exportToCSV("transactions")}
            disabled={exporting}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            onClick={exportToPDF}
            disabled={exporting}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <FileText className="w-4 h-4" />
            {exporting ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* ======================== Filters ======================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trend Period (Months)</Label>
              <Select value={String(trendMonths)} onValueChange={(v) => setTrendMonths(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 12, 24].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Last {m} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Report Section</Label>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="expenses">Expense Analysis</SelectItem>
                  <SelectItem value="budgets">Budget Performance</SelectItem>
                  <SelectItem value="goals">Goals</SelectItem>
                  <SelectItem value="insights">Insights & Patterns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================== OVERVIEW SECTION ======================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {detailedSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">₹{detailedSummary.total_income.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">This period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Total Expense</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">₹{detailedSummary.total_expense.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">This period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Net Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${detailedSummary.net_savings >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                    ₹{detailedSummary.net_savings.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{detailedSummary.savings_percentage.toFixed(1)}% of income</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Avg Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">₹{detailedSummary.average_transaction.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{detailedSummary.transaction_count} transactions</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Income vs Expense Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expense Trends (Last {trendMonths} Months)</CardTitle>
              <CardDescription>Monthly comparison of income and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={incomeVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expense" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Net Savings Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Net Savings Progress</CardTitle>
              <CardDescription>Cumulative savings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={incomeVsExpense}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="net_savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavings)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Savings Rate Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Savings Rate Trend</CardTitle>
              <CardDescription>Percentage of income saved each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={savingsRate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis label={{ value: "Savings Rate (%)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                  <Bar dataKey="savings_rate_percentage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
              <CardDescription>Current month vs previous months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyComparison.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="font-semibold text-foreground">{item.month}</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Income</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-500">₹{item.income.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expense</p>
                        <p className="font-bold text-red-600 dark:text-red-500">₹{item.expense.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Savings</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-500">₹{item.net_savings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== EXPENSES SECTION ======================== */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          {/* Category Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Distribution of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ payload }) =>
                            payload?.percentage >= 5 ? `${payload.category}: ${payload.percentage}%` : ""
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          nameKey="category"
                          dataKey="total_amount"
                        >
                          {pieCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-2 max-h-72 overflow-y-auto">
                    {pieCategoryData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-medium text-sm text-foreground">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-foreground">₹{item.total_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No expense data available</p>
              )}
            </CardContent>
          </Card>

          {/* Category Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Detailed breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Total Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Percentage</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Transactions</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Avg Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                        <td className="py-3 px-4 text-foreground">{item.category}</td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">₹{item.total_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="secondary">{item.percentage}%</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">{item.transaction_count}</td>
                        <td className="py-3 px-4 text-right text-foreground">₹{item.average_transaction.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Mode Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Distribution</CardTitle>
              <CardDescription>How expenses are paid</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paymentModeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mode" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentModeBreakdown.map((item, idx) => (
                  <div key={idx} className="bg-secondary/50 p-3 rounded text-center">
                    <p className="text-xs text-muted-foreground">{item.mode}</p>
                    <p className="font-bold text-sm mt-1 text-foreground">₹{item.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Transactions</CardTitle>
              <CardDescription>Largest expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topTransactions.map((txn, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/30">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-500">{txn.category} • {txn.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">₹{txn.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{txn.payment_mode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== BUDGETS SECTION ======================== */}
      {activeTab === "budgets" && (
        <div className="space-y-6">
          {/* Budget Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetsPerformance.map((budget, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{budget.category}</CardTitle>
                    <Badge variant={budget.status === "Exceeded" ? "destructive" : budget.status === "Near Limit" ? "secondary" : "outline"}>
                      {budget.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spent</span>
                      <span className="font-bold">₹{budget.actual_spent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-bold">₹{budget.budget_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${budget.percentage_used > 100 ? "bg-red-500" : budget.percentage_used >= 80 ? "bg-yellow-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{budget.percentage_used.toFixed(1)}% Used</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Budgets</CardTitle>
              <CardDescription>Complete budget overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-right py-3 px-4 font-semibold">Spent</th>
                      <th className="text-right py-3 px-4 font-semibold">Budget</th>
                      <th className="text-right py-3 px-4 font-semibold">% Used</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetsPerformance.map((budget, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                        <td className="py-3 px-4 font-medium text-foreground">{budget.category}</td>
                        <td className="py-3 px-4 text-right text-foreground">₹{budget.actual_spent.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-foreground">₹{budget.budget_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">{budget.percentage_used.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={budget.status === "Exceeded" ? "destructive" : budget.status === "Near Limit" ? "secondary" : "outline"}>
                            {budget.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== GOALS SECTION ======================== */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          {/* Goals Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalsProgress.map((goal, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{goal.goal_name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">{goal.category}</p>
                    </div>
                    <Badge variant="outline">{goal.months_remaining} mo left</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Saved</span>
                      <span className="font-bold">₹{goal.current_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Target</span>
                      <span className="font-bold">₹{goal.target_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{goal.progress_percentage.toFixed(1)}% Complete</p>
                  <p className="text-xs text-gray-500">Deadline: {goal.deadline}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Goals Table */}
          <Card>
            <CardHeader>
              <CardTitle>Goals Summary</CardTitle>
              <CardDescription>All financial goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Goal</th>
                      <th className="text-right py-3 px-4 font-semibold">Progress</th>
                      <th className="text-right py-3 px-4 font-semibold">Saved / Target</th>
                      <th className="text-center py-3 px-4 font-semibold">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalsProgress.map((goal, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{goal.goal_name}</p>
                            <p className="text-xs text-muted-foreground">{goal.category}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">
                          <Badge>{goal.progress_percentage.toFixed(1)}%</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">₹{goal.current_amount.toLocaleString()} / ₹{goal.target_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center text-sm">{goal.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== INSIGHTS SECTION ======================== */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Recurring Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recurring Expenses Detected</CardTitle>
              <CardDescription>Expenses that appear multiple times</CardDescription>
            </CardHeader>
            <CardContent>
              {recurringExpenses.length > 0 ? (
                <div className="space-y-3">
                  {recurringExpenses.map((exp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{exp.description}</p>
                        <p className="text-xs text-gray-500">{exp.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{exp.average_amount.toLocaleString()}</p>
                        <Badge variant="outline">{exp.frequency}x</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No recurring expenses detected yet</p>
              )}
            </CardContent>
          </Card>

          {/* Spending Anomalies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Spending Anomalies
              </CardTitle>
              <CardDescription>Unusual spending patterns detected</CardDescription>
            </CardHeader>
            <CardContent>
              {spendingAnomalies.length > 0 ? (
                <div className="space-y-3">
                  {spendingAnomalies.map((anomaly, idx) => (
                    <Alert key={idx} className={anomaly.type === "High Spending" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}>
                      <AlertTriangle className={`w-4 h-4 ${anomaly.type === "High Spending" ? "text-red-600" : "text-amber-600"}`} />
                      <AlertDescription>
                        <p className="font-semibold">{anomaly.month}</p>
                        <p className="text-sm mt-1">
                          {anomaly.type === "High Spending" ? "📈" : "📉"} {anomaly.type} in {anomaly.month}: ₹{anomaly.amount.toLocaleString()}
                          <span className={anomaly.deviation_percentage > 0 ? "text-red-600" : "text-amber-600"}>
                            {" "}({anomaly.deviation_percentage > 0 ? "+" : ""}{anomaly.deviation_percentage}% from average)
                          </span>
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No spending anomalies detected</p>
              )}
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>Summary of your financial health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detailedSummary && (
                  <>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-semibold text-green-900">
                        💚 Savings: Your savings rate is {detailedSummary.savings_percentage.toFixed(1)}% of income
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">
                        📊 Transactions: Average transaction is ₹{detailedSummary.average_transaction.toLocaleString()} across {detailedSummary.category_count} categories
                      </p>
                    </div>

                    {categoryBreakdown.length > 0 && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm font-semibold text-purple-900">
                          🎯 Top Category: {categoryBreakdown[0].category} ({categoryBreakdown[0].percentage}% of spending)
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
