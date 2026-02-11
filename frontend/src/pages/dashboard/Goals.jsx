import { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Calendar, Wallet, Sparkles, CheckCircle2, Trash2, Edit2, AlertCircle, TrendingDown, PiggyBank } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { AddFundsDialog } from "@/components/dialogs/AddFundsDialog";
import { api } from "@/lib/api";

const CATEGORY_META = {
  emergency: { icon: "🛡️", color: "hsl(160, 84%, 39%)" },
  travel: { icon: "✈️", color: "hsl(200, 84%, 50%)" },
  education: { icon: "📚", color: "hsl(45, 93%, 47%)" },
  gadget: { icon: "🎧", color: "hsl(280, 84%, 50%)" },
  home: { icon: "🏠", color: "hsl(20, 84%, 55%)" },
  other: { icon: "🎯", color: "hsl(220, 13%, 60%)" },
};

const initialActiveGoals = [
  { id: 1, name: "Emergency Fund", category: "emergency", targetAmount: 10000, saved: 8000, timeframeMonths: 6, deadline: "2025-06-01" },
  { id: 2, name: "Travel Reserve", category: "travel", targetAmount: 8000, saved: 5000, timeframeMonths: 5, deadline: "2025-05-15" },
];

const initialCompletedGoals = [
  { id: 4, name: "Laptop Upgrade", category: "gadget", targetAmount: 80000, saved: 80000, timeframeMonths: 10, deadline: "2024-12-01", completedOn: "Jan 2025" },
];

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

const getMonthsRemaining = (deadline) => {
  if (!deadline) return 0;
  const end = new Date(deadline).getTime();
  const now = Date.now();
  if (Number.isNaN(end) || end <= now) return 0;
  return Math.max(0, Math.ceil((end - now) / ONE_MONTH_MS));
};

