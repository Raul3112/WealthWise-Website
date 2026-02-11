import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ScanReceiptDialog } from "./ScanReceiptDialog";

export function AddExpenseDialog({ trigger, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [categories, setCategories] = useState([]);
  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "",
    account: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    source: "manual"
  });

  // Get user ID from Supabase auth
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open && userId) {
      const fetchCategories = async () => {
        try {
          const data = await api.getCategories(userId);
          setCategories(data.all || []);
        } catch (err) {
          console.error("Failed to fetch categories:", err);
          toast({ 
            title: "Warning", 
            description: "Using default categories", 
            variant: "default" 
          });
        }
      };
      fetchCategories();
    }
  }, [open, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.amount || !formData.category) {
      toast({ 
        title: "Missing Fields", 
        description: "Please fill in title, amount, and category",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(">>> OCR: Submitting transaction with data:", {
        amount: parseFloat(formData.amount),
        txn_type: "expense",
        category: formData.category,
        description: formData.title,
        payment_mode: formData.account || "cash",
        txn_date: formData.date,
        source: formData.source
      });
      
      // Create transaction via API
      await api.createTransaction({
        amount: parseFloat(formData.amount),
        txn_type: "expense",
        category: formData.category,
        description: formData.title,
        payment_mode: formData.account || "cash",
        txn_date: formData.date,
        source: formData.source
      });

      toast({ 
        title: "Expense Added", 
        description: `-$${formData.amount} - ${formData.title}` 
      });
      
      setOpen(false);
      resetForm();
      
      // Call the callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to create transaction:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: "", 
      amount: "", 
      category: "", 
      account: "", 
      date: new Date().toISOString().split('T')[0], 
      notes: "",
      source: "manual"
    });
  };

  const handleReceiptScanned = (scannedData) => {
    // Force cache bust: 2026-01-18-14:10
    console.log(">>> OCR: Receipt scanned callback received:", scannedData);
    // Populate form with scanned data
    const newFormData = {
      title: scannedData.title,
      amount: scannedData.amount.toString(),
      category: scannedData.category,
      account: scannedData.account,
      date: scannedData.date,
      notes: "",
      source: "ocr" // CRITICAL: Mark this transaction as OCR-scanned
    };
    console.log(">>> OCR: Setting form data with source='ocr':", newFormData);
    setFormData(newFormData);
    // Switch to manual tab to show populated form
    setActiveTab("manual");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="destructive"><Minus className="w-4 h-4 mr-2" />Add Expense</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="scan">Scan Receipt</TabsTrigger>
          </TabsList>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  variant="emerald" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="What did you spend on?" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input 
                  variant="emerald" 
                  type="number" 
                  step="0.01" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  placeholder="0.00" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="groceries">Groceries</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="dining">Dining Out</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={formData.account} onValueChange={(v) => setFormData({...formData, account: v})}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking Account</SelectItem>
                    <SelectItem value="savings">Savings Account</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  variant="emerald" 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="hero" className="flex-1">Add Expense</Button>
              </div>
            </form>
          </TabsContent>

          {/* Scan Receipt Tab */}
          <TabsContent value="scan">
            <div className="space-y-4">
              <ScanReceiptDialog 
                trigger={<Button variant="hero" className="w-full"><Camera className="w-4 h-4 mr-2" />Upload Receipt</Button>}
                onReceiptScanned={(data) => {
                  console.log(">>> OCR: Callback received in AddExpenseDialog, calling handleReceiptScanned with:", data);
                  handleReceiptScanned(data);
                }}
              />
              <p className="text-sm text-muted-foreground">After scanning, the form will be filled with extracted data. You can review and edit before saving.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}