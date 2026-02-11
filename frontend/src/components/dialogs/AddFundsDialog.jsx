import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AddFundsDialog({ trigger, goalName, availableBalance = 0, onAdd }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    if (amount > availableBalance) {
      toast({
        title: "Not enough available balance",
        description: `You can use up to ₹${availableBalance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    onAdd?.({
      ...formData,
      amount,
    });

    toast({ title: "Funds Added", description: `₹${amount.toLocaleString()} added${goalName ? ` to ${goalName}` : ''}` });
    setOpen(false);
    setFormData({ amount: "", date: new Date().toISOString().split('T')[0], notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="hero"><PlusCircle className="w-4 h-4 mr-2" />Add Funds</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Funds{goalName ? ` to ${goalName}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input variant="emerald" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" required />
            <p className="text-xs text-muted-foreground">Available: ₹{availableBalance.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input variant="emerald" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input variant="emerald" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes" />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" variant="hero" className="flex-1">Add Funds</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}