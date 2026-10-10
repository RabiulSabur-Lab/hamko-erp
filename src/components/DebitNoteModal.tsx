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
  getSupplierPayments,
  saveSupplierDebitNote,
  type Supplier,
  type PurchaseInvoice,
  r2,
  generateDebitNoteNumber,
} from "@/utils/localStore";
import {
  Loader2,
  Building2,
  Calendar,
  FileMinus,
  RotateCcw,
  Receipt,
  AlertTriangle,
} from "lucide-react";

export interface DebitNoteModalProps {
  open: boolean;
  onClose: () => void;
  defaultSupplierId?: string;
  defaultInvoiceId?: string;
  onSuccess?: () => void;
}

const COMMON_RETURN_REASONS = [
  "Damaged goods / Physical defect",
  "Cracked casing / Acid leakage",
  "Factory defective / Low voltage cells",
  "Transit damage / Rough handling",
  "Incorrect specification / Wrong items received",
  "Quality inspection rejected",
  "Warranty replacement adjustment",
  "Other reason",
];

export function DebitNoteModal({
  open,
  onClose,
  defaultSupplierId,
  defaultInvoiceId,
  onSuccess,
}: DebitNoteModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  
  const [debitNoteNumber, setDebitNoteNumber] = useState<string>("");
  const [amount, setAmount] = useState<number | string>("");
  const [reasonCategory, setReasonCategory] = useState<string>(COMMON_RETURN_REASONS[0]);
  const [returnDate, setReturnDate] = useState<string>(() =>
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
      
      // Auto-generate Debit Note number e.g. DN-2026-001
      const existingPayments = getSupplierPayments();
      const nextDn = generateDebitNoteNumber(existingPayments);
      setDebitNoteNumber(nextDn);

      setAmount("");
      setReasonCategory(COMMON_RETURN_REASONS[0]);
      setNotes("");
      setReturnDate(new Date().toISOString().slice(0, 10));
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!supplierId || !selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    const returnAmount = r2(Number(amount));
    if (isNaN(returnAmount) || returnAmount <= 0) {
      toast.error("Please enter a valid positive return amount to deduct from payable");
      return;
    }

    setSaving(true);
    try {
      const finalDnNumber = debitNoteNumber.trim() || generateDebitNoteNumber();
      const combinedNotes = notes.trim()
        ? `${reasonCategory}: ${notes.trim()}`
        : reasonCategory;

      saveSupplierDebitNote({
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        amount: returnAmount,
        reference_no: finalDnNumber,
        payment_date: returnDate,
        reason: reasonCategory,
        notes: combinedNotes,
        invoice_id: selectedInvoiceId || undefined,
      });

      toast.success(
        `Debit Note ${finalDnNumber} of ${formatBDT(returnAmount)} recorded. Amount deducted from ${selectedSupplier.name} payable.`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record Debit Note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record Return / Debit Note" size="md">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Purchase Return / Damaged Goods Entry:</span>
            Submits a formal Debit Note against the supplier. This amount will be directly subtracted from the supplier's outstanding payable balance.
          </div>
        </div>

        {/* Supplier Selector */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            <Building2 className="h-4 w-4 text-primary" />
            Supplier / Vendor
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
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatBDT(currentPayable)}
              </span>
            </div>
          )}
        </div>

        {/* Debit Note Reference & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium">
              <RotateCcw className="h-4 w-4 text-primary" />
              Debit Note No / Ref
            </Label>
            <Input
              type="text"
              value={debitNoteNumber}
              onChange={(e) => setDebitNoteNumber(e.target.value)}
              placeholder="e.g. DN-2026-001"
              className="font-mono font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Return Date
            </Label>
            <Input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Related Purchase Chalan (Optional) */}
        {invoices.length > 0 && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-xs">
              <Receipt className="h-4 w-4 text-primary" />
              Related Purchase Chalan / Invoice (Optional)
            </Label>
            <Select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full text-xs font-mono"
            >
              <option value="">General Supplier Return / No specific chalan</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} ({inv.invoice_date}) - Total: ৳{inv.total_amount} | Due: ৳{inv.due_amount}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Return Reason Category */}
        <div className="space-y-1.5">
          <Label className="font-medium">Reason for Return</Label>
          <Select
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            className="w-full text-xs"
          >
            {COMMON_RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>

        {/* Return Amount (৳) */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-medium">
            <FileMinus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Debit Note Amount (-৳ to Payable)
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="font-mono text-base font-bold text-amber-600 dark:text-amber-400"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            This amount will be deducted from {selectedSupplier?.name || "supplier"} payable.
          </p>
        </div>

        {/* Goods Return Details / Damaged Products */}
        <div className="space-y-1.5">
          <Label className="font-medium">Damaged Products / Items Description</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Returned 2 pcs Hamko 12V-150Ah battery due to cracked casing during delivery..."
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !supplierId}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Record Debit Note
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default DebitNoteModal;
