import React, { useState, useEffect, useRef } from "react";
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
  getCustomerCurrentBalance,
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
  generateUuid,
  isValidUuid,
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

  const isDirtyRef = useRef(false);
  const prevOpenRef = useRef(false);
  const prevCollectionIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      isDirtyRef.current = false;
      return;
    }

    const currentColId = editingCollection?.id || null;
    const isNewOpen = !prevOpenRef.current && open;
    const isDifferentCollection = currentColId !== prevCollectionIdRef.current;

    // Only re-initialize form state if the modal just opened OR if switching to a different collection ID while not dirty.
    if (isNewOpen || (isDifferentCollection && !isDirtyRef.current)) {
      prevOpenRef.current = true;
      prevCollectionIdRef.current = currentColId;
      isDirtyRef.current = false;

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
        setEnableSettlementDiscount(Boolean((editingCollection as any).settlement_discount));
        setSettlementDiscount((editingCollection as any).settlement_discount || "");
        setSettlementReason((editingCollection as any).settlement_reason || "");
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
    }
  }, [open, editingCollection?.id]);

  const selectedCustomer: Customer | undefined = customers.find((c: Customer) => c.id === customerId);

  const [ledgerRevision, setLedgerRevision] = useState(0);
  useEffect(() => {
    const bump = () => setLedgerRevision((r) => r + 1);
    window.addEventListener("sales_erp_storage_update", bump);
    window.addEventListener("customer_ledger_updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("sales_erp_storage_update", bump);
      window.removeEventListener("customer_ledger_updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Unified Signed Running Balance Calculation from Master Ledger
  // Positive = Current Due, Negative = Advance Deposit
  const selectedCustomerBalance = React.useMemo(() => {
    if (!customerId) return null;
    return getCustomerCurrentBalance(customerId, {
      orders: allOrders,
      excludeCollectionId: editingCollection?.id,
    });
  }, [customerId, selectedCustomer, allOrders, editingCollection?.id, ledgerRevision]);

  const selectedCustomerSignedBalance = selectedCustomerBalance?.balance ?? 0;
  const selectedCustomerDue = selectedCustomerBalance?.currentDue ?? 0;
  const selectedCustomerAdvance = selectedCustomerBalance?.advanceDeposit ?? 0;

  const numericAmount = Number(amount) || 0;
  const activeSettlementDisc = enableSettlementDiscount && isUserAdmin ? (Number(settlementDiscount) || 0) : 0;
  const projectedBalanceAfter = r2(selectedCustomerSignedBalance - numericAmount - activeSettlementDisc);
  const isOverCollection = Boolean(
    customerId &&
    numericAmount > 0 &&
    projectedBalanceAfter < 0
  );
  const resultingAdvanceAmount = projectedBalanceAfter < 0 ? Math.abs(projectedBalanceAfter) : 0;

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
        : generateUuid();

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

      // Calculate exact signed balance snapshot for receipt from master ledger (preserves negative Advance Deposits)
      let prevDueCalc = 0;
      let remDueCalc = 0;
      if (targetCustomer?.id) {
        const balanceBefore = getCustomerCurrentBalance(targetCustomer.id, {
          orders: allOrders,
          excludeCollectionId: isEditing ? editingCollection?.id : undefined,
        });
        prevDueCalc = balanceBefore.balance;

        if (discAmt > 0 && discAmt > Math.max(0, r2(prevDueCalc - amt))) {
          toast.error("Settlement discount cannot exceed the remaining balance");
          setSaving(false);
          return;
        }

        // Exact signed post-collection balance (negative = Advance Deposit, positive = Remaining Due)
        remDueCalc = r2(prevDueCalc - amt - discAmt);
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
        _unsynced: true,
        _modifiedAt: Date.now(),
        is_offline: true,
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
          _unsynced: true,
          _modifiedAt: Date.now(),
          is_offline: true,
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

        await supabase.from("expenses").insert(cleanExpensePayload).then(undefined, (err) => console.warn("Supabase settlement discount expense insert notice:", err));
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
          // Sync former order to Supabase
          await supabase
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

      // 4. Remote Supabase persistence (strictly awaited before declaring success)
      const cleanColPayload = sanitizeCollectionPayload({
        id: colId,
        collection_number: colNum,
        customer_id: customerId,
        order_id: orderId || null,
        amount: amt,
        payment_method: paymentMethod || "Cash",
        collection_date: collectionDate ? new Date(collectionDate).toISOString() : new Date().toISOString(),
        collected_by: isValidUuid(profile?.id) ? profile?.id : null,
        notes: finalNote || null,
      }, !isEditing);

      if (isEditing) {
        const { error: updErr } = await supabase
          .from("collections")
          .update(cleanColPayload)
          .eq("id", colId);

        if (updErr) {
          toast.error("Cloud collection update error: " + updErr.message);
          return;
        }
      } else {
        const { error: insErr } = await supabase
          .from("collections")
          .insert(cleanColPayload);

        if (insErr) {
          toast.error("Cloud collection record error: " + insErr.message);
          return;
        }
      }

      // Update customer current_due in Supabase
      if (targetCustomer) {
        const cleanCustUpdate = sanitizeCustomerPayload({
          current_due: updatedCustDue,
          due_status: updatedCustStatus,
          updated_at: new Date().toISOString(),
        });
        await supabase
          .from("customers")
          .update(cleanCustUpdate)
          .eq("id", targetCustomer.id);
      }

      // Update order in Supabase if linked
      if (targetOrder) {
        const cleanOrdUpdate = sanitizeOrderPayload({
          paid_amount: updatedOrderPaid,
          due_amount: updatedOrderDue,
          payment_status: updatedOrderStatus,
          updated_at: new Date().toISOString(),
        });
        await supabase
          .from("orders")
          .update(cleanOrdUpdate)
          .eq("id", targetOrder.id);
      }

      // 5. Update local state and close modal ONLY on confirmed server response
      if (targetOrder || (previousOrderId && previousOrderId !== currentOrderId)) {
        saveOrders(nextOrds);
      }

      const refreshedCols: Collection[] = getLocalData<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
      if (isEditing) {
        const reconciled = refreshedCols.map((item: Collection) =>
          item.id === colId ? ({ ...collectionRecord, is_offline: false, _unsynced: false, _modifiedAt: Date.now() } as Collection) : item,
        );
        saveCollections(reconciled);
      } else {
        saveCollections([collectionRecord, ...refreshedCols.filter((c) => c.id !== colId)]);
      }

      dispatchGlobalStateUpdate({ customerId: targetCustomer?.id, type: isEditing ? "collection_updated" : "collection_created" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
      }

      toast.success(isEditing ? (t("updated") || "Collection updated successfully") : (t("created") || "Collection recorded successfully"));
      isDirtyRef.current = false;
      onSaved?.(collectionRecord);
      onClose();
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
          <Select value={customerId} onChange={(e) => { isDirtyRef.current = true; setCustomerId(e.target.value); }}>
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

          {/* Live Signed Account Status (Current Due or Advance Deposit) from Master Ledger */}
          {selectedCustomer && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground font-medium">
                {selectedCustomerSignedBalance < 0
                  ? (isBengaliMode() ? "বর্তমান অগ্রিম জমা" : "Current Advance Deposit")
                  : (t("currentDue" as string) || "Current Due")}
              </span>
              <Badge
                variant={
                  selectedCustomerSignedBalance > 0
                    ? "destructive"
                    : selectedCustomerSignedBalance < 0
                    ? "success"
                    : "secondary"
                }
                className="font-semibold text-xs px-2 py-0.5"
              >
                {selectedCustomerSignedBalance < 0
                  ? `Advance: ${formatBDT(selectedCustomerAdvance)}`
                  : formatBDT(selectedCustomerDue)}
              </Badge>
            </div>
          )}
        </div>

        {/* Order Select (optional) */}
        <div className="space-y-1.5">
          <Label>{t("orderNumber" as string) || "Order (optional)"}</Label>
          <Select value={orderId} onChange={(e) => { isDirtyRef.current = true; setOrderId(e.target.value); }}>
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
              onChange={(e) => { isDirtyRef.current = true; setAmount(e.target.value); }}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <Select
              value={paymentMethod}
              onChange={(e) => { isDirtyRef.current = true; setPaymentMethod(e.target.value); }}
            >
              {PAYMENT_METHODS.map((m: string) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Real-time Advance Deposit Credit Notice */}
        {isOverCollection && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <p>
              {selectedCustomerSignedBalance < 0
                ? isBengaliMode()
                  ? `বিজ্ঞপ্তি: গ্রাহকের ইতিমধ্যে ${formatBDT(selectedCustomerAdvance)} অগ্রিম জমা রয়েছে। এই আদায়ের পর মোট অগ্রিম জমা হবে ${formatBDT(resultingAdvanceAmount)}।`
                  : `Note: Customer already holds ${formatBDT(selectedCustomerAdvance)} Advance Deposit. Total Advance Deposit after this collection will be ${formatBDT(resultingAdvanceAmount)}.`
                : isBengaliMode()
                  ? `বিজ্ঞপ্তি: প্রবেশ করানো পরিমাণ মোট বকেয়ার (${formatBDT(selectedCustomerDue)}) চেয়ে বেশি। অবশিষ্ট ${formatBDT(resultingAdvanceAmount)} টাকা অগ্রিম জমা হিসেবে ক্রেডিট হবে।`
                  : `Note: Entered amount exceeds total due (${formatBDT(selectedCustomerDue)}). Remaining ${formatBDT(resultingAdvanceAmount)} will be credited as Advance Deposit.`}
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
                  onChange={(e) => { isDirtyRef.current = true; setChequeNo(e.target.value); }}
                  placeholder="e.g. 123456"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bank Name</Label>
                <Input
                  list="modal-bank-options"
                  value={bankName}
                  onChange={(e) => { isDirtyRef.current = true; setBankName(e.target.value); }}
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
                  onChange={(e) => { isDirtyRef.current = true; setBranchName(e.target.value); }}
                  placeholder="e.g. Motijheel Branch"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cheque Date</Label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => { isDirtyRef.current = true; setChequeDate(e.target.value); }}
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
                    isDirtyRef.current = true;
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
                    onChange={(e) => { isDirtyRef.current = true; setSettlementDiscount(e.target.value); }}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Approval Reason *</Label>
                  <Input
                    value={settlementReason}
                    onChange={(e) => { isDirtyRef.current = true; setSettlementReason(e.target.value); }}
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
            onChange={(e) => { isDirtyRef.current = true; setCollectionDate(e.target.value); }}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>{t("notes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => { isDirtyRef.current = true; setNotes(e.target.value); }}
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
