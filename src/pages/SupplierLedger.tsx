import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { useRouter } from "@/router";

import { SupplierPaymentModal } from "@/components/SupplierPaymentModal";
import {
  getSuppliers,
  getPurchaseInvoices,
  getSupplierPayments,
  getSupplierLedgerDetails,
  type Supplier,
  type PurchaseInvoice,
  type SupplierPayment,
} from "@/utils/localStore";

import {
  Building2,
  Plus,
  DollarSign,
  Printer,
  TrendingDown,
  Receipt,
  Eye,
  Truck,
  FileText,
  ArrowUpDown,
  Pencil,
  RotateCcw,
  FileMinus,
  FileSpreadsheet,
  Database,
  Download,
  Trash2,
} from "lucide-react";

import * as XLSX from "xlsx";
import { toast } from "sonner";
import { exportWorkbookToExcel, printElementOrDocument } from "@/lib/export";
import { Dialog } from "@/components/ui/dialog";
import { SupplierLedgerPdfTemplate } from "@/components/SupplierLedgerPdfTemplate";
import type { SupplierLedgerPdfItem } from "@/components/SupplierLedgerPdfTemplate";
import { EditSupplierModal } from "@/components/EditSupplierModal";
import { DebitNoteModal } from "@/components/DebitNoteModal";
import { ProcurementBackupModal } from "@/components/ProcurementBackupModal";
import { EditProcurementModal, type EditProcurementItem } from "@/components/EditProcurementModal";
import { DeleteProcurementDialog, type DeleteProcurementItem } from "@/components/DeleteProcurementDialog";

export type ProcurementLedgerEntry = {
  id: string;
  type: "invoice" | "payment" | "opening" | "debit_note";
  date: string;
  reference: string;
  particulars: string;
  purchaseAmount: number; // Purchase / Bill (+৳)
  paymentAmount: number;  // Payment / Return (-৳)
  runningBalance: number; // Running Balance (৳)
  invoice?: PurchaseInvoice;
  payment?: SupplierPayment;
  createdAt: string;
};

