import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { type Customer, type Order, type Collection, supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, formatDate, toBnDigit } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import {
  getOrders,
  getCollections,
  getCustomers,
  getDeletedIds,
  getLocalData,
  setLocalData,
  STORAGE_KEYS,
  recalculateCustomerLedger,
  sortAndCalculateCustomerLedger,
  formatLedgerBalance,
  deduplicateCollections,
  type RecalculatedLedgerEntry,
} from "@/utils/localStore";
import { Printer, Download, BookOpen, Calendar, ExternalLink, CreditCard, ShieldCheck } from "lucide-react";
import { useRouter } from "@/router";
import { Input } from "@/components/ui/input";
import { LedgerPdfTemplate } from "./LedgerPdfTemplate";

export interface CustomerLedgerModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

/**
 * Slim & Neat User-Friendly Status Badge:
 * - balance < 0: "Advance Deposit: ৳ 90,000"
 * - balance > 0: "Due: ৳ 45,221"
 * - balance === 0: "Clear / ৳ 0"
 */
export function LedgerStatusBadge({
  balance,
  lang,
  size = "sm",
}: {
  balance: number;
  lang?: "en" | "bn";
  size?: "sm" | "md";
}) {
  const { text, type } = formatLedgerBalance(balance, lang, true);

  const badgeClass =
    type === "due"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
      : type === "advance"
      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
      : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

  return (
    <Badge
      variant="outline"
      className={`font-semibold tracking-tight whitespace-nowrap shadow-none border ${
        size === "sm"
          ? "text-[11px] py-0.5 px-2 leading-none rounded"
          : "text-xs py-1 px-2.5 rounded-md"
      } ${badgeClass}`}
    >
      {text}
    </Badge>
  );
}

function getCustomerOrdersAndCollections(targetCustomer: Customer | null) {
  if (!targetCustomer) {
    return { customerOrders: [] as Order[], customerCollections: [] as Collection[] };
  }

  const targetId = String(targetCustomer.id || "").trim();
  const targetName = String(targetCustomer.name || "").trim().toLowerCase();

  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const allOrders: Order[] = getOrders();
  const customerOrders: Order[] = (Array.isArray(allOrders) ? allOrders : [])
    .filter((o: Order) => !deletedOrderIds.has(o.id))
    .filter((o: Order) => {
      // Active confirmed orders (Pending, Approved, Delivered) debit customer ledger; Draft and Cancelled are excluded
      if (o.status === "Cancelled" || o.status === "Draft") return false;
      const oId = String(o.customer_id || (o as any).customer?.id || "").trim();
      if (targetId) return oId === targetId;
      const oName = String(o.customer?.name || (o as any).customer_name || "").trim().toLowerCase();
      return Boolean(targetName && oName && oName === targetName);
    });

  const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const allCollections: Collection[] = getCollections();
  const customerCollections: Collection[] = (Array.isArray(allCollections) ? allCollections : [])
    .filter((c: Collection) => !deletedColIds.has(c.id))
    .filter((c: Collection) => {
      const cId = String(c.customer_id || (c as any).customer?.id || "").trim();
      if (targetId) return cId === targetId;
      const cName = String(c.customer?.name || (c as any).customer_name || "").trim().toLowerCase();
      return Boolean(targetName && cName && cName === targetName);
    });

  return { customerOrders, customerCollections };
}

