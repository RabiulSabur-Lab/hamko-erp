import { useState, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT } from "@/lib/utils";
import {
  getProcurementAuditLogs,
  clearProcurementAuditLogs,
  type ProcurementAuditLog,
} from "@/utils/localStore";
import {
  History,
  Search,
  Download,
  Trash2,
  ShieldCheck,
  RotateCcw,
  DollarSign,
  FileText,
  Building2,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUsers } from "@/context/UsersContext";

export interface ProcurementAuditModalProps {
  open: boolean;
  onClose: () => void;
  supplierId?: string;
}

export function ProcurementAuditModal({ open, onClose, supplierId }: ProcurementAuditModalProps) {
  const { getUserName } = useUsers();
  const [logs, setLogs] = useState<ProcurementAuditLog[]>([]);
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  useEffect(() => {
    if (open) {
      setLogs(getProcurementAuditLogs());
    }
  }, [open]);

  // Listen for storage events to update in real time
  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getProcurementAuditLogs());
    };
    window.addEventListener("sales_erp_storage_update", handleUpdate);
    return () => window.removeEventListener("sales_erp_storage_update", handleUpdate);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchRef = log.reference?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchSup = log.supplier_name?.toLowerCase().includes(q);
        const matchUser = log.user?.toLowerCase().includes(q);
        if (!matchRef && !matchDetails && !matchSup && !matchUser) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter]);

  function handleExportCsv() {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs to export");
      return;
    }

    const exportRows = filteredLogs.map((l) => ({
      Timestamp: l.timestamp,
      Action: l.action,
      "Entity Type": l.entity_type,
      Reference: l.reference,
      "Supplier Name": l.supplier_name || "—",
      Amount: l.amount !== undefined ? l.amount : "—",
      User: l.user,
      Details: l.details,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
    XLSX.writeFile(wb, `Procurement_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Audit trail exported successfully.");
  }

  function handleClear() {
    if (window.confirm("Are you sure you want to clear the audit trail history? This cannot be undone.")) {
      clearProcurementAuditLogs();
      setLogs([]);
      toast.success("Audit trail logs cleared.");
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE_INVOICE":
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1 text-[11px]">
            <FileText className="h-3 w-3" /> Chalan Created
          </Badge>
        );
      case "RECORD_PAYMENT":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-[11px]">
            <DollarSign className="h-3 w-3" /> Payment Made
          </Badge>
        );
      case "RECORD_DEBIT_NOTE":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 text-[11px]">
            <RotateCcw className="h-3 w-3" /> Debit Note
          </Badge>
        );
      case "UPDATE_SUPPLIER":
      case "CREATE_SUPPLIER":
        return (
          <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 gap-1 text-[11px]">
            <Building2 className="h-3 w-3" /> Supplier Info
          </Badge>
        );
      case "RESTORE_BACKUP":
        return (
          <Badge className="bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 gap-1 text-[11px]">
            <Database className="h-3 w-3" /> Backup Restored
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {action}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Procurement & Payment Audit Trail" size="lg">
      <div className="space-y-4">
        {/* Compliance Header */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Immutable system audit log for financial compliance &amp; internal control</span>
          </div>
          <span className="text-muted-foreground font-mono">
            {filteredLogs.length} record{filteredLogs.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search reference, supplier, remarks, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE_INVOICE">Invoices (Chalans)</option>
              <option value="RECORD_PAYMENT">Payments Made</option>
              <option value="RECORD_DEBIT_NOTE">Debit Notes / Returns</option>
              <option value="UPDATE_SUPPLIER">Supplier Updates</option>
              <option value="RESTORE_BACKUP">Data Restorations</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="h-9 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-600/30"
            >
              <Download className="h-3.5 w-3.5" /> Export Log
            </Button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-36 text-xs">Timestamp</TableHead>
                <TableHead className="w-32 text-xs">Action</TableHead>
                <TableHead className="w-28 text-xs">Reference</TableHead>
                <TableHead className="text-xs">Audit Details</TableHead>
                <TableHead className="w-24 text-right text-xs">Amount</TableHead>
                <TableHead className="w-20 text-center text-xs">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? `${dateObj.toLocaleDateString("en-BD", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })} ${dateObj.toLocaleTimeString("en-BD", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : log.timestamp;

                  return (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formattedDate}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-mono font-semibold text-foreground whitespace-nowrap">
                        {log.reference || "—"}
                      </TableCell>
                      <TableCell className="max-w-md break-words">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{log.details}</span>
                          {log.supplier_name && (
                            <span className="text-[11px] text-muted-foreground">
                              Supplier: {log.supplier_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                        {log.amount !== undefined ? formatBDT(log.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                        {getUserName(log.user_id, log.user || "Admin")}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No audit records found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="text-destructive hover:bg-destructive/10 h-8 gap-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear History
          </Button>

          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ProcurementAuditModal;