export function SupplierLedger() {
  const { query, navigate } = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    const list = getSuppliers();
    const hamko = list.find((s) => s.name.toLowerCase().includes("hamko")) || list[0];
    return query.supplier || hamko?.id || "";
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [debitNoteModalOpen, setDebitNoteModalOpen] = useState<boolean>(false);
  const [backupModalOpen, setBackupModalOpen] = useState<boolean>(false);
  const [editSupplierModalOpen, setEditSupplierModalOpen] = useState<boolean>(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | undefined>(undefined);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  const [viewPayment, setViewPayment] = useState<SupplierPayment | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editItem, setEditItem] = useState<EditProcurementItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DeleteProcurementItem | null>(null);

  // Date Range Filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const list = getSuppliers();
    setSuppliers(list);
    const hamko = list.find((s) => s.name.toLowerCase().includes("hamko")) || list[0];
    if (hamko && (!selectedSupplierId || !list.some((s) => s.id === selectedSupplierId))) {
      setSelectedSupplierId(hamko.id);
    }
  }, []);

  // Synchronize query parameter
  useEffect(() => {
    if (query.supplier && query.supplier !== selectedSupplierId) {
      setSelectedSupplierId(query.supplier);
    }
  }, [query.supplier]);

  // Subscribe to storage update events
  useEffect(() => {
    const handleStorage = () => {
      setSuppliers(getSuppliers());
      setDataVersion((v) => v + 1);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleStorage);
    };
  }, []);

  const ledgerData = useMemo(() => {
    if (!selectedSupplierId) {
      return {
        supplier: null,
        openingBalance: 0,
        totalPurchases: 0,
        totalPaid: 0,
        closingPayable: 0,
        entries: [],
      };
    }
    return getSupplierLedgerDetails(selectedSupplierId, { startDate, endDate });
  }, [selectedSupplierId, suppliers, startDate, endDate, dataVersion]);

  const supplier = ledgerData.supplier;

  // Invoices for this supplier with dynamic payment allocations
  const supplierInvoices = useMemo(() => {
    if (!selectedSupplierId) return [];
    let list = getPurchaseInvoices().filter((inv) => inv.supplier_id === selectedSupplierId);
    if (startDate) {
      list = list.filter((inv) => (inv.invoice_date || inv.created_at.slice(0, 10)) >= startDate);
    }
    if (endDate) {
      list = list.filter((inv) => (inv.invoice_date || inv.created_at.slice(0, 10)) <= endDate);
    }
    return list;
  }, [selectedSupplierId, suppliers, startDate, endDate, dataVersion]);

  // Combined accounting ledger with cumulative running balance and dynamic opening balance
  const procurementLedger = useMemo<{
    entries: ProcurementLedgerEntry[];
    openingBalance: number;
    totalPurchases: number;
    totalPayments: number;
    closingBalance: number;
  }>(() => {
    if (!selectedSupplierId) {
      return { entries: [], openingBalance: 0, totalPurchases: 0, totalPayments: 0, closingBalance: 0 };
    }

    const invoices = getPurchaseInvoices().filter((inv) => inv.supplier_id === selectedSupplierId);
    const payments = getSupplierPayments().filter((pay) => pay.supplier_id === selectedSupplierId);

    type RawEvent = {
      id: string;
      type: "invoice" | "payment" | "debit_note";
      date: string;
      reference: string;
      particulars: string;
      purchaseAmount: number;
      paymentAmount: number;
      invoice?: PurchaseInvoice;
      payment?: SupplierPayment;
      createdAt: string;
    };

    const rawList: RawEvent[] = [];

    invoices.forEach((inv) => {
      const date = inv.invoice_date || (inv.created_at ? inv.created_at.slice(0, 10) : "");
      const totalQty = inv.items?.reduce((s, it) => s + Number(it.quantity || 0), 0) || 0;
      rawList.push({
        id: inv.id,
        type: "invoice",
        date,
        reference: inv.invoice_number,
        particulars: `Purchase Chalan (${inv.items?.length || 0} product${(inv.items?.length || 0) === 1 ? "" : "s"}, ${totalQty} pcs)`,
        purchaseAmount: Math.round((Number(inv.total_amount) || 0) * 100) / 100,
        paymentAmount: 0,
        invoice: inv,
        createdAt: inv.created_at || "",
      });
    });

    payments.forEach((pay) => {
      const date = pay.payment_date || (pay.created_at ? pay.created_at.slice(0, 10) : "");
      const isDebitNote =
        pay.payment_type === "Debit Note" ||
        pay.payment_mode === "Debit Note" ||
        (pay.reference_no && pay.reference_no.startsWith("DN-"));

      const ref = isDebitNote
        ? (pay.reference_no || pay.payment_number || "DN")
        : (pay.payment_number || pay.reference_no || "PAY");
      let desc = "";

      if (isDebitNote) {
        desc = `${ref} - Purchase Return${pay.notes ? `: ${pay.notes}` : pay.reason ? `: ${pay.reason}` : ""}`;
      } else {
        desc = `Payment (${pay.payment_mode || "Cash"})`;
        if (pay.bank_name) desc += ` - ${pay.bank_name}`;
        if (pay.notes) desc += ` - ${pay.notes}`;
      }

      rawList.push({
        id: pay.id,
        type: isDebitNote ? "debit_note" : "payment",
        date,
        reference: ref,
        particulars: desc,
        purchaseAmount: 0,
        paymentAmount: Math.round((Number(pay.amount) || 0) * 100) / 100,
        payment: pay,
        createdAt: pay.created_at || "",
      });
    });

    // Sort strictly chronologically ascending (FIFO: oldest first)
    rawList.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      const diff = timeA - timeB;
      if (diff !== 0) return diff;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });

    const baseOpening = Math.round((Number(supplier?.opening_balance || 0)) * 100) / 100;

    // 1. Calculate dynamic opening balance prior to startDate
    let priorPurchases = 0;
    let priorPayments = 0;

    if (startDate) {
      rawList.forEach((ev) => {
        if (ev.date && ev.date < startDate) {
          if (ev.type === "invoice") {
            priorPurchases = Math.round((priorPurchases + ev.purchaseAmount) * 100) / 100;
          } else {
            priorPayments = Math.round((priorPayments + ev.paymentAmount) * 100) / 100;
          }
        }
      });
    }

    const openingBalance = startDate
      ? Math.round((baseOpening + priorPurchases - priorPayments) * 100) / 100
      : baseOpening;

    // 2. Filter period events within [startDate, endDate]
    const periodEvents = rawList.filter((ev) => {
      if (startDate && ev.date && ev.date < startDate) return false;
      if (endDate && ev.date && ev.date > endDate) return false;
      return true;
    });

    let currentBalance = openingBalance;
    let periodPurchases = 0;
    let periodPayments = 0;

    const periodEntries: ProcurementLedgerEntry[] = [];

    periodEvents.forEach((ev) => {
      if (ev.type === "invoice") {
        currentBalance = Math.round((currentBalance + ev.purchaseAmount) * 100) / 100;
        periodPurchases = Math.round((periodPurchases + ev.purchaseAmount) * 100) / 100;
      } else if (ev.type === "payment" || ev.type === "debit_note") {
        currentBalance = Math.round((currentBalance - ev.paymentAmount) * 100) / 100;
        periodPayments = Math.round((periodPayments + ev.paymentAmount) * 100) / 100;
      }

      periodEntries.push({
        ...ev,
        runningBalance: currentBalance,
      });
    });

    const closingBalance = currentBalance;

    // 3. Opening row entry at top of table if startDate is active OR openingBalance !== 0
    const shouldIncludeOpeningRow = Boolean(startDate) || openingBalance !== 0;
    const openingRow: ProcurementLedgerEntry | null = shouldIncludeOpeningRow
      ? {
        id: `open-${selectedSupplierId}-${startDate || "init"}`,
        type: "opening",
        date: startDate || supplier?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        reference: "OPENING",
        particulars: startDate
          ? `Opening Balance as of ${startDate}`
          : "Opening Payable Balance Brought Forward",
        purchaseAmount: 0,
        paymentAmount: 0,
        runningBalance: openingBalance,
        createdAt: "",
      }
      : null;

    let orderedEntries: ProcurementLedgerEntry[] = [];

    if (sortOrder === "desc") {
      if (openingRow) {
        orderedEntries = [openingRow, ...[...periodEntries].reverse()];
      } else {
        orderedEntries = [...periodEntries].reverse();
      }
    } else {
      if (openingRow) {
        orderedEntries = [openingRow, ...periodEntries];
      } else {
        orderedEntries = periodEntries;
      }
    }

    return {
      entries: orderedEntries,
      openingBalance,
      totalPurchases: periodPurchases,
      totalPayments: periodPayments,
      closingBalance,
    };
  }, [selectedSupplierId, supplier, suppliers, startDate, endDate, dataVersion, sortOrder]);

  // Print Handler — renders PDF template into a portal, then triggers window.print()
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    const safeName = (supplier?.name || "Supplier").replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    // Small delay to allow the portal to mount before printing / rendering PDF
    setTimeout(() => {
      void printElementOrDocument({
        elementId: "print-supplier-ledger",
        filename: `Supplier_Ledger_${safeName}_${dateStr}`,
        orientation: "portrait",
        title: `Supplier Ledger - ${supplier?.name || "HAMKO Industries Ltd."}`,
      }).finally(() => {
        setTimeout(() => setIsPrinting(false), 600);
      });
    }, 150);
  };

  // Excel / CSV Export Handler
  const handleExportExcel = () => {
    if (!supplier || procurementLedger.entries.length === 0) {
      toast.error("No ledger transactions available to export");
      return;
    }

    const titleRows = [
      ["SUPPLIER PROCUREMENT & PAYMENT LEDGER STATEMENT"],
      [`Supplier: ${supplier.name || "HAMKO Industries Ltd."}`, `Account Holder: M/S Swarna Enterprise (HD/OD: 75078)`],
      [`Contact: ${supplier.phone || "—"} | Address: ${supplier.address || "—"}`, `Exported: ${new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'long', year: 'numeric' })}`],
      [`Statement Period: ${startDate || "All Time"} to ${endDate || "Present"}`],
      [], // blank separator row
      ["Date", "Ref / Voucher No", "Particulars", "Purchase (+৳)", "Payment / Return (-৳)", "Balance (৳)"],
    ];

    const dataRows = procurementLedger.entries.map((entry) => [
      entry.date,
      entry.reference,
      entry.particulars,
      entry.purchaseAmount ? entry.purchaseAmount : 0,
      entry.paymentAmount ? entry.paymentAmount : 0,
      entry.runningBalance,
    ]);

    const summaryRow = [
      [
        "TOTALS",
        "",
        `Opening: ৳${procurementLedger.openingBalance} | Purchases: ৳${procurementLedger.totalPurchases} | Payments: ৳${procurementLedger.totalPayments}`,
        procurementLedger.totalPurchases,
        procurementLedger.totalPayments,
        procurementLedger.closingBalance,
      ],
    ];

    const wsData = [...titleRows, ...dataRows, ...summaryRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 44 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Statement");

    const safeName = (supplier.name || "Supplier").replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    void exportWorkbookToExcel(wb, `Supplier_Ledger_${safeName}_${dateStr}.xlsx`);
    toast.success("Excel ledger statement prepared successfully.");
  };

  // Build PDF items from procurementLedger entries
  const pdfItems: SupplierLedgerPdfItem[] = procurementLedger.entries.map((e) => ({
    date: e.date,
    refNo: e.reference,
    particulars: e.particulars,
    purchaseAmount: e.purchaseAmount,
    paymentAmount: e.paymentAmount,
    runningBalance: e.runningBalance,
    type: e.type,
  }));


  return (
    <>
      <div className="space-y-4 max-w-6xl mx-auto pb-8">
        {/* Top Header / Actions Bar (Hidden during print) */}
        <div className="print:hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                Supplier Procurement &amp; Ledger
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {supplier?.name || "HAMKO Industries Ltd."}
                  </span>
                </div>
                {supplier && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSupplierModalOpen(true)}
                    className="h-6 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-full"
                  >
                    <Pencil className="h-3 w-3" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditSupplierModalOpen(true)}
                disabled={!supplier}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" /> Edit Supplier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!supplier}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Statement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={!supplier || procurementLedger.entries.length === 0}
                className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export to Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(true)}
                disabled={!supplier}
                className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <DollarSign className="h-4 w-4" /> Record Payment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebitNoteModalOpen(true)}
                disabled={!supplier}
                className="gap-1.5 border-amber-600/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <RotateCcw className="h-4 w-4" /> Record Return / Debit Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBackupModalOpen(true)}
                className="gap-1.5"
              >
                <Database className="h-4 w-4" /> Backup &amp; Restore
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/procurement/new")}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> New Procurement Entry
              </Button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-muted/20 p-3 rounded-lg border">
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Period:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="h-8 text-xs px-2"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Financial Metrics Overview Cards */}
          {supplier && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {startDate ? "Opening Balance" : "Initial Balance"}
                    </span>
                    <Receipt className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className={`text-xl font-bold font-mono mt-1 ${procurementLedger.openingBalance > 0
                    ? "text-purple-600 dark:text-purple-400"
                    : procurementLedger.openingBalance === 0
                      ? "text-foreground"
                      : "text-blue-600 dark:text-blue-400"
                    }`}>
                    {formatBDT(procurementLedger.openingBalance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {startDate ? `Cumulative balance prior to ${startDate}` : "Opening balance brought forward"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {startDate || endDate ? "Period Purchases (+৳)" : "Total Purchases (+৳)"}
                    </span>
                    <Truck className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-xl font-bold font-mono mt-1 text-foreground">
                    {formatBDT(procurementLedger.totalPurchases)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {startDate || endDate ? "Chalan value in selected period" : "Total incoming inventory value"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {startDate || endDate ? "Period Payments (-৳)" : "Total Payments Made (-৳)"}
                    </span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                    {formatBDT(procurementLedger.totalPayments)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {startDate || endDate ? "Paid in selected period" : "Bank, cash & cheque vouchers"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {startDate || endDate ? "Closing Payable Balance" : "Current Payable Balance"}
                    </span>
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className={`text-xl font-bold font-mono mt-1 ${procurementLedger.closingBalance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : procurementLedger.closingBalance === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                    }`}>
                    {formatBDT(procurementLedger.closingBalance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {startDate || endDate ? "Opening + Purchases - Payments" : "Outstanding liability to supplier"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>


        {/* Unified Procurement Accounting Ledger */}
        {selectedSupplierId && (
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Supplier Procurement Ledger
                </CardTitle>
                <CardDescription>
                  Statement of account with cumulative running balance for {supplier?.name || "HAMKO Industries Ltd."}.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="gap-1.5 text-xs h-8"
                  title="Toggle chronological sorting"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortOrder === "asc" ? "Chronological (Oldest First)" : "Newest First"}
                </Button>
                <Button size="sm" onClick={() => navigate("/procurement/new")} className="gap-1.5 h-8">
                  <Plus className="h-4 w-4" /> Add Purchase Chalan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {procurementLedger.entries.length === 0 ? (
                <div className="text-center py-10 px-4 text-muted-foreground text-sm">
                  No purchase chalans or payments recorded yet for this supplier.
                </div>
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {procurementLedger.entries.map((item) => {
                      if (item.type === "opening") {
                        return (
                          <div key={item.id} className="p-3.5 space-y-1.5 bg-purple-500/5 border-l-4 border-l-purple-500">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-purple-700 dark:text-purple-300 font-mono">{item.reference}</span>
                              <span className="text-muted-foreground">{item.date}</span>
                            </div>
                            <p className="text-xs font-medium text-foreground">{item.particulars}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-muted-foreground">Running Balance:</span>
                              <span className={`text-sm font-bold font-mono ${item.runningBalance > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : item.runningBalance === 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-blue-600 dark:text-blue-400"
                                }`}>
                                {formatBDT(item.runningBalance)}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === "invoice") {
                        return (
                          <div key={item.id} className="p-3.5 space-y-2 bg-card/50 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                                  <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  <span>{item.reference}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-muted-foreground block">Bill (+৳)</span>
                                <span className="text-sm font-bold text-foreground font-mono">
                                  {formatBDT(item.purchaseAmount)}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2">{item.particulars}</p>

                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Balance:</span>
                                <span className={`font-mono font-bold ${item.runningBalance > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : item.runningBalance === 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-blue-600 dark:text-blue-400"
                                  }`}>
                                  {formatBDT(item.runningBalance)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {item.invoice && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPayInvoiceId(item.invoice!.id);
                                        setPaymentModalOpen(true);
                                      }}
                                      className="h-7 text-xs px-2 text-emerald-700 dark:text-emerald-400 border-emerald-600/30"
                                    >
                                      <DollarSign className="h-3 w-3 mr-0.5" /> Pay
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setViewInvoice(item.invoice!)}
                                      className="h-7 text-xs px-2"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> Details
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditItem({ type: "invoice", invoice: item.invoice! })}
                                      className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setDeleteItem({
                                          type: "invoice",
                                          id: item.invoice!.id,
                                          reference: item.invoice!.invoice_number,
                                          amount: item.invoice!.total_amount,
                                          date: item.date,
                                        })
                                      }
                                      className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === "debit_note") {
                        return (
                          <div key={item.id} className="p-3.5 space-y-2 bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <Badge variant="outline" className="border-amber-300 bg-amber-100/60 text-amber-800 text-[11px] font-mono">
                                    {item.reference}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-muted-foreground block">Return (-৳)</span>
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">
                                  {formatBDT(item.paymentAmount)}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">{item.particulars}</p>

                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Balance:</span>
                                <span className={`font-mono font-bold ${item.runningBalance > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : item.runningBalance === 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-blue-600 dark:text-blue-400"
                                  }`}>
                                  {formatBDT(item.runningBalance)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {item.payment && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setViewPayment(item.payment!)}
                                      className="h-7 text-xs px-2 text-amber-700"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> Note
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditItem({ type: "debit_note", payment: item.payment! })}
                                      className="h-7 w-7 text-amber-700 hover:bg-amber-100/50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setDeleteItem({
                                          type: "debit_note",
                                          id: item.payment!.id,
                                          reference: item.reference,
                                          amount: item.paymentAmount,
                                          date: item.date,
                                        })
                                      }
                                      className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Payment
                      return (
                        <div key={item.id} className="p-3.5 space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{item.reference}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{item.date}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">Paid (-৳)</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatBDT(item.paymentAmount)}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-foreground">
                            <p>{(item.particulars || "").replace(/\s*\[Txn(?:\s*ID)?:\s*[^\]]+\]/gi, "").replace(/\s*\[Chq:\s*[^\]]+\]/gi, "").trim()}</p>
                            {item.payment?.payment_mode && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1 mt-1 font-normal">
                                {item.payment.payment_mode}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Balance:</span>
                              <span className={`font-mono font-bold ${item.runningBalance > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : item.runningBalance === 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-blue-600 dark:text-blue-400"
                                }`}>
                                {formatBDT(item.runningBalance)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {item.payment && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewPayment(item.payment!)}
                                    className="h-7 text-xs px-2 text-emerald-700"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> Voucher
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditItem({ type: "payment", payment: item.payment! })}
                                    className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setDeleteItem({
                                        type: "payment",
                                        id: item.payment!.id,
                                        reference: item.reference,
                                        amount: item.paymentAmount,
                                        date: item.date,
                                      })
                                    }
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Mobile Summary Row */}
                    <div className="p-3 bg-muted/60 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Purchases (+৳):</span>
                        <span className="font-bold text-foreground">{formatBDT(procurementLedger.totalPurchases)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Total Payments (-৳):</span>
                        <span className="font-bold">{formatBDT(procurementLedger.totalPayments)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/60 text-sm font-bold">
                        <span className="text-foreground">Closing Balance:</span>
                        <span className={procurementLedger.closingBalance > 0 ? "text-amber-600" : "text-emerald-600"}>
                          {formatBDT(procurementLedger.closingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block relative overflow-y-auto max-h-[500px] xl:max-h-[calc(100vh-380px)] border-t">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 shadow-xs">
                        <TableRow className="border-b shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-background">
                          <TableHead className="w-28 sticky top-0 z-20 bg-background font-semibold text-foreground">Date</TableHead>
                          <TableHead className="w-36 sticky top-0 z-20 bg-background font-semibold text-foreground">Ref / Voucher No</TableHead>
                          <TableHead className="sticky top-0 z-20 bg-background font-semibold text-foreground">Particulars / Description</TableHead>
                          <TableHead className="text-right w-36 sticky top-0 z-20 bg-background font-semibold text-foreground">Purchase / Bill (+৳)</TableHead>
                          <TableHead className="text-right w-36 sticky top-0 z-20 bg-background font-semibold text-foreground">Payment Made (-৳)</TableHead>
                          <TableHead className="text-right w-40 sticky top-0 z-20 bg-background font-semibold text-foreground">Running Balance (৳)</TableHead>
                          <TableHead className="text-right w-44 sticky top-0 z-20 bg-background font-semibold text-foreground">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {procurementLedger.entries.map((item) => {
                          if (item.type === "opening") {
                            return (
                              <TableRow key={item.id} className="bg-muted/30 font-medium border-l-4 border-l-purple-500">
                                <TableCell className="text-xs font-mono">{item.date}</TableCell>
                                <TableCell className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-300">{item.reference}</TableCell>
                                <TableCell className="text-xs font-medium text-foreground">{item.particulars}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                                <TableCell className={`text-right font-mono font-bold ${item.runningBalance > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : item.runningBalance === 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-blue-600 dark:text-blue-400"
                                  }`}>
                                  {formatBDT(item.runningBalance)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">—</TableCell>
                              </TableRow>
                            );
                          }

                          if (item.type === "invoice") {
                            return (
                              <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                                <TableCell className="text-xs font-mono">{item.date}</TableCell>
                                <TableCell className="font-mono font-bold text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span>{item.reference}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-foreground">
                                  <span>{item.particulars}</span>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-foreground">
                                  {formatBDT(item.purchaseAmount)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  —
                                </TableCell>
                                <TableCell
                                  className={`text-right font-mono font-bold ${item.runningBalance > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : item.runningBalance === 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-blue-600 dark:text-blue-400"
                                    }`}
                                >
                                  {formatBDT(item.runningBalance)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {item.invoice && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setPayInvoiceId(item.invoice!.id);
                                            setPaymentModalOpen(true);
                                          }}
                                          className="h-7 text-xs px-2 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                          title="Record payment against this chalan"
                                        >
                                          <DollarSign className="h-3 w-3 mr-0.5" /> Pay
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setViewInvoice(item.invoice!)}
                                          className="h-7 gap-1 text-xs px-2"
                                          title="View Chalan Details"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> Details
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditItem({ type: "invoice", invoice: item.invoice! })}
                                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                          title="Edit Chalan"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setDeleteItem({
                                              type: "invoice",
                                              id: item.invoice!.id,
                                              reference: item.invoice!.invoice_number,
                                              amount: item.invoice!.total_amount,
                                              date: item.date,
                                            })
                                          }
                                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                          title="Delete Chalan"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          // Debit Note (Purchase Return) Row Entry
                          if (item.type === "debit_note") {
                            return (
                              <TableRow
                                key={item.id}
                                className="bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors border-l-4 border-l-amber-500"
                              >
                                <TableCell className="text-xs font-mono text-amber-950 dark:text-amber-200">
                                  {item.date}
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-amber-800 dark:text-amber-400">
                                  <div className="flex items-center gap-1.5">
                                    <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <Badge variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-mono text-[11px] px-1.5 py-0">
                                      {item.reference}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-amber-950 dark:text-amber-200">
                                      {item.particulars}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                                        Purchase Return / Damaged Goods (-৳)
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  —
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                                  {formatBDT(item.paymentAmount)}
                                </TableCell>
                                <TableCell
                                  className={`text-right font-mono font-bold ${item.runningBalance > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : item.runningBalance === 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-blue-600 dark:text-blue-400"
                                    }`}
                                >
                                  {formatBDT(item.runningBalance)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {item.payment && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setViewPayment(item.payment!)}
                                          className="h-7 gap-1 text-xs px-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
                                          title="View Debit Note"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> Note
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditItem({ type: "debit_note", payment: item.payment! })}
                                          className="h-7 w-7 p-0 text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 dark:hover:bg-amber-950/40"
                                          title="Edit Debit Note"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setDeleteItem({
                                              type: "debit_note",
                                              id: item.payment!.id,
                                              reference: item.reference,
                                              amount: item.paymentAmount,
                                              date: item.date,
                                            })
                                          }
                                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                          title="Delete Debit Note"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          // Payment Row Entry
                          return (
                            <TableRow
                              key={item.id}
                              className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors border-l-4 border-l-emerald-500"
                            >
                              <TableCell className="text-xs font-mono text-emerald-950 dark:text-emerald-200">
                                {item.date}
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>{item.reference}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-col">
                                  <span className="font-medium text-emerald-950 dark:text-emerald-300">
                                    {(item.particulars || "")
                                      .replace(/\s*\[Txn(?:\s*ID)?:\s*[^\]]+\]/gi, "")
                                      .replace(/\s*\[Chq:\s*[^\]]+\]/gi, "")
                                      .trim()}
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mt-0.5">
                                    {item.payment?.payment_mode && (
                                      <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                                        {item.payment.payment_mode}
                                      </Badge>
                                    )}
                                    {item.payment?.bank_name && (
                                      <span>Bank: {item.payment.bank_name}</span>
                                    )}
                                    {item.payment?.cheque_no && (
                                      <span className="font-mono">Chq: {item.payment.cheque_no}</span>
                                    )}
                                    {item.payment?.transaction_id && (
                                      <span className="font-mono">Txn ID: {item.payment.transaction_id}</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                —
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatBDT(item.paymentAmount)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono font-bold ${item.runningBalance > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : item.runningBalance === 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-blue-600 dark:text-blue-400"
                                  }`}
                              >
                                {formatBDT(item.runningBalance)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {item.payment && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setViewPayment(item.payment!)}
                                        className="h-7 gap-1 text-xs px-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                                        title="View Payment Voucher"
                                      >
                                        <Eye className="h-3.5 w-3.5" /> Voucher
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditItem({ type: "payment", payment: item.payment! })}
                                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                        title="Edit Payment"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setDeleteItem({
                                            type: "payment",
                                            id: item.payment!.id,
                                            reference: item.reference,
                                            amount: item.paymentAmount,
                                            date: item.date,
                                          })
                                        }
                                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                        title="Delete Payment"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <tfoot className="sticky bottom-0 z-20 border-t bg-muted/95 backdrop-blur-xs font-semibold text-xs shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
                        <TableRow className="bg-muted/95 hover:bg-muted/95">
                          <TableCell colSpan={3} className="sticky bottom-0 z-20 bg-muted text-right font-bold py-3 text-muted-foreground">
                            Total Bills &amp; Payments:
                          </TableCell>
                          <TableCell className="sticky bottom-0 z-20 bg-muted text-right font-mono font-bold text-foreground">
                            {formatBDT(procurementLedger.totalPurchases)}
                          </TableCell>
                          <TableCell className="sticky bottom-0 z-20 bg-muted text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatBDT(procurementLedger.totalPayments)}
                          </TableCell>
                          <TableCell
                            className={`sticky bottom-0 z-20 bg-muted text-right font-mono font-bold text-sm ${procurementLedger.closingBalance > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                              }`}
                          >
                            {formatBDT(procurementLedger.closingBalance)}
                          </TableCell>
                          <TableCell className="sticky bottom-0 z-20 bg-muted" />
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Supplier Payment Modal */}
        <SupplierPaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setPayInvoiceId(undefined);
          }}
          defaultSupplierId={selectedSupplierId}
          defaultInvoiceId={payInvoiceId}
          onSuccess={() => {
            setSuppliers(getSuppliers());
            setDataVersion((v) => v + 1);
          }}
        />

        {/* Debit Note / Return Modal */}
        <DebitNoteModal
          open={debitNoteModalOpen}
          onClose={() => setDebitNoteModalOpen(false)}
          defaultSupplierId={selectedSupplierId}
          onSuccess={() => {
            setSuppliers(getSuppliers());
            setDataVersion((v) => v + 1);
          }}
        />

        {/* Invoice Details Dialog */}
        <Dialog
          open={Boolean(viewInvoice)}
          onClose={() => setViewInvoice(null)}
          title={`Chalan Details: ${viewInvoice?.invoice_number || ""}`}
          size="lg"
        >
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground block">Supplier:</span>
                  <span className="font-semibold text-foreground">{viewInvoice.supplier_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Chalan Date:</span>
                  <span className="font-mono font-medium">{viewInvoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Total Invoice:</span>
                  <span className="font-mono font-bold">{formatBDT(viewInvoice.total_amount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Paid Amount:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(viewInvoice.paid_amount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Due Payable:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatBDT(viewInvoice.due_amount || 0)}
                  </span>
                </div>
              </div>

              {viewInvoice.notes && (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded">
                  Note: {viewInvoice.notes}
                </p>
              )}

              {/* Preserved line items */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">Quantity (Pcs)</TableHead>
                      <TableHead className="text-right">Purchase Rate (৳)</TableHead>
                      <TableHead className="text-right">Subtotal (৳)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items?.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">{it.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{it.sku_code}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{it.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">{formatBDT(it.purchase_rate)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{formatBDT(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground">
                  Preserved historical line rates ensure master product edits never alter this invoice.
                </span>
                <Button variant="outline" size="sm" onClick={() => setViewInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Payment Voucher / Debit Note Details Dialog */}
        <Dialog
          open={Boolean(viewPayment)}
          onClose={() => setViewPayment(null)}
          title={
            viewPayment?.payment_type === "Debit Note" || (viewPayment?.reference_no && viewPayment.reference_no.startsWith("DN-"))
              ? `Debit Note Details: ${viewPayment?.reference_no || viewPayment?.payment_number || ""}`
              : `Payment Voucher: ${viewPayment?.payment_number || viewPayment?.reference_no || ""}`
          }
          size="md"
        >
          {viewPayment && (
            <div className="space-y-4">
              {viewPayment.payment_type === "Debit Note" || (viewPayment.reference_no && viewPayment.reference_no.startsWith("DN-")) ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    <RotateCcw className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-semibold">Purchase Return / Debit Note (Deducted from Payable Balance)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
                    <div>
                      <span className="text-muted-foreground block">Supplier / Vendor:</span>
                      <span className="font-semibold text-foreground">{viewPayment.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Return Date:</span>
                      <span className="font-mono font-medium">{viewPayment.payment_date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Debit Note Ref:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {viewPayment.reference_no || viewPayment.payment_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Amount Subtracted:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                        {formatBDT(viewPayment.amount)}
                      </span>
                    </div>
                    {viewPayment.reason && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Reason for Return:</span>
                        <span className="font-medium text-foreground">{viewPayment.reason}</span>
                      </div>
                    )}
                  </div>
                  {viewPayment.notes && (
                    <div className="bg-muted/20 p-3 rounded border text-xs">
                      <span className="text-muted-foreground block font-medium mb-0.5">Damaged Items / Remarks:</span>
                      <p className="text-foreground">{viewPayment.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
                    <div>
                      <span className="text-muted-foreground block">Supplier:</span>
                      <span className="font-semibold text-foreground">{viewPayment.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Payment Date:</span>
                      <span className="font-mono font-medium">{viewPayment.payment_date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Payment Mode:</span>
                      <span className="font-semibold text-foreground">{viewPayment.payment_mode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Amount Paid:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatBDT(viewPayment.amount)}
                      </span>
                    </div>
                    {viewPayment.bank_name && (
                      <div>
                        <span className="text-muted-foreground block">Bank Name:</span>
                        <span className="font-medium text-foreground">{viewPayment.bank_name}</span>
                      </div>
                    )}
                    {viewPayment.cheque_no && (
                      <div>
                        <span className="text-muted-foreground block">Cheque No:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {viewPayment.cheque_no} {viewPayment.cheque_date ? `(${viewPayment.cheque_date})` : ""}
                        </span>
                      </div>
                    )}
                    {viewPayment.transaction_id && (
                      <div>
                        <span className="text-muted-foreground block">Transaction ID:</span>
                        <span className="font-mono font-semibold text-foreground">{viewPayment.transaction_id}</span>
                      </div>
                    )}
                    {viewPayment.reference_no && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Reference / Voucher No:</span>
                        <span className="font-mono font-medium">{viewPayment.reference_no}</span>
                      </div>
                    )}
                  </div>

                  {viewPayment.notes && (
                    <div className="bg-muted/20 p-3 rounded border text-xs">
                      <span className="text-muted-foreground block font-medium mb-0.5">Remarks / Notes:</span>
                      <p className="text-foreground">{viewPayment.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewPayment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* ── EDIT SUPPLIER PROFILE MODAL ───────────────────────────── */}
        <EditSupplierModal
          open={editSupplierModalOpen}
          onClose={() => setEditSupplierModalOpen(false)}
          supplier={supplier}
          onSuccess={(updated) => {
            setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setDataVersion((v) => v + 1);
          }}
        />

        {/* ── DATA BACKUP & RESTORE MODAL ───────────────────────────── */}
        <ProcurementBackupModal
          open={backupModalOpen}
          onClose={() => setBackupModalOpen(false)}
          onRestoreSuccess={() => {
            setSuppliers(getSuppliers());
            setDataVersion((v) => v + 1);
          }}
        />

        {/* ── EDIT PROCUREMENT ITEM MODAL (CHALAN / PAYMENT / DEBIT NOTE) ─ */}
        <EditProcurementModal
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          item={editItem}
          onSuccess={() => {
            setSuppliers(getSuppliers());
            setDataVersion((v) => v + 1);
          }}
        />

        {/* ── DELETE PROCUREMENT ITEM DIALOG ─────────────────────────── */}
        <DeleteProcurementDialog
          open={Boolean(deleteItem)}
          onClose={() => setDeleteItem(null)}
          item={deleteItem}
          onSuccess={() => {
            setSuppliers(getSuppliers());
            setDataVersion((v) => v + 1);
          }}
        />
      </div>

      {/* ── PRINT-ONLY SUPPLIER LEDGER PDF PORTAL ─────────────────── */}
      {isPrinting && supplier && typeof document !== "undefined" &&
        createPortal(
          <div
            className="hidden print:block"
            style={{ width: '100%', margin: 0, padding: 0 }}
          >
            <SupplierLedgerPdfTemplate
              data={{
                accountHolder: "M/S Swarna Enterprise",
                accountCode: "HD/OD: 75078",
                supplierName: supplier.name || '—',
                supplierPhone: supplier.phone || '',
                supplierAddress: supplier.address || '',
                supplierEmail: supplier.email || '',
                contactPerson: supplier.contact_person || '',
                statementDate: new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'long', year: 'numeric' }),
                periodFrom: startDate || undefined,
                periodTo: endDate || undefined,
                openingBalance: procurementLedger.openingBalance,
                totalPurchases: procurementLedger.totalPurchases,
                totalPayments: procurementLedger.totalPayments,
                closingBalance: procurementLedger.closingBalance,
                items: pdfItems,
              }}
            />
          </div>,
          document.body,
        )
      }
    </>
  );
}

export default SupplierLedger;
