import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import {
  deletePurchaseInvoice,
  deleteSupplierPayment,
} from "@/utils/localStore";
import {
  AlertTriangle,
  Trash2,
  Loader2,
  Calendar,
  Receipt,
  DollarSign,
} from "lucide-react";

export interface DeleteProcurementItem {
  type: "invoice" | "payment" | "debit_note";
  id: string;
  reference: string;
  amount: number;
  date: string;
}

export interface DeleteProcurementDialogProps {
  open: boolean;
  onClose: () => void;
  item: DeleteProcurementItem | null;
  onSuccess: () => void;
}

export function DeleteProcurementDialog({
  open,
  onClose,
  item,
  onSuccess,
}: DeleteProcurementDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const itemTypeName =
    item.type === "invoice"
      ? "Purchase Chalan"
      : item.type === "debit_note"
      ? "Debit Note (Purchase Return)"
      : "Payment Voucher";

  const handleDelete = () => {
    setDeleting(true);
    try {
      let success = false;
      if (item.type === "invoice") {
        success = deletePurchaseInvoice(item.id);
      } else {
        success = deleteSupplierPayment(item.id);
      }

      if (success) {
        toast.success(`${itemTypeName} ${item.reference} deleted successfully.`);
        onSuccess();
        onClose();
      } else {
        toast.error(`Failed to delete ${itemTypeName.toLowerCase()}.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Delete ${itemTypeName}?`} size="sm">
      <div className="space-y-4 pt-1">
        {/* Warning Callout */}
        <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-900 dark:text-rose-200">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Deleting this record will immediately recalculate all cumulative running balances and payable totals for subsequent transactions.
            </p>
          </div>
        </div>

        {/* Item Summary Card */}
        <div className="p-3 bg-muted/40 rounded-lg border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" /> Ref / Voucher:
            </span>
            <span className="font-mono font-bold text-foreground">{item.reference}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Date:
            </span>
            <span className="font-mono">{item.date}</span>
          </div>

          <div className="flex items-center justify-between border-t pt-2 mt-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Amount:
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              {formatBDT(item.amount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Confirm Delete
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default DeleteProcurementDialog;