export function CustomerLedgerModal({ open, onClose, customer }: CustomerLedgerModalProps) {
  const { t, lang } = useI18n();
  const { navigate } = useRouter();
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(customer || null);
  const [orders, setOrders] = useState<Order[]>(() => getCustomerOrdersAndCollections(customer).customerOrders);
  const [collections, setCollections] = useState<Collection[]>(() => getCustomerOrdersAndCollections(customer).customerCollections);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortDesc, setSortDesc] = useState(false);

  useEffect(() => {
    setActiveCustomer(customer || null);
  }, [customer]);

  const currentCust = activeCustomer || customer;

  useEffect(() => {
    if (!open || !currentCust) {
      setOrders([]);
      setCollections([]);
      return;
    }

    const refreshData = (targetCust: Customer | null = currentCust) => {
      if (!targetCust) return;
      const { customerOrders, customerCollections } = getCustomerOrdersAndCollections(targetCust);
      setOrders([...customerOrders]);
      setCollections([...customerCollections]);
    };

    refreshData();

    const handleStorageUpdate = () => {
      const customers: Customer[] = getCustomers();
      const fresh: Customer | undefined = customers.find(
        (c: Customer) => String(c.id).trim() === String(customer?.id).trim()
      );
      if (fresh) {
        setActiveCustomer(fresh);
        refreshData(fresh);
      } else {
        refreshData(activeCustomer || customer);
      }
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);
    window.addEventListener("customer_ledger_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
      window.removeEventListener("customer_ledger_updated", handleStorageUpdate);
    };
  }, [open, customer?.id, customer?.name, currentCust?.name, currentCust?.current_due]);

  // ── Supabase background refresh whenever the modal opens ────────────────
  useEffect(() => {
    if (!open || !currentCust) return;

    let cancelled = false;

    const fetchFresh = async () => {
      try {
        const targetId = String(currentCust.id || "").trim();
        const targetName = String(currentCust.name || "").trim().toLowerCase();
        if (!targetId && !targetName) return;

        // Fetch orders for this customer from Supabase
        const targetParty = String(currentCust?.party_code || "").trim();
        const { data: remoteOrders } = await supabase
          .from("orders")
          .select(
            "*, order_items(*, product:products(name, sku_code, unit_price)), customer:customers(name, phone, current_due)"
          )
          .or(
            targetId
              ? `customer_id.eq.${targetId}`
              : `party_code.eq.${targetParty},customer_name.eq.${targetName}`
          )
          .eq("status", "Delivered")
          .order("order_date", { ascending: false });

        // Fetch collections for this customer from Supabase
        const { data: remoteCols } = await supabase
          .from("collections")
          .select("*")
          .eq("customer_id", targetId)
          .order("collection_date", { ascending: false });

        if (cancelled) return;

        const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
        const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);

        if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
          const cleanRemote: Order[] = remoteOrders.filter((o: Order) => !deletedOrderIds.has(o.id));
          const remoteIdSet = new Set(cleanRemote.map((o: Order) => String(o.id)));
          const currentLocal: Order[] = getOrders().filter((o: Order) => !deletedOrderIds.has(o.id) && !remoteIdSet.has(String(o.id)));
          const merged: Order[] = [...currentLocal, ...cleanRemote];
          setLocalData(STORAGE_KEYS.ORDERS, merged);
        }

        if (Array.isArray(remoteCols) && remoteCols.length > 0) {
          const cleanRemote: Collection[] = remoteCols.filter((c: Collection) => !deletedColIds.has(c.id));
          const remoteIdSet = new Set(cleanRemote.map((c: Collection) => String(c.id)));
          const remoteColNumSet = new Set(
            cleanRemote.map((c: Collection) => String(c.collection_number || "").trim().toUpperCase()).filter(Boolean)
          );
          const currentLocal: Collection[] = getCollections().filter(
            (c: Collection) =>
              !deletedColIds.has(c.id) &&
              !remoteIdSet.has(String(c.id)) &&
              (!c.collection_number || !remoteColNumSet.has(String(c.collection_number).trim().toUpperCase()))
          );
          const merged: Collection[] = deduplicateCollections([...currentLocal, ...cleanRemote]);
          setLocalData(STORAGE_KEYS.COLLECTIONS, merged);
        }

        if (!cancelled) {
          const { customerOrders, customerCollections } = getCustomerOrdersAndCollections(currentCust);
          setOrders([...customerOrders]);
          setCollections(deduplicateCollections(customerCollections));
        }
      } catch (err) {
        console.debug("CustomerLedgerModal: Supabase refresh skipped:", err);
      }
    };

    fetchFresh();
    return () => { cancelled = true; };
  }, [open, currentCust?.id]);

  // ── LEDGER CALCULATION: Chronological Sorting & Backdate Recalculation ──
  const { allEntries, filteredEntries, summary } = useMemo(() => {
    if (!currentCust) {
      return {
        allEntries: [] as RecalculatedLedgerEntry[],
        filteredEntries: [] as RecalculatedLedgerEntry[],
        summary: { openingBalance: 0, totalInvoiced: 0, totalCollected: 0, closingBalance: 0, totalInvoices: 0 },
      };
    }

    const { entries, summary } = recalculateCustomerLedger(
      currentCust,
      orders,
      deduplicateCollections(collections),
      { persist: false }
    );

    const filtered = entries.filter((e: RecalculatedLedgerEntry) => {
      if (!startDate && !endDate) return true;
      const d = e.date.slice(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    return {
      allEntries: entries,
      filteredEntries: filtered,
      summary,
    };
  }, [currentCust, orders, collections, startDate, endDate]);

  // Oldest-first by default (date ASC, createdAt ASC); toggle to newest-first
  const displayEntries = useMemo(
    () => (sortDesc ? [...filteredEntries].reverse() : filteredEntries),
    [filteredEntries, sortDesc]
  );

  function handleExcelExport() {
    if (!currentCust) return;
    const excelRows = displayEntries.map((row: RecalculatedLedgerEntry) => {
      const { text } = formatLedgerBalance(row.runningBalance, lang);
      return {
        Date: row.formattedDate,
        "Particulars/Note": row.type === "Order" ? `${row.ref} · ${row.note}` : row.type === "Collection" ? `${row.ref} · ${row.note}` : row.note,
        "Invoice (+৳)": row.invoiceAmount !== null && row.invoiceAmount > 0 ? row.invoiceAmount : "",
        "Payment (-৳)": row.paymentAmount !== null && row.paymentAmount > 0 ? row.paymentAmount : "",
        "Running Balance": text,
        "Current Status": text,
      };
    });
    const filename = `Party_Ledger_${(currentCust.party_code || currentCust.name).replace(/[^a-zA-Z0-9]/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 10)}`;
    exportToExcel(filename, excelRows);
  }

  function handlePrint() {
    document.body.classList.add("printing-ledger");
    const cleanup = () => {
      document.body.classList.remove("printing-ledger");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  }

  if (!open || !currentCust) return null;

  return (
    <>
      {/* ══ MODAL CONTAINER: Fits within viewport with max-h-[90vh] flex flex-col ══ */}
      <Dialog
        open={open}
        onClose={onClose}
        size="2xl"
        title=""
        className="p-0 overflow-hidden max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div className="max-h-[90vh] flex flex-col overflow-hidden flex-1 min-h-0">

          {/* ── Compact Fixed Header ─────────────────────────────────────── */}
          <div className="shrink-0 border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5">
            {/* Title row */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold leading-tight text-foreground">
                      {currentCust.outlet_name || currentCust.name}
                    </h2>
                    {currentCust.party_code && (
                      <Badge variant="outline" className="font-mono text-[11px] font-semibold py-0 h-5 bg-muted/60 border-primary/30 text-primary">
                        {currentCust.party_code}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[11px] py-0 h-5">
                      {t(currentCust.customer_type.toLowerCase())}
                    </Badge>
                    <LedgerStatusBadge balance={summary.closingBalance} lang={lang} size="sm" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Party Ledger &amp; Financial Statement
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-7 text-xs gap-1 px-2.5">
                  <Printer className="h-3.5 w-3.5" />
                  <span>{t("print")}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExcelExport} className="h-7 text-xs gap-1 px-2.5">
                  <Download className="h-3.5 w-3.5" />
                  <span>{t("exportExcel")}</span>
                </Button>
              </div>
            </div>

            {/* Compact inline customer meta strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-3 py-1.5 rounded-md border border-border/60 bg-background/80 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">Contact:</span>
                <span className="font-semibold text-foreground">{currentCust.contact_person || "—"}</span>
              </div>
              <span className="text-border hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">Phone:</span>
                <span className="font-mono font-semibold text-foreground">{currentCust.phone || "—"}</span>
                {currentCust.alt_phone && (
                  <span className="text-muted-foreground text-[11px]">({currentCust.alt_phone})</span>
                )}
              </div>
              <span className="text-border hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">Area:</span>
                <span className="text-foreground">{currentCust.area || [currentCust.territory?.name, currentCust.city].filter(Boolean).join(", ") || "—"}</span>
              </div>
              {currentCust.trade_license_number && (
                <>
                  <span className="text-border hidden sm:inline">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground font-medium">Trade License:</span>
                    <span className="font-mono text-foreground text-[11px]">{currentCust.trade_license_number}</span>
                  </div>
                </>
              )}
              {Boolean(
                currentCust.securityChequeNo ||
                (currentCust as any).security_cheque_no ||
                currentCust.securityBankName ||
                (currentCust as any).security_bank_name ||
                currentCust.securityChequeDate ||
                (currentCust as any).security_cheque_date
              ) && (
                <>
                  <span className="text-border hidden sm:inline">|</span>
                  <div className="flex items-center">
                    <span
                      className="bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 rounded-md px-2 py-0.5 text-xs inline-flex items-center gap-1 font-semibold cursor-help shadow-none transition-colors hover:bg-emerald-100/70"
                      title={`Security Cheque: ${
                        currentCust.securityBankName || (currentCust as any).security_bank_name
                          ? `${currentCust.securityBankName || (currentCust as any).security_bank_name} `
                          : ""
                      }#${(currentCust.securityChequeNo || (currentCust as any).security_cheque_no || "—")}${
                        currentCust.securityBranchName || (currentCust as any).security_branch_name
                          ? ` (${currentCust.securityBranchName || (currentCust as any).security_branch_name})`
                          : ""
                      }${
                        (currentCust.securityChequeDate || (currentCust as any).security_cheque_date)
                          ? ` | Received: ${formatDate(currentCust.securityChequeDate || (currentCust as any).security_cheque_date)}`
                          : ""
                      }${
                        (currentCust.securityNotes || (currentCust as any).security_notes)
                          ? ` | Note: ${currentCust.securityNotes || (currentCust as any).security_notes}`
                          : ""
                      }`}
                    >
                      <span>🛡️ Sec. Cheque</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Compact Financial summary cards */}
            <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-4">
              <div className="rounded-md border bg-card/70 px-3 py-1.5 shadow-none">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Opening Balance</p>
                <p className="text-sm font-bold text-muted-foreground mt-0.5">
                  {formatBDT(summary.openingBalance)}
                </p>
              </div>
              <div className="rounded-md border bg-card/70 px-3 py-1.5 shadow-none">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Invoiced (+৳)</p>
                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <p className="text-sm font-bold text-foreground">
                    +{formatBDT(summary.totalInvoiced)}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {summary.totalInvoices ?? 0} {(summary.totalInvoices ?? 0) === 1 ? "Invoice" : "Invoices"}
                  </span>
                </div>
              </div>
              <div className="rounded-md border bg-card/70 px-3 py-1.5 shadow-none">
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium">Payments (-৳)</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                  -{formatBDT(summary.totalCollected)}
                </p>
              </div>
              <div className="rounded-md border bg-card/70 px-3 py-1.5 shadow-none">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Status</p>
                <div className="mt-0.5">
                  <LedgerStatusBadge balance={summary.closingBalance} lang={lang} size="sm" />
                </div>
              </div>
            </div>

            {/* Compact Filters row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-muted-foreground text-[11px]">Period:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-6 w-28 text-xs py-0 px-1.5"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-6 w-28 text-xs py-0 px-1.5"
                />
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStartDate(""); setEndDate(""); }}
                    className="h-6 px-1.5 text-[11px]"
                  >
                    Clear
                  </Button>
                )}
                <div className="inline-flex rounded-md shadow-xs border border-border/70 overflow-hidden ml-1 h-6">
                  <button
                    type="button"
                    onClick={() => setSortDesc(false)}
                    className={`px-2 text-[11px] font-medium transition-colors ${
                      !sortDesc
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                    title="Sort Oldest First (Chronological top-to-bottom)"
                  >
                    Oldest First ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortDesc(true)}
                    className={`px-2 text-[11px] font-medium transition-colors border-l border-border/70 ${
                      sortDesc
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                    title="Sort Latest First (Chronological bottom-to-top)"
                  >
                    Latest First ↓
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === "bn"
                  ? `${toBnDigit(allEntries.length)} টি লেনদেনের মধ্যে ${toBnDigit(displayEntries.length)} টি প্রদর্শিত হচ্ছে`
                  : `Showing ${displayEntries.length} of ${allEntries.length} transactions`}
              </p>
            </div>
          </div>

          {/* ── Scrollable Table Area: flex-1 overflow-y-auto max-h-[60vh] ─────────────────── */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] min-h-0 w-full">
            <div className="p-3 sm:p-4">
              {displayEntries.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-9 w-9" />}
                  title={t("noData")}
                  description="No transactions found for this customer."
                />
              ) : (
                <div className="rounded-lg border shadow-xs overflow-hidden">
                  <Table>
                    {/* Simplified 5 Column Headers: Date | Particulars/Note | Invoice (+৳) | Payment (-৳) | Current Status */}
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
                      <TableRow className="bg-muted/70 text-xs hover:bg-muted/70">
                        <TableHead className="w-[95px] py-2 px-3 font-semibold whitespace-nowrap">Date</TableHead>
                        <TableHead className="min-w-[210px] py-2 px-3 font-semibold">Particulars/Note</TableHead>
                        <TableHead className="w-[125px] py-2 px-3 text-right font-semibold text-foreground">Invoice (+৳)</TableHead>
                        <TableHead className="w-[125px] py-2 px-3 text-right font-semibold text-emerald-600">Payment (-৳)</TableHead>
                        <TableHead className="w-[185px] py-2 px-3 text-right font-semibold">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {displayEntries.map((row: RecalculatedLedgerEntry) => (
                        <TableRow
                          key={row.id}
                          className={`hover:bg-muted/40 transition-colors ${
                            row.type === "Opening"
                              ? "bg-muted/20 italic"
                              : row.type === "Collection"
                              ? "bg-emerald-50/20 dark:bg-emerald-950/10"
                              : ""
                          }`}
                        >
                          {/* Col 1: Date */}
                          <TableCell className="py-2.5 px-3 text-xs whitespace-nowrap font-mono text-muted-foreground">
                            {row.formattedDate}
                          </TableCell>

                          {/* Col 2: Particulars/Note */}
                          <TableCell className="py-2.5 px-3 text-xs">
                            {row.type === "Order" ? (
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    navigate(
                                      `/orders?search=${encodeURIComponent(row.ref)}&order=${encodeURIComponent(row.ref)}`
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 text-left font-semibold text-primary hover:underline group w-fit"
                                  title={`View order ${row.ref}`}
                                >
                                  <span>{row.ref}</span>
                                  <ExternalLink className="h-3 w-3 opacity-60 shrink-0 group-hover:opacity-100" />
                                </button>
                                <span className="text-muted-foreground text-[11px] line-clamp-1">{row.note}</span>
                              </div>
                            ) : row.type === "Collection" ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {row.ref}
                                  </span>
                                  {row.isCheque && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0">
                                      <CreditCard className="h-2.5 w-2.5" />
                                      <span>Cheque</span>
                                    </span>
                                  )}
                                </div>
                                {row.chequeInfo ? (
                                  <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                                    <span>{row.chequeInfo}</span>
                                    {row.note && row.note !== row.chequeInfo && !row.note.startsWith(row.chequeInfo) && (
                                      <span className="text-muted-foreground font-normal ml-1">· {row.note}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] line-clamp-1">{row.note}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic font-medium">{row.note}</span>
                            )}
                          </TableCell>

                          {/* Col 3: Invoice (+৳) */}
                          <TableCell className="py-2.5 px-3 text-right text-xs font-semibold">
                            {row.invoiceAmount !== null && row.invoiceAmount > 0 ? (
                              <span className="text-foreground">+{formatBDT(row.invoiceAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>

                          {/* Col 4: Payment (-৳) */}
                          <TableCell className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                            {row.paymentAmount !== null && row.paymentAmount > 0 ? (
                              <span>-{formatBDT(row.paymentAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>

                          {/* Col 5: Current Status (Clear Slim User-Friendly Badge) */}
                          <TableCell className="py-2.5 px-3 text-right text-xs">
                            <LedgerStatusBadge balance={row.runningBalance} lang={lang} size="sm" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* ══ PRINT-ONLY STATEMENT (Rendered via LedgerPdfTemplate Portaled to document.body) ═══════ */}
      {open && currentCust && typeof document !== "undefined" &&
        createPortal(
          <div
            className="hidden print:block print-container ledger-wrapper"
            style={{ width: "100%", margin: 0, marginTop: 0, padding: 0, paddingTop: 0 }}
          >
            <LedgerPdfTemplate
              data={{
                outletName: currentCust?.outlet_name || currentCust?.name || "—",
                partyCode: currentCust?.party_code || "—",
                contactPerson: currentCust?.contact_person || "—",
                phone: currentCust?.phone ? `${currentCust.phone}${currentCust?.alt_phone ? ` (Alt: ${currentCust.alt_phone})` : ""}` : "—",
                customerType: currentCust?.customer_type || "—",
                area: currentCust?.area || (currentCust as any)?.territory?.name || (currentCust as any)?.city || "—",
                address: currentCust?.address || "—",
                date: formatDate(new Date().toISOString()),
                statementDate: formatDate(new Date().toISOString()),
                hasSecurityCheck: Boolean(
                  currentCust?.hasSecurityCheque ||
                  (currentCust as any)?.hasSecurityCheck ||
                  (currentCust as any)?.securityCheckSubmitted ||
                  currentCust?.security_cheque_no ||
                  (currentCust as any)?.securityChequeNo ||
                  (currentCust as any)?.security_cheque_status === "Received" ||
                  (currentCust as any)?.security_cheque_status === "Cleared"
                ),
                openingBalance: summary.openingBalance,
                totalInvoiced: summary.totalInvoiced,
                totalPayments: summary.totalCollected,
                currentStatus: formatLedgerBalance(summary.closingBalance, "en", true).text,
                items: filteredEntries.map((row: RecalculatedLedgerEntry) => {
                  const statusInfo = formatLedgerBalance(row.runningBalance, "en", true);
                  return {
                    date: row.formattedDate,
                    refNo: row.ref,
                    note: [row.chequeInfo, row.note].filter(Boolean).join(" · "),
                    invoiceAmount: row.invoiceAmount ? row.invoiceAmount : "",
                    paymentAmount: row.paymentAmount ? row.paymentAmount : "",
                    status: statusInfo.text,
                    runningBalance: row.runningBalance,
                    running_balance: row.running_balance ?? row.runningBalance,
                  };
                }),
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

export { CustomerLedgerModal as PartyLedgerModal };
export { LedgerPdfTemplate } from "./LedgerPdfTemplate";
export default CustomerLedgerModal;
