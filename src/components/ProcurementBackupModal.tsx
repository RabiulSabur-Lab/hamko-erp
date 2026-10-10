import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  exportProcurementBackupData,
  restoreProcurementBackupData,
  getSuppliers,
  getPurchaseInvoices,
  getSupplierPayments,
  getProcurementAuditLogs,
} from "@/utils/localStore";
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Building2,
  Receipt,
  DollarSign,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface ProcurementBackupModalProps {
  open: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export function ProcurementBackupModal({
  open,
  onClose,
  onRestoreSuccess,
}: ProcurementBackupModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [restoring, setRestoring] = useState<boolean>(false);

  // Current system stats
  const suppliers = getSuppliers();
  const invoices = getPurchaseInvoices();
  const payments = getSupplierPayments();
  const auditLogs = getProcurementAuditLogs();

  function handleDownloadBackup() {
    try {
      const data = exportProcurementBackupData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `procurement_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Procurement dataset backup (JSON) downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate backup file");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError("");
    setParsedBackup(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.endsWith(".json")) {
      setFileError("Please select a valid JSON backup file (*.json).");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid backup structure");
        }
        setParsedBackup(parsed);
      } catch (err) {
        setFileError("Failed to parse JSON file. The file may be corrupt.");
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmRestore() {
    if (!parsedBackup) return;

    if (!window.confirm("Restore dataset from this backup file? Existing balances will be updated.")) {
      return;
    }

    setRestoring(true);
    try {
      const result = restoreProcurementBackupData(parsedBackup);
      if (result.success) {
        toast.success(result.message);
        onRestoreSuccess?.();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Restore operation failed");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Procurement Data Backup & Restore" size="md">
      <div className="space-y-4">
        {/* Current Dataset Overview */}
        <div className="bg-muted/40 p-3 rounded-lg border">
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-primary" />
            Current Live Procurement Dataset
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <Building2 className="h-3 w-3" /> Suppliers
              </div>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{suppliers.length}</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <Receipt className="h-3 w-3" /> Chalans
              </div>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{invoices.length}</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" /> Payments/DN
              </div>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{payments.length}</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <History className="h-3 w-3" /> Audit Logs
              </div>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{auditLogs.length}</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: DOWNLOAD BACKUP */}
        <Card className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Backup Data (JSON)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Export an offline JSON snapshot of all procurement suppliers, chalans, payments, and audit history.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadBackup}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 ml-3"
              >
                <Download className="h-4 w-4" /> Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: RESTORE DATA */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                <Upload className="h-4 w-4 text-primary" />
                Restore Data from Backup
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a valid JSON backup file to restore or synchronize procurement records and recalculate running balances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="border border-dashed rounded-lg p-3 text-center hover:bg-muted/30 transition-colors flex items-center justify-center gap-2 text-xs">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">
                    {selectedFile ? selectedFile.name : "Select or drag .json backup file here"}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {fileError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {fileError}
              </p>
            )}

            {/* Backup Preview Info */}
            {parsedBackup && (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valid Backup Archive
                  </span>
                  <span>
                    {parsedBackup.exported_at ? new Date(parsedBackup.exported_at).toLocaleString() : "Unknown date"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background p-1.5 rounded border">
                    <span className="text-[11px] text-muted-foreground block">Suppliers:</span>
                    <span className="font-mono font-bold">{parsedBackup.suppliers?.length || 0}</span>
                  </div>
                  <div className="bg-background p-1.5 rounded border">
                    <span className="text-[11px] text-muted-foreground block">Chalans:</span>
                    <span className="font-mono font-bold">{parsedBackup.purchase_invoices?.length || 0}</span>
                  </div>
                  <div className="bg-background p-1.5 rounded border">
                    <span className="text-[11px] text-muted-foreground block">Payments:</span>
                    <span className="font-mono font-bold">{parsedBackup.supplier_payments?.length || 0}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleConfirmRestore}
                    disabled={restoring}
                    className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
                  >
                    {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Confirm &amp; Restore Dataset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ProcurementBackupModal;
