import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import {
  getSuppliers,
  getPurchaseInvoices,
  saveSupplierPayment,
  getNextSupplierPaymentNumber,
  type Supplier,
  type PurchaseInvoice,
  r2,
} from "@/utils/localStore";
import {
  Loader2,
  DollarSign,
  Building2,
  Calendar,
  FileText,
  Receipt,
  Landmark,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";

export interface SupplierPaymentModalProps {
  open: boolean;
  onClose: () => void;
  defaultSupplierId?: string;
  defaultInvoiceId?: string;
  onSuccess?: () => void;
}

export type PaymentMode = "Bank Transfer" | "Cash" | "Cheque" | "MFS/Bkash";

export function SupplierPaymentModal({
  open,
  onClose,
  defaultSupplierId,
  defaultInvoiceId,
  onSuccess,
}: SupplierPaymentModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [voucherNumber, setVoucherNumber] = useState<string>("");
  
  // Conditional payment method fields
  const [bankName, setBankName] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [chequeNo, setChequeNo] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [mfsProvider, setMfsProvider] = useState<string>("bKash");

  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const refreshed = getSuppliers();
      setSuppliers(refreshed);
      const hamko = refreshed.find((s) => s.name && s.name.toLowerCase().includes("hamko")) || refreshed[0];
      const targetSupId = defaultSupplierId || hamko?.id || "";
      setSupplierId(targetSupId);
      
      const allInvoices = getPurchaseInvoices().filter((inv) => inv.supplier_id === targetSupId);
      setInvoices(allInvoices);

      const targetInv = defaultInvoiceId
        ? allInvoices.find((i) => i.id === defaultInvoiceId)
        : null;

      setSelectedInvoiceId(targetInv ? targetInv.id : "");
      setAmount(targetInv && targetInv.due_amount > 0 ? targetInv.due_amount : "");
      
      // Auto-assign clean sequential voucher number
      const nextVoucher = getNextSupplierPaymentNumber();
      setVoucherNumber(nextVoucher);

      setReferenceNo("");
      setBankName("");
      setChequeNo("");
      setChequeDate("");
      setTransactionId("");
      setMfsProvider("bKash");
      setNotes("");
      setPaymentMode("Bank Transfer");
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultSupplierId, defaultInvoiceId]);

  // When supplier changes, update invoice list
  useEffect(() => {
    if (supplierId) {
      const supInvoices = getPurchaseInvoices().filter((inv) => inv.supplier_id === supplierId);
      setInvoices(supInvoices);
    } else {
      setInvoices([]);
    }
  }, [supplierId]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const currentPayable = Number(selectedSupplier?.current_payable || 0);

  function handlePayFull() {
    if (currentPayable > 0) {
      setAmount(currentPayable);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!supplierId || !selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    const payAmount = r2(Number(amount));
    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }

    setSaving(true);
    try {
      // Determine primary sequential voucher ID (PAY-XXXX)
      const finalVoucherNumber = voucherNumber && /^PAY-\d{4}$/i.test(voucherNumber)
        ? voucherNumber
        : getNextSupplierPaymentNumber();

      // Compile any cash memo or reference into remarks if provided
      let finalNotes = notes.trim();
      if (paymentMode === "Cash" && referenceNo.trim()) {
        const cashRefNote = `Cash Memo / Ref: ${referenceNo.trim()}`;
        finalNotes = finalNotes ? `${finalNotes} (${cashRefNote})` : cashRefNote;
      }

      saveSupplierPayment({
        payment_number: finalVoucherNumber,
        reference_no: finalVoucherNumber,
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        amount: payAmount,
        payment_mode: paymentMode,
        payment_type: "Payment",
        bank_name: (paymentMode === "Bank Transfer" || paymentMode === "Cheque") ? bankName.trim() || null : null,
        cheque_no: paymentMode === "Cheque" ? (chequeNo.trim() || null) : null,
        cheque_date: paymentMode === "Cheque" ? (chequeDate || null) : null,
        transaction_id: (paymentMode === "Bank Transfer" || paymentMode === "MFS/Bkash")
          ? (transactionId.trim() || referenceNo.trim() || null)
          : null,
        payment_date: paymentDate,
        notes: finalNotes || null,
        invoice_id: selectedInvoiceId || undefined,
        chalan_id: selectedInvoiceId || undefined,
      });

      toast.success(
        `Payment ${finalVoucherNumber} of ${formatBDT(payAmount)} (${paymentMode}) to ${selectedSupplier.name} recorded successfully.`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record Supplier Payment" size="md">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Voucher ID & Supplier Header */}
        <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Voucher No:</span>
            <span className="font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
              {voucherNumber || "PAY-...."}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            Sequential Auto-Increment
          </span>
        </div>
        {/* Supplier Selector */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            <Building2 className="h-4 w-4 text-primary" />
            Supplier
          </Label>
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full"
            required
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {selectedSupplier && (
            <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-md border mt-1">
              <span className="text-muted-foreground">Current Outstanding Payable:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatBDT(currentPayable)}
                </span>
                {currentPayable > 0 && (
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Pay Full Due
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Optional Specific Invoice Allocation */}
        {invoices.length > 0 && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-xs">
              <Receipt className="h-4 w-4 text-primary" />
              Apply Payment To (Optional)
            </Label>
            <Select
              value={selectedInvoiceId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedInvoiceId(val);
                if (val) {
                  const targetInv = invoices.find((i) => i.id === val);
                  if (targetInv && targetInv.due_amount > 0) {
                    setAmount(targetInv.due_amount);
                  }
                }
              }}
              className="w-full text-xs font-mono"
            >
              <option value="">Auto-allocate sequentially (FIFO to oldest unpaid chalans)</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} ({inv.invoice_date}) - Total: ৳{inv.total_amount} | Due: ৳{inv.due_amount} ({inv.status})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Amount Paid */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            <DollarSign className="h-4 w-4 text-primary" />
            Amount Paid (৳)
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="font-mono text-base font-semibold"
            required
          />
        </div>

        {/* Payment Mode Selector: [Bank Transfer, Cash, Cheque, MFS/Bkash] */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            {paymentMode === "Bank Transfer" && <Landmark className="h-4 w-4 text-primary" />}
            {paymentMode === "Cash" && <Banknote className="h-4 w-4 text-primary" />}
            {paymentMode === "Cheque" && <CreditCard className="h-4 w-4 text-primary" />}
            {paymentMode === "MFS/Bkash" && <Smartphone className="h-4 w-4 text-primary" />}
            Payment Mode
          </Label>
          <Select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
            className="w-full font-medium"
          >
            <option value="Bank Transfer">Bank Transfer (EFT / RTGS / NPSB)</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="MFS/Bkash">MFS/Bkash</option>
          </Select>
        </div>

        {/* CONDITIONAL FIELDS BASED ON PAYMENT MODE */}
        {paymentMode === "Bank Transfer" && (
          <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-primary" />
              Bank Transfer Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bank Name</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. City Bank / BRAC Bank / Dutch-Bangla"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bank Txn ID / Transfer Ref</Label>
                <Input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. TXN_982140 / EFT Ref"
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMode === "Cheque" && (
          <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Cheque Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bank Name</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Islami Bank / Standard Chartered"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cheque Number</Label>
                <Input
                  type="text"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="e.g. CHQ-890214"
                  className="text-xs font-mono font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cheque Date (Optional)</Label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMode === "MFS/Bkash" && (
          <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Mobile Financial Service (MFS) Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">MFS Provider</Label>
                <Select
                  value={mfsProvider}
                  onChange={(e) => setMfsProvider(e.target.value)}
                  className="text-xs"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket (DBBL)</option>
                  <option value="Upay">Upay</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">MFS Transaction ID (TrxID)</Label>
                <Input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TrxID 9K38LA87"
                  className="text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMode === "Cash" && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-xs">
              <FileText className="h-4 w-4 text-primary" />
              Cash Receipt / Memo No (Optional)
            </Label>
            <Input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. CSH-MEMO-01"
              className="text-xs font-mono"
            />
          </div>
        )}

        {/* Payment Date */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Payment Date
          </Label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        {/* Remarks / Notes */}
        <div className="space-y-1.5">
          <Label className="font-medium">Remarks / Description</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Payment towards September procurement invoice..."
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !supplierId} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Confirm Payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default SupplierPaymentModal;
