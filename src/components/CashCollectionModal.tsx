import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase, type Collection, type Customer, type Order, type Expense } from "@/lib/supabase";
import { formatBDT, isBengaliMode } from "@/lib/utils";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  saveCollections,
  saveOrders,
  saveExpenses,
  optimisticAdd,
  getOrders,
  calculateCustomerDues,
  getCustomerLedgerDetails,
  recalculateCustomerLedger,
  updateCustomerBalance,
  refreshCustomers,
  dispatchGlobalStateUpdate,
  r2,
  generateCollectionNumber,
} from "@/utils/localStore";
import { normalizePaymentMethod } from "@/utils/cloudSync";
import {
  sanitizeCollectionPayload,
  sanitizeExpensePayload,
  sanitizeCustomerPayload,
  sanitizeOrderPayload,
  executeWithSchemaResilience,
} from "@/lib/payloadSanitizer";

export const PAYMENT_METHODS = [
  "Cash",
  "Cheque",
  "Bank Cheque",
  "Bank Transfer",
  "Mobile Banking",
] as const;

export const BANGLADESH_BANKS = [
  "Dutch-Bangla Bank (DBBL)",
  "Islami Bank Bangladesh (IBBL)",
  "BRAC Bank",
  "The City Bank",
  "Eastern Bank (EBL)",
  "Sonali Bank",
  "Pubali Bank",
  "United Commercial Bank (UCB)",
  "Mutual Trust Bank (MTB)",
  "Prime Bank",
  "Southeast Bank",
  "National Bank (NBL)",
  "Mercantile Bank",
  "Trust Bank",
  "Bank Asia",
  "Standard Chartered Bangladesh",
  "HSBC",
] as const;

export interface CashCollectionModalProps {
  open: boolean;
  onClose: () => void;
  customers?: Customer[];
  orders?: Order[];
  editingCollection?: Collection | null;
  onSaved?: (col: Collection) => void;
}

export type AddCollectionModalProps = CashCollectionModalProps;