export default function Goals() {
  const outletCtx = useOutletContext?.() || {};
  const { triggerRefresh } = outletCtx;

  const [incomeTotal] = useState(50000);
  const [expenseTotal] = useState(32000);
  const [activeGoals, setActiveGoals] = useState([]);
  const [completedGoals, setCompletedGoals] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const data = await api.getGoals();
        const allGoals = data.goals || [];
        const now = new Date();
        const active = allGoals.filter(g => new Date(g.deadline) > now && g.current_amount < g.target_amount);
        const completed = allGoals.filter(g => g.current_amount >= g.target_amount);
        setActiveGoals(active);
        setCompletedGoals(completed);
        setAvailableBalance(data.available_balance || 0);
      } catch (error) {
        console.error("Failed to fetch goals:", error);
        toast({ title: "Error fetching goals", description: error.message, variant: "destructive" });
      }
    };
    
    fetchGoals();
    
    // Polling: refetch every 5 seconds to catch updates (reduced frequency to prevent blinking)
    const pollInterval = setInterval(fetchGoals, 5000);
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const totals = useMemo(() => {
    const saved = activeGoals.reduce((acc, g) => acc + g.current_amount, 0);
    const target = activeGoals.reduce((acc, g) => acc + g.target_amount, 0);
    return { saved, target };
  }, [activeGoals]);

  const derivedAvailableBalance = useMemo(() => {
    return availableBalance;
  }, [availableBalance]);

  const statusToneClass = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    destructive: "bg-destructive/10 text-destructive border-destructive/40",
  };

  const paceStatus = (goal, monthsRemaining) => {
    if (goal.current_amount >= goal.target_amount) return { label: "Completed", tone: "emerald" };
    const progress = goal.target_amount ? goal.current_amount / goal.target_amount : 0;
    const totalMonths = monthsRemaining || 1;
    const elapsedMonths = Math.max(totalMonths - monthsRemaining, 0);
    const timeProgress = totalMonths ? elapsedMonths / totalMonths : 0;
    const pace = timeProgress > 0 ? progress / timeProgress : progress;

    if (pace >= 1) return { label: "On Track", tone: "emerald" };
    if (pace >= 0.75) return { label: "Slightly Behind", tone: "amber" };
    return { label: "At Risk", tone: "destructive" };
  };

  const handleAddGoal = async (goalPayload) => {
    try {
      const deadlineDate = new Date();
      deadlineDate.setMonth(deadlineDate.getMonth() + goalPayload.timePeriodMonths);

      const response = await api.createGoal({
        name: goalPayload.name,
        category: goalPayload.category,
        target_amount: goalPayload.targetAmount,
        current_amount: goalPayload.currentAmount || 0,
        deadline: deadlineDate.toISOString().split("T")[0],
        notes: goalPayload.notes || "",
      });

      setActiveGoals((prev) => [...prev, response]);
      setAvailableBalance(availableBalance - goalPayload.targetAmount);
      toast({ title: "Goal created successfully!" });
    } catch (error) {
      toast({ title: "Error creating goal", description: error.message, variant: "destructive" });
    }
  };

  const handleAddSavings = async (goalId, payload) => {
    try {
      await api.addSavingsToGoal(goalId, {
        amount: payload.amount,
        date: payload.date,
        notes: payload.notes || "",
      });

      const data = await api.getGoals();
      const allGoals = data.goals || [];
      const now = new Date();
      const active = allGoals.filter(g => new Date(g.deadline) > now && g.current_amount < g.target_amount);
      const completed = allGoals.filter(g => g.current_amount >= g.target_amount);
      
      setActiveGoals(active);
      setCompletedGoals(completed);
      setAvailableBalance(data.available_balance || 0);
      toast({ title: "Funds added successfully!" });
      
      // Trigger dashboard refresh
      console.log("[Goals] Triggering refresh after adding funds");
      triggerRefresh?.();
    } catch (error) {
      toast({ title: "Error adding funds", description: error.message, variant: "destructive" });
    }
  };

  const handleEditGoal = async (goalId, updatedData) => {
    try {
      await api.updateGoal(goalId, {
        name: updatedData.name,
        target_amount: updatedData.targetAmount,
        deadline: updatedData.deadline,
      });
      
      const data = await api.getGoals();
      const allGoals = data.goals || [];
      const now = new Date();
      const active = allGoals.filter(g => new Date(g.deadline) > now && g.current_amount < g.target_amount);
      const completed = allGoals.filter(g => g.current_amount >= g.target_amount);
      
      setActiveGoals(active);
      setCompletedGoals(completed);
      toast({ title: "Goal updated", description: "Changes saved successfully." });
    } catch (error) {
      toast({ title: "Error updating goal", description: error.message, variant: "destructive" });
    }
  };

  // Confirmation dialog state for delete
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const handleDeleteGoal = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteGoal(confirmDeleteId);
      // Refresh goals to update available balance
      const data = await api.getGoals();
      const allGoals = data.goals || [];
      const now = new Date();
      const active = allGoals.filter(g => new Date(g.deadline) > now && g.current_amount < g.target_amount);
      const completed = allGoals.filter(g => g.current_amount >= g.target_amount);
      setActiveGoals(active);
      setCompletedGoals(completed);
      setAvailableBalance(data.available_balance || 0);
      toast({ title: "Goal deleted", description: "Goal removed and balance freed up!" });
    } catch (error) {
      toast({ title: "Error deleting goal", description: error.message, variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const isOverdue = (deadline) => {
    const end = new Date(deadline).getTime();
    return Date.now() > end;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Goals</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Step 4: Allocate Goals</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Data-driven goals with a clear, review-ready summary.</p>
        </div>
        <AddGoalDialog
          availableBalance={derivedAvailableBalance}
          onCreate={handleAddGoal}
          trigger={<Button variant="hero">+ Add New Goal</Button>}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Goal Amount */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Goal Amount</p>
                <p className="text-2xl font-bold mt-1">₹{totals.target.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">All goals combined</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Saved Towards Goals */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Saved</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totals.saved.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Progress towards goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress % */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Overall Progress</p>
                <p className="text-2xl font-bold mt-1">{totals.target > 0 ? ((totals.saved / totals.target) * 100).toFixed(1) : 0}%</p>
              </div>
              <Progress value={totals.target > 0 ? Math.min((totals.saved / totals.target) * 100, 100) : 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Goals Completed */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                <p className="text-2xl font-bold text-primary mt-1">{completedGoals.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Goals achieved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{activeGoals.length}</p>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Active Goals</CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5">Add savings, watch progress, and spot risk early.</p>
            <p className="text-xs text-muted-foreground mt-1">₹{totals.saved.toLocaleString()} saved of ₹{totals.target.toLocaleString()} planned</p>
          </div>
          <Badge variant="outline">{activeGoals.length} active</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {activeGoals.length === 0 ? (
            <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
              No active goals yet. Start by creating one to make progress visible.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {activeGoals.map((goal) => {
                const monthsRemaining = getMonthsRemaining(goal.deadline) ?? 0;
                const meta = CATEGORY_META[goal.category] || CATEGORY_META.other;
                const icon = meta.icon;
                const color = meta.color;
                const overfunded = goal.target_amount ? goal.current_amount > goal.target_amount : false;
                const progress = goal.target_amount ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                const status = paceStatus(goal, monthsRemaining);
                const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
                const monthlyNeeded = goal.target_amount ? Math.ceil(remaining / Math.max(monthsRemaining, 1)) : 0;
                const overdue = isOverdue(goal.deadline) && remaining > 0;

                return (
                  <Card key={goal.id} variant="ghost" className="border-muted/60 hover:border-muted transition-all">
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg truncate">{goal.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {monthsRemaining} months left • {goal.deadline}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                          {overdue && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0.5">
                              <AlertCircle className="w-3 h-3 mr-1" /> Overdue
                            </Badge>
                          )}
                          <Badge variant="outline" className={`${statusToneClass[status.tone] || ""} capitalize text-xs px-2 py-0.5`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-2">
                        <div>
                          <p className="text-3xl font-bold">₹{goal.current_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-1">of ₹{goal.target_amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: `${color}15`, color }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {overfunded && (
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                          <Sparkles className="w-3.5 h-3.5" />
                          Overfunded by ₹{(goal.current_amount - goal.target_amount).toLocaleString()}
                        </div>
                      )}

                      {!overfunded && monthlyNeeded > 0 && (
                        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2.5 rounded-lg border border-muted">
                          💡 Save <span className="font-semibold text-foreground">₹{monthlyNeeded.toLocaleString()}/month</span> to stay on track
                        </div>
                      )}

                      <Progress value={progress} className="h-2.5" />

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          ₹{remaining.toLocaleString()} remaining
                        </span>
                        <div className="flex gap-1.5">
                          <AddFundsDialog
                            goalName={goal.name}
                            availableBalance={derivedAvailableBalance}
                            onAdd={(payload) => handleAddSavings(goal.id, payload)}
                            trigger={<Button variant="outline" size="sm" className="h-8 px-3 text-xs">+ Add</Button>}
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                              <DialogHeader>
                                <DialogTitle>Edit Goal</DialogTitle>
                              </DialogHeader>
                              <EditGoalForm 
                                goal={goal} 
                                onSave={(data) => { 
                                  handleEditGoal(goal.id, data);
                                  document.querySelector('[data-state="open"]')?.click();
                                }} 
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDeleteId(goal.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                              {/* Confirm Delete Dialog (render once, outside map) */}
                              <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Goal?</DialogTitle>
                                  </DialogHeader>
                                  <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleDeleteGoal}>Delete</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Completed Goals</CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5">Celebrate wins and keep them visible in reviews.</p>
          </div>
          <Badge variant="outline">{completedGoals.length} completed</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {completedGoals.length === 0 ? (
            <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Completed goals will appear here with a 🎉 badge.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGoals.map((goal) => (
                <Card key={goal.id} variant="ghost" className="border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/60 transition-all">
                  <CardContent className="p-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-white shadow-sm flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2 truncate">
                          {goal.name} <span className="text-base">🎉</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ₹{goal.current_amount.toLocaleString()} saved • {goal.completedOn || "Completed"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-2 py-0.5 flex-shrink-0">
                      Done
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditGoalForm({ goal, onSave }) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount);
  const [deadline, setDeadline] = useState(goal.deadline);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Enter a goal name", variant: "destructive" });
      return;
    }
    
    const target = Number(targetAmount);
    if (!target || target <= 0) {
      toast({ title: "Enter a valid target amount", variant: "destructive" });
      return;
    }
    
    if (!deadline) {
      toast({ title: "Select a deadline", variant: "destructive" });
      return;
    }
    
    onSave({ name: name.trim(), targetAmount: target, deadline });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Goal Name</Label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Emergency Fund"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Target Amount (₹)</Label>
        <Input 
          type="number" 
          value={targetAmount} 
          onChange={(e) => setTargetAmount(e.target.value)} 
          placeholder="10000"
          min="1"
          step="100"
        />
      </div>
      <div className="space-y-2">
        <Label>Deadline</Label>
        <Input 
          type="date" 
          value={deadline} 
          onChange={(e) => setDeadline(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="button" variant="hero" onClick={handleSubmit} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
