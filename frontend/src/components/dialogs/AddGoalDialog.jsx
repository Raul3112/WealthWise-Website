import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AddGoalDialog({ trigger, availableBalance = 0, onCreate }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    timePeriodMonths: "",
    category: "",
    priority: "medium"
  });

  const monthlySaving = useMemo(() => {
    const target = Number(formData.targetAmount) || 0;
    const months = Number(formData.timePeriodMonths) || 0;
    if (!target || !months) return 0;
    return target / months;
  }, [formData.targetAmount, formData.timePeriodMonths]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const target = Number(formData.targetAmount);
    const current = Number(formData.currentAmount) || 0;
    const months = Number(formData.timePeriodMonths);

    if (!formData.name.trim()) {
      toast({ title: "Enter a goal name", variant: "destructive" });
      return;
    }

    if (!formData.category) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      toast({ title: "Enter a target amount", variant: "destructive" });
      return;
    }

    if (target > availableBalance) {
      toast({
        title: "Amount exceeds available balance",
        description: `You can allocate up to ₹${availableBalance.toLocaleString()}.` ,
        variant: "destructive",
      });
      return;
    }

    if (current > availableBalance) {
      toast({
        title: "Upfront amount too high",
        description: `You can allocate up to ₹${availableBalance.toLocaleString()} right now.`,
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(months) || months <= 0) {
      toast({ title: "Set a time period", description: "Time period must be at least 1 month.", variant: "destructive" });
      return;
    }

    const goalPayload = {
      name: formData.name.trim(),
      targetAmount: target,
      currentAmount: current,
      timePeriodMonths: months,
      category: formData.category,
      priority: formData.priority,
      monthlySaving,
    };

    onCreate?.(goalPayload);
    toast({ title: "Goal Created", description: `"${goalPayload.name}" set for ₹${target.toLocaleString()}` });
    setOpen(false);
    setFormData({
      name: "",
      targetAmount: "",
      currentAmount: "",
      timePeriodMonths: "",
      category: "",
      priority: "medium",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="hero"><Target className="w-4 h-4 mr-2" />Add Goal</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input variant="emerald" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Emergency Fund" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Amount (₹)</Label>
              <Input variant="emerald" type="number" step="0.01" value={formData.targetAmount} onChange={(e) => setFormData({...formData, targetAmount: e.target.value})} placeholder="10000" required />
            </div>
            <div className="space-y-2">
              <Label>Current Amount (₹)</Label>
              <Input variant="emerald" type="number" step="0.01" value={formData.currentAmount} onChange={(e) => setFormData({...formData, currentAmount: e.target.value})} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time Period (months)</Label>
            <Input
              variant="emerald"
              type="number"
              min="1"
              value={formData.timePeriodMonths}
              onChange={(e) => setFormData({...formData, timePeriodMonths: e.target.value})}
              placeholder="6"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="gadget">Gadget</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 rounded-lg border p-3 bg-muted/40">
              <p className="text-sm text-muted-foreground">Suggested monthly saving</p>
              <p className="text-xl font-semibold">₹{monthlySaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Auto-calculated from target ÷ months</p>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" variant="hero" className="flex-1">Create Goal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}