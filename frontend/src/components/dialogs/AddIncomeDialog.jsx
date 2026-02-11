import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_STORAGE_KEY = "ww:last-income";

const todayStr = () => new Date().toISOString().slice(0, 10);
const sourceOptions = [
  "Salary",
  "Freelance",
  "Bonus",
  "Rent",
  "Reimbursement",
  "Payout",
  "Other",
];

export function AddIncomeDialog({
  trigger,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  allowUsePrevious = false,
  onSubmit,
  onUsePrevious,
  previousIncome = null,
  loading = false,
  showTrigger = true,
  storageKey,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [formData, setFormData] = useState(() => ({
    amount: "",
    frequency: "monthly",
    source: "",
    note: "",
    receivedDate: todayStr(),
  }));
  const [lastIncome, setLastIncome] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (value) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const resolvedStorageKey = storageKey || DEFAULT_STORAGE_KEY;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(resolvedStorageKey);
      if (stored) {
        setLastIncome(JSON.parse(stored));
      }
    } catch (err) {
      // Local storage unavailable; continue without prefill support.
      console.warn("Unable to load previous income", err);
    }
  }, [resolvedStorageKey]);

  useEffect(() => {
    if (previousIncome && previousIncome.amount !== undefined) {
      setLastIncome({
        amount: previousIncome.amount,
        frequency: previousIncome.income_type || previousIncome.frequency || "monthly",
        source: previousIncome.source || "",
        note: previousIncome.note || "",
        receivedDate: previousIncome.received_date || todayStr(),
      });
    }
  }, [previousIncome]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountValue = parseFloat(formData.amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      toast({ title: "Enter a positive amount", description: "Income must be greater than zero" });
      return;
    }

    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit({
          amount: amountValue,
          income_type: formData.frequency,
          source: formData.source || null,
          note: formData.note || null,
          received_date: formData.receivedDate || null,
        });
        setOpen(false);
        setFormData({ amount: "", frequency: "monthly", source: "", note: "", receivedDate: todayStr() });
      } catch (err) {
        const desc = err?.message || "Unable to save income. Please try again.";
        toast({ title: "Income not saved", description: desc });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Fallback local-only behavior if no onSubmit provided
    toast({ title: "Income Added", description: `₹${amountValue.toFixed(2)} (${formData.frequency})` });
    try {
      localStorage.setItem(resolvedStorageKey, JSON.stringify(formData));
      setLastIncome(formData);
    } catch (err) {
      console.warn("Unable to save income", err);
    }
    onSubmit?.(formData);
    setOpen(false);
    setFormData({ amount: "", frequency: "monthly", source: "", note: "", receivedDate: todayStr() });
  };

  const applyPreviousIncome = async () => {
    if (!lastIncome && !onUsePrevious) return;
    if (onUsePrevious) {
      try {
        setIsSubmitting(true);
        await onUsePrevious();
        setOpen(false);
      } catch (err) {
        const desc = err?.message || "Unable to reuse previous income.";
        toast({ title: "Action failed", description: desc });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setFormData({
      ...lastIncome,
      amount: lastIncome.amount ?? "",
      frequency: lastIncome.frequency || "monthly",
      source: lastIncome.source || "",
      note: lastIncome.note || "",
      receivedDate: lastIncome.receivedDate || todayStr(),
    });
    toast({
      title: "Loaded previous income",
      description: `₹${lastIncome.amount} (${lastIncome.frequency}${lastIncome.source ? ` • ${lastIncome.source}` : ""})`,
    });
  };

  const hasPrevious = Boolean(lastIncome) || Boolean(onUsePrevious);
  const isBusy = loading || isSubmitting;

  const summaryLine = useMemo(() => {
    if (!formData.amount) return "";
    const parts = [
      `₹${formData.amount || 0}`,
      formData.frequency,
      formData.source || null,
      formData.receivedDate ? `on ${formData.receivedDate}` : null,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [formData.amount, formData.frequency, formData.source, formData.receivedDate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger || <Button variant="hero"><Plus className="w-4 h-4 mr-2" />Add Income</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {allowUsePrevious && (
            <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
              <div>
                <p className="text-sm font-medium">Use previous income</p>
                <p className="text-xs text-muted-foreground">
                  {lastIncome
                    ? `Last: ₹${lastIncome.amount} (${lastIncome.frequency}${lastIncome?.source ? ` • ${lastIncome.source}` : ""})`
                    : "One-tap fill from your last entry."}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={applyPreviousIncome} disabled={!hasPrevious || isBusy}>
                Same as previous
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label>Income Amount (₹)</Label>
            <Input
              variant="emerald"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
              disabled={isBusy}
            />
          </div>
          <div className="space-y-2">
            <Label>Income Source</Label>
            <Select
              value={formData.source || ""}
              onValueChange={(v) => setFormData({ ...formData, source: v })}
              disabled={isBusy}
            >
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt} value={opt.toLowerCase()}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Income Frequency</Label>
            <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })} disabled={isBusy}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Received Date</Label>
            <Input
              type="date"
              value={formData.receivedDate}
              onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
              max={todayStr()}
              disabled={isBusy}
            />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="E.g., Project Phoenix payout"
              disabled={isBusy}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" variant="hero" className="flex-1" disabled={isBusy}>
              {isBusy ? "Saving..." : "Add Income"}
            </Button>
          </div>
          {summaryLine && (
            <p className="text-xs text-muted-foreground">Will log: {summaryLine}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}