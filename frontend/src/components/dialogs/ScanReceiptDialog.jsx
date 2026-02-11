import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const CATEGORIES = [
  "groceries",
  "dining",
  "shopping",
  "transportation",
  "entertainment",
  "utilities",
  "health",
  "bills",
  "other"
];

export function ScanReceiptDialog({ trigger, onReceiptScanned }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      try {
        console.log(">>> OCR: Starting receipt upload and creation");
        const result = await api.scanReceipt(file);
        console.log(">>> OCR: Backend response:", result);
        console.log(">>> OCR: Response type:", typeof result);
        console.log(">>> OCR: result.transaction:", result?.transaction);
        
        if (result?.transaction) {
          console.log(">>> OCR: Transaction created directly with source:", result.transaction.source);
          
          // Show success and close
          toast({ 
            title: "Receipt Scanned & Saved", 
            description: result.message || `Transaction created: ₹${result.transaction.amount}`
          });
          
          setOpen(false);
          setScannedData(null);
          fileInputRef.current.value = "";
          
          // Trigger parent callback if available
          if (onReceiptScanned) {
            onReceiptScanned(result.transaction);
          }
        } else {
          console.error(">>> OCR: No transaction in response:", result);
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

  const handleSave = () => {
    if (scannedData) {
      if (!scannedData.category) {
        toast({ 
          title: "Category Required", 
          description: "Please select a category before proceeding.",
          variant: "destructive"
        });
        return;
      }
      
      // Call the callback with the scanned data
      console.log(">>> OCR: ScanReceiptDialog handleSave called, onReceiptScanned callback exists:", !!onReceiptScanned);
      if (onReceiptScanned) {
        const dataToPass = {
          title: scannedData.vendor,
          amount: parseFloat(scannedData.amount),
          category: scannedData.category,
          date: scannedData.date,
          account: "cash"
        };
        console.log(">>> OCR: Calling onReceiptScanned callback with data:", dataToPass);
        onReceiptScanned(dataToPass);
      }
      
      toast({ 
        title: "Receipt Data Loaded", 
        description: `₹${scannedData.amount} from ${scannedData.vendor}` 
      });
      setOpen(false);
      setScannedData(null);
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="hero"><Camera className="w-4 h-4 mr-2" />Scan Receipt</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan Receipt (OCR)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*,.pdf" 
            onChange={handleFileUpload} 
            className="hidden" 
            disabled={scanning}
          />
          
          {!scannedData && !scanning && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Upload a receipt image or PDF</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                >
                  <Upload className="w-4 h-4 mr-2" />Upload File
                </Button>
              </div>
            </div>
          )}

          {scanning && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin mb-4" />
              <p className="text-muted-foreground">Processing receipt... This may take a moment</p>
            </div>
          )}

          {scannedData && !scanning && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-sm text-emerald-600 font-medium mb-2">✓ Extracted Data:</p>
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input 
                  variant="emerald" 
                  value={scannedData.vendor} 
                  onChange={(e) => setScannedData({...scannedData, vendor: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input 
                  variant="emerald" 
                  type="number"
                  step="0.01"
                  value={scannedData.amount} 
                  onChange={(e) => setScannedData({...scannedData, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  variant="emerald" 
                  type="date" 
                  value={scannedData.date} 
                  onChange={(e) => setScannedData({...scannedData, date: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={scannedData.category || ""} 
                  onValueChange={(value) => setScannedData({...scannedData, category: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setScannedData(null);
                    fileInputRef.current.value = "";
                  }} 
                  className="flex-1"
                >
                  Rescan
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleSave} 
                  className="flex-1"
                >
                  Use This Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}