export function CashCollectionModal({
  open,
  onClose,
  customers: propCustomers,
  orders: propOrders,
  editingCollection = null,
  onSaved,
}: CashCollectionModalProps) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");

  // Cheque Fields
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  // Role verification: Admin / Manager gate for settlement discounts (BUG-015)
  const isUserAdmin = Boolean(
    profile?.role_name?.toLowerCase().includes("admin") ||
    profile?.role_name?.toLowerCase().includes("manager") ||
    (profile as any)?.role?.toLowerCase().includes("admin") ||
    (profile as any)?.role?.toLowerCase().includes("manager")
  );

  const [enableSettlementDiscount, setEnableSettlementDiscount] = useState(false);
  const [settlementDiscount, setSettlementDiscount] = useState<number | string>("");
  const [settlementReason, setSettlementReason] = useState("");

  const [internalCustomers, setInternalCustomers] = useState<Customer[]>(() =>
    propCustomers || getLocalData<Customer[]>(STORAGE_KEYS.CUSTOMERS, [])
  );
  const [internalOrders, setInternalOrders] = useState<Order[]>(() =>
    propOrders || getOrders()
  );

  useEffect(() => {
    if (propCustomers) setInternalCustomers(propCustomers);
  }, [propCustomers]);

  useEffect(() => {
    if (propOrders) setInternalOrders(propOrders);
  }, [propOrders]);

  // Real-time synchronization upon collection / storage update
  useEffect(() => {
    const handleUpdate = () => {
      setInternalCustomers(getLocalData<Customer[]>(STORAGE_KEYS.CUSTOMERS, []));
      setInternalOrders(getOrders());
    };
    window.addEventListener("sales_erp_storage_update", handleUpdate);
    window.addEventListener("customer_ledger_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sales_erp_storage_update", handleUpdate);
      window.removeEventListener("customer_ledger_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const customers: Customer[] = internalCustomers;
  const allOrders: Order[] = internalOrders;

  const isCheque = Boolean(
    paymentMethod && (
      paymentMethod === "Cheque" ||
      paymentMethod === "Bank Cheque" ||
      paymentMethod === "Cheque / Check" ||
      paymentMethod.toLowerCase().includes("cheque") ||
      paymentMethod.toLowerCase().includes("check")
    )
  );

  useEffect(() => {
    if (!open) return;
    if (editingCollection) {
      setCustomerId(editingCollection.customer_id || "");
      setOrderId(editingCollection.order_id || "");
      setAmount(editingCollection.amount || "");
      setPaymentMethod(editingCollection.payment_method || "Cash");
      setCollectionDate(
        editingCollection.collection_date
          ? new Date(editingCollection.collection_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setNotes(editingCollection.notes || "");
      setChequeNo(
        editingCollection.cheque_number ||
          (editingCollection as any).chequeNo ||
          (editingCollection as any).cheque_no ||
          ""
      );
      setBankName(editingCollection.bank_name || (editingCollection as any).bankName || "");
      setBranchName(editingCollection.branch_name || (editingCollection as any).branchName || "");
      setChequeDate(
        editingCollection.cheque_date
          ? String(editingCollection.cheque_date).slice(0, 10)
          : (editingCollection as any).chequeDate
          ? String((editingCollection as any).chequeDate).slice(0, 10)
          : ""
      );
    } else {
      setCustomerId("");
      setOrderId("");
      setAmount("");
      setPaymentMethod("Cash");
      setCollectionDate(new Date().toISOString().slice(0, 16));
      setNotes("");
      setChequeNo("");
      setBankName("");
      setBranchName("");
      setChequeDate("");
      setEnableSettlementDiscount(false);
      setSettlementDiscount("");
      setSettlementReason("");
    }
  }, [open, editingCollection]);

  const selectedCustomer: Customer | undefined = customers.find((c: Customer) => c.id === customerId);

  // Dynamic Due Calculation: directly compute live from ledger (Opening Balance + Total Orders - Total Collections)
  const selectedCustomerDue = React.useMemo(() => {
    if (!customerId) return 0;
    const ledger = getCustomerLedgerDetails(customerId, allOrders);
    if (ledger && typeof ledger.currentDue === "number" && !isNaN(ledger.currentDue)) {
      return ledger.currentDue;
    }
    return Number(
      (selectedCustomer as any)?.currentDue !== undefined
        ? (selectedCustomer as any).currentDue
        : selectedCustomer?.current_due !== undefined
        ? selectedCustomer.current_due
        : (selectedCustomer as any)?.totalDue !== undefined
        ? (selectedCustomer as any)?.totalDue
        : 0
    );
  }, [customerId, selectedCustomer, allOrders]);

  const numericAmount = Number(amount) || 0;
  const isOverCollection = Boolean(
    customerId &&
    numericAmount > 0 &&
    selectedCustomerDue >= 0 &&
    numericAmount > selectedCustomerDue
  );
  const excessAmount = Math.max(0, r2(numericAmount - selectedCustomerDue));

  async function handleSave(e?: React.FormEvent | React.MouseEvent) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (saving) return;
    if (!customerId || !amount) {
      toast.error("Customer and amount are required");
      return;
    }
    const amt = r2(Number(amount));
    if (amt <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (isCheque && !chequeNo.trim()) {
      toast.error("Cheque number is required for Cheque collections");
      return;
    }

    // BUG-015: Strictly gate any manual settlement discount / waiver to Admins with explicit validation
    const discAmt = enableSettlementDiscount && isUserAdmin ? r2(Number(settlementDiscount)) : 0;
    if (discAmt < 0) {
      toast.error("Settlement discount cannot be negative");
      return;
    }
    if (discAmt > 0 && !settlementReason.trim()) {
      toast.error("Settlement discount requires an explicit approval reason / authorization note");
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingCollection && editingCollection.id);
      const colNum = editingCollection?.collection_number || generateCollectionNumber();
      const targetCustomer: Customer | undefined = customers.find((c: Customer) => c.id === customerId);
      const targetOrder: Order | undefined = allOrders.find((o: Order) => o.id === orderId);
      const colId = isEditing
        ? editingCollection!.id
        : (crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}`);

      const finalBank = isCheque ? bankName.trim() || null : null;
      const finalBranch = isCheque ? branchName.trim() || null : null;
      const finalChequeNo = isCheque ? chequeNo.trim() || null : null;
      const finalChequeDate = isCheque ? chequeDate || null : null;

      // Build readable note for customer statement & ledger: "Cheque No: #123456, City Bank"
      let chequeDesc = "";
      if (isCheque && finalChequeNo) {
        const bankDetails = [finalBank, finalBranch ? `${finalBranch} Br.` : ""].filter(Boolean).join(", ");
        chequeDesc = bankDetails ? `Cheque No: #${finalChequeNo}, ${bankDetails}` : `Cheque No: #${finalChequeNo}`;
      }

      let finalNote = notes.trim();
      if (chequeDesc) {
        finalNote = finalNote ? `${chequeDesc} · ${finalNote}` : chequeDesc;
      }
      if (discAmt > 0) {
        const discTag = `[Settlement Discount: ৳${discAmt} approved by ${profile?.full_name || "Admin"}: ${settlementReason.trim()}]`;
        finalNote = finalNote ? `${finalNote} · ${discTag}` : discTag;
      }

      // Calculate balance snapshot for receipt (BUG-019 & BUG-015)
      let prevDueCalc = 0;
      let remDueCalc = 0;
      if (targetCustomer?.id) {
        if (isEditing && editingCollection?.previous_due !== undefined && editingCollection?.previous_due !== null) {
          prevDueCalc = Number(editingCollection.previous_due);
        } else if (isEditing && editingCollection?.previousDue !== undefined && editingCollection?.previousDue !== null) {
          prevDueCalc = Number(editingCollection.previousDue);
        } else {
          const details = getCustomerLedgerDetails(targetCustomer.id);
          prevDueCalc = details.currentDue;
        }

        if (discAmt > 0 && discAmt > Math.max(0, r2(prevDueCalc - amt))) {
          toast.error("Settlement discount cannot exceed the remaining balance");
          setSaving(false);
          return;
        }

        // Exact cash collection reduces customer balance, with any authorized settlement discount transparently factored in
        remDueCalc = Math.max(0, r2(prevDueCalc - amt - discAmt));
      }

      const currentOfficerName = profile?.full_name || "Sales Officer";
      const collectionRecord: Collection = {
        id: colId,
        collection_number: colNum,
        customer_id: customerId,
        order_id: orderId || null,
        amount: amt,
        payment_method: (paymentMethod as any) || "Cash",
        collection_date: collectionDate ? new Date(collectionDate).toISOString() : new Date().toISOString(),
        collected_by: profile?.id ?? null,
        collector_name: currentOfficerName,
        collected_by_name: currentOfficerName,
        collector: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
        notes: finalNote || null,
        created_at: editingCollection?.created_at || new Date().toISOString(),
        bank_name: finalBank,
        branch_name: finalBranch,
        cheque_number: finalChequeNo,
        cheque_date: finalChequeDate,
        customer: targetCustomer,
        order: targetOrder,
        previous_due: prevDueCalc,
        remaining_due: remDueCalc,
        previousDue: prevDueCalc,
        remainingDue: remDueCalc,
        ...(discAmt > 0 ? { settlement_discount: discAmt, settlement_reason: settlementReason.trim() } : {}),
        ...(finalChequeNo ? { chequeNo: finalChequeNo, cheque_no: finalChequeNo } : {}),
        ...(finalBank ? { bankName: finalBank } : {}),
        ...(finalBranch ? { branchName: finalBranch } : {}),
        ...(finalChequeDate ? { chequeDate: finalChequeDate } : {}),
      };

      // BUG-015: If an Admin authorized a settlement discount, record it separately as an audited Expense
      if (discAmt > 0 && isUserAdmin) {
        const discountExpense: Expense = {
          id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `exp-disc-${Date.now()}`),
          category: "Settlement Discount",
          description: `Settlement Discount / Waiver for ${targetCustomer?.name || "Customer"} (Approved by ${profile?.full_name || "Admin"}: ${settlementReason.trim()})`,
          amount: discAmt,
          expense_date: collectionDate ? String(collectionDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
          recorded_by: profile?.full_name || "Admin",
          notes: `Settlement waiver approved for Collection ${colNum}`,
          created_at: new Date().toISOString(),
        };
        const existingExpenses = getLocalData<Expense[]>(STORAGE_KEYS.EXPENSES, []);
        saveExpenses([discountExpense, ...existingExpenses]);

        const cleanExpensePayload = sanitizeExpensePayload({
          id: discountExpense.id,
          category: "Settlement Discount",
          description: discountExpense.description,
          amount: discAmt,
          expense_date: discountExpense.expense_date,
          recorded_by: profile?.id || null,
          notes: discountExpense.notes,
        }, true);

        supabase.from("expenses").insert(cleanExpensePayload).then(undefined, (err) => console.warn("Supabase settlement discount expense insert notice:", err));
      }

      // 1. Instant local optimistic mutation
      const storedCols: Collection[] = getLocalData<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
      let nextCols: Collection[];
      if (isEditing) {
        nextCols = storedCols.map((c) => (c.id === colId ? collectionRecord : c));
      } else {
        nextCols = optimisticAdd<Collection>(storedCols, collectionRecord, STORAGE_KEYS.COLLECTIONS);
      }
      saveCollections(nextCols);

      // 2. Real-time Customer Balance Sync: recalculate live and persist
      let updatedCustDue = 0;
      let updatedCustStatus: "Clear" | "Partial" | "Overdue" = "Clear";
      if (targetCustomer?.id) {
        const syncRes = updateCustomerBalance(targetCustomer.id, allOrders, nextCols);
        updatedCustDue = syncRes.currentDue;
        updatedCustStatus = syncRes.dueStatus as any;
      }
      if (isEditing && editingCollection?.customer_id && editingCollection.customer_id !== targetCustomer?.id) {
        updateCustomerBalance(editingCollection.customer_id, allOrders, nextCols);
      }
      refreshCustomers();

      // 3. If linked to an order, update order paid and due locally using net differential
      const storedOrds: Order[] = getOrders();
      const previousAmount = isEditing ? Number(editingCollection?.amount || 0) : 0;
      const previousOrderId = isEditing ? String(editingCollection?.order_id || "").trim() : "";
      const currentOrderId = targetOrder ? String(targetOrder.id).trim() : "";

      let updatedOrderPaid = 0;
      let updatedOrderDue = 0;
      let updatedOrderStatus = "Unpaid";

      let nextOrds: Order[] = [...storedOrds];

      // If the linked order was changed or unlinked during edit, revert previous collection amount from old order
      if (previousOrderId && previousOrderId !== currentOrderId) {
        const oldOrder = storedOrds.find((o) => String(o.id) === previousOrderId);
        if (oldOrder) {
          const revertedPaid = Math.max(0, r2((Number(oldOrder.paid_amount) || 0) - previousAmount));
          const totalAmt = Number(oldOrder.total_amount || 0);
          const revertedDue = Math.max(0, r2(totalAmt - revertedPaid));
          const revertedStatus = revertedDue <= 0 ? "Paid" : revertedPaid > 0 ? "Partial" : "Unpaid";
          nextOrds = nextOrds.map((o) =>
            String(o.id) === previousOrderId
              ? { ...o, paid_amount: revertedPaid, due_amount: revertedDue, payment_status: revertedStatus as any }
              : o
          );
          // Sync former order to Supabase in background
          supabase
            .from("orders")
            .update({
              paid_amount: revertedPaid,
              due_amount: revertedDue,
              payment_status: revertedStatus,
            })
            .eq("id", previousOrderId)
            .then(undefined, (err) => console.warn("Revert old order error:", err));
        }
      }

      if (targetOrder) {
        // Calculate net differential: newAmount - previousAmount
        const previousAmountForThisOrder = (isEditing && previousOrderId === currentOrderId) ? previousAmount : 0;
        const newAmount = Number(amt);
        const difference = r2(newAmount - previousAmountForThisOrder);

        const newPaid = Math.max(0, r2((Number(targetOrder.paid_amount) || 0) + difference));
        const totalAmt = Number(targetOrder.total_amount || 0);
        const newDue = Math.max(0, r2(totalAmt - newPaid));
        const newStatus = newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid";

        updatedOrderPaid = newPaid;
        updatedOrderDue = newDue;
        updatedOrderStatus = newStatus;

        nextOrds = nextOrds.map((o: Order) =>
          String(o.id) === String(targetOrder.id)
            ? { ...o, paid_amount: newPaid, due_amount: newDue, payment_status: newStatus as any }
            : o
        );
      }

      if (targetOrder || (previousOrderId && previousOrderId !== currentOrderId)) {
        saveOrders(nextOrds);
      }

      dispatchGlobalStateUpdate({ customerId: targetCustomer?.id, type: isEditing ? "collection_updated" : "collection_created" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
      }
      toast.success(isEditing ? (t("updated") || "Collection updated successfully") : (t("created") || "Collection recorded successfully"));
      onSaved?.(collectionRecord);
      onClose();

      // 4. Remote Supabase persistence (strictly aligned with physical collections schema)
      try {
        const cleanColPayload = sanitizeCollectionPayload({
          collection_number: colNum,
          customer_id: customerId,
          order_id: orderId || null,
          amount: amt,
          payment_method: paymentMethod || "Cash",
          collection_date: collectionDate ? new Date(collectionDate).toISOString() : new Date().toISOString(),
          collected_by: profile?.id || null,
          notes: finalNote || null,
        }, !isEditing);

        if (isEditing) {
          const { error: updErr } = await executeWithSchemaResilience("collections", cleanColPayload, (p) =>
            supabase.from("collections").update(p).eq("id", colId),
          );
          if (updErr) {
            toast.error("Cloud collection update error: " + updErr.message);
            return;
          }
        } else {
          const { data, error: insErr } = await executeWithSchemaResilience("collections", cleanColPayload, (p) =>
            supabase.from("collections").insert(p).select().single(),
          );
          const insertData: any = data;

          if (insErr || !insertData?.id) {
            toast.error("Cloud collection record error: " + (insErr?.message || "Failed to persist collection"));
            return;
          }

          const refreshedCols: Collection[] = getLocalData<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
          const reconciled: Collection[] = refreshedCols.map((item: Collection) =>
            item.id === colId ? ({ ...item, id: insertData.id, is_offline: false } as Collection) : item,
          );
          saveCollections(reconciled);
        }

        if (targetCustomer) {
          const cleanCustUpdate = sanitizeCustomerPayload({
            current_due: updatedCustDue,
            due_status: updatedCustStatus,
          });
          await supabase
            .from("customers")
            .update(cleanCustUpdate)
            .eq("id", targetCustomer.id);
        }

        if (targetOrder) {
          const cleanOrdUpdate = sanitizeOrderPayload({
            paid_amount: updatedOrderPaid,
            due_amount: updatedOrderDue,
            payment_status: updatedOrderStatus,
          });
          await supabase
            .from("orders")
            .update(cleanOrdUpdate)
            .eq("id", targetOrder.id);
        }

        dispatchGlobalStateUpdate({ customerId: targetCustomer?.id, type: "collection_synced" });
      } catch (syncErr: any) {
        toast.error("Database persistence error: " + (syncErr?.message || syncErr));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to record collection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={editingCollection ? "Edit Cash & Cheque Collection" : "Cash & Cheque Collection"} size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(e);
        }}
      >
        {/* Customer Select */}
        <div className="space-y-1.5">
          <Label>{t("selectCustomer")}</Label>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— Select Outlet / Customer —</option>
            {customers.map((c: Customer) => {
              const partyCode = (c.party_code || (c as any).partyCode || (c as any).code || "").trim();
              const outletName = (c.outlet_name || (c as any).outletName || c.name || "").trim();
              const area = (c.area || c.city || (c.territory as any)?.name || "").trim();
              const phone = (c.phone || "").trim();
              const details = [partyCode, area || phone].filter(Boolean).join(" - ");
              const label = details ? `${outletName} (${details})` : outletName;
              return (
                <option key={c.id} value={c.id}>
                  {label}
                </option>
              );
            })}
          </Select>

          {/* Clean info text / badge displaying customer.currentDue when selected */}
          {selectedCustomer && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground font-medium">
                {t("currentDue" as string) || "Current Due"}
              </span>
              <Badge
                variant={selectedCustomerDue > 0 ? "destructive" : "secondary"}
                className="font-semibold text-xs px-2 py-0.5"
              >
                {formatBDT(selectedCustomerDue)}
              </Badge>
            </div>
          )}
        </div>

        {/* Order Select (optional) */}
        <div className="space-y-1.5">
          <Label>{t("orderNumber" as string) || "Order (optional)"}</Label>
          <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">— Link to specific order (optional) —</option>
            {allOrders
              .filter((o: Order) => o.customer_id === customerId)
              .map((o: Order) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} (Due: {formatBDT(o.due_amount)})
                </option>
              ))}
          </Select>
        </div>

        {/* Amount and Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m: string) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Real-time Over-collection Warning Badge (LOW-002) */}
        {isOverCollection && (
          <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-in fade-in">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              {isBengaliMode()
                ? `বিজ্ঞপ্তি: প্রবেশ করানো পরিমাণ মোট বকেয়ার (${formatBDT(selectedCustomerDue)}) চেয়ে বেশি। অবশিষ্ট ${formatBDT(excessAmount)} টাকা অগ্রিম জমা হিসেবে ক্রেডিট হবে।`
                : `Note: Entered amount exceeds total due (${formatBDT(selectedCustomerDue)}). Remaining ${formatBDT(excessAmount)} will be credited as Advance Deposit.`}
            </p>
          </div>
        )}

        {/* Dynamic Cheque Details Sub-form */}
        {isCheque && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-3 transition-all animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CreditCard className="h-4 w-4" />
              <span>Cheque Information</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cheque Number *</Label>
                <Input
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="e.g. 123456"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bank Name</Label>
                <Input
                  list="modal-bank-options"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. City Bank, IBBL..."
                />
                <datalist id="modal-bank-options">
                  {BANGLADESH_BANKS.map((b: string) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Branch Name</Label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Motijheel Branch"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cheque Date</Label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Admin-only Settlement Waiver / Discount Section (BUG-015) */}
        {isUserAdmin && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Authorized Settlement Discount / Waiver (Admin Only)</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSettlementDiscount}
                  onChange={(e) => {
                    setEnableSettlementDiscount(e.target.checked);
                    if (!e.target.checked) {
                      setSettlementDiscount("");
                      setSettlementReason("");
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-muted-foreground">Enable</span>
              </label>
            </div>

            {enableSettlementDiscount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 animate-in fade-in">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Discount Amount (৳)</Label>
                  <Input
                    type="number"
                    value={settlementDiscount}
                    onChange={(e) => setSettlementDiscount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Approval Reason *</Label>
                  <Input
                    value={settlementReason}
                    onChange={(e) => setSettlementReason(e.target.value)}
                    placeholder="e.g. Prompt settlement waiver approved by Admin"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date */}
        <div className="space-y-1.5">
          <Label>{t("date")}</Label>
          <Input
            type="datetime-local"
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>{t("notes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Remarks, money receipt number, deposit details, etc."
          />
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export { CashCollectionModal as AddCollectionModal };
export default CashCollectionModal;
