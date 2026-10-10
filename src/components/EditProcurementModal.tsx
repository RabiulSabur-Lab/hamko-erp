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
  updatePurchaseInvoice,
  updateSupplierPayment,
  type PurchaseInvoice,
  type SupplierPayment,
  r2,
} from "@/utils/localStore";
import {
  FileText,
  DollarSign,
  RotateCcw,
  Calendar,
  Building2,
  Landmark,
  CreditCard,
  Smartphone,
  Save,
  Loader2,
} from "lucide-react";

export type EditItemType = "invoice" | "payment" | "debit_note";

export interface EditProcurementItem {
  type: EditItemType;
  invoice?: PurchaseInvoice;
  payment?: SupplierPayment;
}

export interface EditProcurementModalProps {
  open: boolean;
  onClose: () => void;
  item: EditProcurementItem | null;
  onSuccess: () => void;
}

export function EditProcurementModal({
  open,
  onClose,
  item,
  onSuccess,
}: EditProcurementModalProps) {
  const [saving, setSaving] = useState(false);

  // Common fields
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");

  // Invoice-specific fields
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Payment-specific fields
  const [voucherNumber, setVoucherNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("Bank Transfer");
  const [bankName, setBankName] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [transactionId, setTransactionId] = useState("");

  // Debit Note-specific fields
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open || !item) return;

    if (item.type === "invoice" && item.invoice) {
      const inv = item.invoice;
      setDate(inv.invoice_date || (inv.created_at ? inv.created_at.slice(0, 10) : ""));
      setAmount(inv.total_amount || 0);
      setInvoiceNumber(inv.invoice_number || "");
      setNotes(inv.notes || "");
    } else if (item.type === "payment" && item.payment) {
      const pay = item.payment;
      setDate(pay.payment_date || (pay.created_at ? pay.created_at.slice(0, 10) : ""));
      setAmount(pay.amount || 0);
      setVoucherNumber(pay.payment_number || pay.reference_no || "");
      setPaymentMode(pay.payment_mode || "Bank Transfer");
      setBankName(pay.bank_name || "");
      setChequeNo(pay.cheque_no || "");
      setChequeDate(pay.cheque_date || "");
      setTransactionId(pay.transaction_id || "");
      setNotes(pay.notes || "");
    } else if (item.type === "debit_note" && item.payment) {
      const dn = item.payment;
      setDate(dn.payment_date || (dn.created_at ? dn.created_at.slice(0, 10) : ""));
      setAmount(dn.amount || 0);
      setVoucherNumber(dn.reference_no || dn.payment_number || "");
      setReason(dn.reason || dn.notes || "");
      setNotes(dn.notes || dn.reason || "");
    }
  }, [open, item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = r2(Number(amount));

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (!date) {
      toast.error("Please enter a valid date");
      return;
    }

    setSaving(true);
    try {
      if (item.type === "invoice" && item.invoice) {
        const res = updatePurchaseInvoice(item.invoice.id, {
          invoice_date: date,
          invoice_number: invoiceNumber.trim() || item.invoice.invoice_number,
          total_amount: numAmount,
          notes: notes.trim() || undefined,
        });

        if (res) {
          toast.success(`Purchase Chalan ${res.invoice_number} updated successfully.`);
          onSuccess();
          onClose();
        } else {
          toast.error("Failed to update purchase chalan.");
        }
      } else if (item.type === "payment" && item.payment) {
        const res = updateSupplierPayment(item.payment.id, {
          payment_date: date,
          amount: numAmount,
          payment_mode: paymentMode,
          bank_name: (paymentMode === "Bank Transfer" || paymentMode === "Cheque") ? bankName.trim() || null : null,
          cheque_no: paymentMode === "Cheque" ? chequeNo.trim() || null : null,
          cheque_date: paymentMode === "Cheque" ? chequeDate || null : null,
          transaction_id: (paymentMode === "Bank Transfer" || paymentMode === "MFS/Bkash") ? transactionId.trim() || null : null,
          notes: notes.trim() || null,
        });

        if (res) {
          toast.success(`Payment Voucher ${res.payment_number} updated successfully.`);
          onSuccess();
          onClose();
        } else {
          toast.error("Failed to update payment voucher.");
        }
      } else if (item.type === "debit_note" && item.payment) {
        const res = updateSupplierPayment(item.payment.id, {
          payment_date: date,
          amount: numAmount,
          reason: reason.trim() || notes.trim() || "Damaged goods return",
          notes: notes.trim() || reason.trim() || "Purchase Return / Debit Note",
        });

        if (res) {
          toast.success(`Debit Note ${res.reference_no || res.payment_number} updated successfully.`);
          onSuccess();
          onClose();
        } else {
          toast.error("Failed to update debit note.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        item.type === "invoice"
          ? "Edit Purchase Chalan"
          : item.type === "debit_note"
          ? "Edit Debit Note (Purchase Return)"
          : "Edit Supplier Payment Voucher"
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Header Metadata Ribbon */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
          <div className="flex items-center gap-2">
            {item.type === "invoice" ? (
              <FileText className="h-4 w-4 text-blue-500" />
            ) : item.type === "debit_note" ? (
              <RotateCcw className="h-4 w-4 text-amber-500" />
            ) : (
              <DollarSign className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-xs font-semibold text-muted-foreground">Reference:</span>
            <span className="font-mono font-bold text-xs text-foreground bg-background px-2 py-0.5 rounded border">
              {item.type === "invoice" ? invoiceNumber : voucherNumber}
            </span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {item.type === "invoice"
              ? "Purchase Invoice"
              : item.type === "debit_note"
              ? "Debit Note"
              : "Payment Voucher"}
          </span>
        </div>

        {/* Date & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-xs">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Transaction Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-xs">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              {item.type === "invoice" ? "Total Bill Amount (৳)" : "Amount (৳)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Invoice-Specific: Invoice Number */}
        {item.type === "invoice" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Chalan / Invoice Number</Label>
            <Input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
              className="text-xs font-mono font-semibold"
            />
          </div>
        )}

        {/* Payment-Specific: Mode & Banking Details */}
        {item.type === "payment" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Mode</Label>
              <Select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="text-xs"
              >
                <option value="Bank Transfer">Bank Transfer (EFT / RTGS / NPSB)</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="MFS/Bkash">MFS/Bkash</option>
              </Select>
            </div>

            {/* Conditional Bank Fields */}
            {(paymentMode === "Bank Transfer" || paymentMode === "Cheque") && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  Bank Name
                </Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. City Bank / BRAC Bank / Islami Bank"
                  className="text-xs"
                />
              </div>
            )}

            {paymentMode === "Cheque" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    Cheque Number
                  </Label>
                  <Input
                    type="text"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    placeholder="e.g. CHQ-981240"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cheque Date</Label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {(paymentMode === "Bank Transfer" || paymentMode === "MFS/Bkash") && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  Transaction ID / Reference
                </Label>
                <Input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN_881920 or TrxID"
                  className="text-xs font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* Debit Note-Specific: Reason */}
        {item.type === "debit_note" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Return Reason</Label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged Cookware / Defective Pressure Cookers"
              className="text-xs"
            />
          </div>
        )}

        {/* Remarks / Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Remarks / Description</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add descriptive remarks or details..."
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default EditProcurementModal;
