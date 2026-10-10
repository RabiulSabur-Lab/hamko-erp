import { createPortal } from "react-dom";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatBDT } from "@/lib/utils";
import { type Collection, type Customer } from "@/lib/supabase";
import {
  STORAGE_KEYS,
  getLocalData,
  getOrders,
  getCustomers,
  parseCustomerNotes,
  calculateCustomerDues,
} from "@/utils/localStore";
import { Printer, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUsers } from "@/context/UsersContext";

export interface CollectionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
}

/**
 * Resolves the exact CRM Customer Party Code.
 * Strictly checks in this order:
 * 1. customer.party_code
 * 2. customer.code
 * 3. customer.partyCode
 * 4. customer.outletCode
 * Displays "N/A" only if none of these explicit CRM properties exist on the customer object.
 */
export function resolvePartyCode(customer: any, collection?: any): string {
  // 1. customer.party_code
  if (customer?.party_code && typeof customer.party_code === "string" && customer.party_code.trim()) {
    return customer.party_code.trim();
  }

  // 2. customer.code
  if (customer?.code && typeof customer.code === "string" && customer.code.trim()) {
    return customer.code.trim();
  }

  // 3. customer.partyCode
  if (customer?.partyCode && typeof customer.partyCode === "string" && customer.partyCode.trim()) {
    return customer.partyCode.trim();
  }

  // customer.customerCode
  if (customer?.customerCode && typeof customer.customerCode === "string" && customer.customerCode.trim()) {
    return customer.customerCode.trim();
  }

  // 4. customer.outletCode / outlet_code
  if (customer?.outletCode && typeof customer.outletCode === "string" && customer.outletCode.trim()) {
    return customer.outletCode.trim();
  }
  if (customer?.outlet_code && typeof customer.outlet_code === "string" && customer.outlet_code.trim()) {
    return customer.outlet_code.trim();
  }

  // Check customer notes for [PARTY:...] tag
  const parsed = parseCustomerNotes(customer?.notes);
  if (parsed.party_code && parsed.party_code.trim()) {
    return parsed.party_code.trim();
  }

  // Check collection object attributes if not found on customer
  if (collection?.party_code && typeof collection.party_code === "string" && collection.party_code.trim()) {
    return collection.party_code.trim();
  }
  if (collection?.code && typeof collection.code === "string" && collection.code.trim()) {
    return collection.code.trim();
  }
  if (collection?.partyCode && typeof collection.partyCode === "string" && collection.partyCode.trim()) {
    return collection.partyCode.trim();
  }
  if (collection?.customerCode && typeof collection.customerCode === "string" && collection.customerCode.trim()) {
    return collection.customerCode.trim();
  }
  if (collection?.outletCode && typeof collection.outletCode === "string" && collection.outletCode.trim()) {
    return collection.outletCode.trim();
  }

  // Show "N/A" only if none of these explicit CRM properties exist
  return "N/A";
}

// Backwards-compatible export alias
export const formatPartyCode = resolvePartyCode;

/**
 * Converts a numeric amount into words supporting both English and Bengali formats
 * using South Asian denomination (Crore, Lakh, Thousand, Hundred, etc.).
 */
export function numberToWords(
  amount: number | null | undefined,
  lang: "en" | "bn" = "en"
): string {
  if (!amount || isNaN(Number(amount))) {
    return lang === "bn" ? "শূন্য টাকা মাত্র" : "Zero Taka Only";
  }
  const num = Math.floor(Math.abs(Number(amount)));
  if (num === 0) {
    return lang === "bn" ? "শূন্য টাকা মাত্র" : "Zero Taka Only";
  }

  if (lang === "bn") {
    const bnNumbers: Record<number, string> = {
      1: "এক", 2: "দুই", 3: "তিন", 4: "চার", 5: "পাঁচ", 6: "ছয়", 7: "সাত", 8: "আট", 9: "নয়",
      10: "দশ", 11: "এগারো", 12: "বারো", 13: "তেরো", 14: "চৌদ্দ", 15: "পনেরো", 16: "ষোলো",
      17: "সতেরো", 18: "আঠারো", 19: "উনিশ", 20: "বিশ", 21: "একুশ", 22: "বাইশ", 23: "তেইশ",
      24: "চব্বিশ", 25: "পঁচিশ", 26: "ছাব্বিশ", 27: "সাতাশ", 28: "আঠাশ", 29: "উনত্রিশ", 30: "ত্রিশ",
      31: "একত্রিশ", 32: "বত্রিশ", 33: "তেত্রিশ", 34: "চৌত্রিশ", 35: "পঁয়ত্রিশ", 36: "ছত্রিশ",
      37: "সাঁইত্রিশ", 38: "আটত্রিশ", 39: "উনচল্লিশ", 40: "চল্লিশ", 41: "একচল্লিশ", 42: "বিয়াল্লিশ",
      43: "তেতাল্লিশ", 44: "চুয়াল্লিশ", 45: "পঁয়তাল্লিশ", 46: "ছেচল্লিশ", 47: "সাতচল্লিশ",
      48: "আটচল্লিশ", 49: "উনপঞ্চাশ", 50: "পঞ্চাশ", 51: "একান্ন", 52: "বায়ান্ন", 53: "তিপ্পান্ন",
      54: "চুয়ান্ন", 55: "পঞ্চান্ন", 56: "ছাপ্পান্ন", 57: "সাতান্ন", 58: "আটান্ন", 59: "উনষাট",
      60: "ষাট", 61: "একষট্টি", 62: "বাষট্টি", 63: "তেষট্টি", 64: "চৌষট্টি", 65: "পঁয়ষট্টি",
      66: "ছেষট্টি", 67: "সাতষট্টি", 68: "আটষট্টি", 69: "উনসত্তর", 70: "সত্তর", 71: "একাত্তর",
      72: "বাহাত্তর", 73: "তিয়াত্তর", 74: "চুয়াত্তর", 75: "পঁচাত্তর", 76: "ছিয়াত্তর", 77: "সাতাত্তর",
      78: "আটাত্তর", 79: "উনাশি", 80: "আশি", 81: "একাশি", 82: "বিরাশি", 83: "তিরাশি", 84: "চুরাশি",
      85: "পঁচাশি", 86: "ছিয়াশি", 87: "সাতাশি", 88: "অষ্টআশি", 89: "উননব্বই", 90: "নব্বই",
      91: "একানব্বই", 92: "বিরানব্বই", 93: "তিরানব্বই", 94: "চুরানব্বই", 95: "পঁচানব্বই",
      96: "ছিয়ানব্বই", 97: "সাতানব্বই", 98: "আটানব্বই", 99: "নিরানব্বই"
    };

    const convertTwoDigitsBn = (n: number): string => (n === 0 ? "" : bnNumbers[n] || String(n));

    const convertThreeDigitsBn = (n: number): string => {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      let res = "";
      if (hundred) res += (bnNumbers[hundred] || String(hundred)) + " শত";
      if (rest) res += (res ? " " : "") + convertTwoDigitsBn(rest);
      return res;
    };

    const crore = Math.floor(num / 10000000);
    let remainder = num % 10000000;
    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    const thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    const hundredAndLess = remainder;

    const parts: string[] = [];
    if (crore > 0) parts.push(convertThreeDigitsBn(crore) + " কোটি");
    if (lakh > 0) parts.push(convertTwoDigitsBn(lakh) + " লক্ষ");
    if (thousand > 0) parts.push(convertTwoDigitsBn(thousand) + " হাজার");
    if (hundredAndLess > 0) parts.push(convertThreeDigitsBn(hundredAndLess));

    const res = parts.filter(Boolean).join(" ").trim();
    return (res || "শূন্য") + " টাকা মাত্র";
  }

  // English words converter
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? " " + ones[unit] : "");
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred) res += ones[hundred] + " Hundred";
    if (rest) res += (res ? " " : "") + convertTwoDigits(rest);
    return res;
  };

  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundredAndLess = remainder;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + " Crore");
  if (lakh > 0) parts.push(convertTwoDigits(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertTwoDigits(thousand) + " Thousand");
  if (hundredAndLess > 0) parts.push(convertThreeDigits(hundredAndLess));

  const res = parts.filter(Boolean).join(" ").trim();
  return (res || "Zero") + " Taka Only";
}

export function CollectionDetailsModal({
  open,
  onClose,
  collection,
}: CollectionDetailsModalProps) {
  const { lang } = useI18n();
  const isBn = lang === "bn";
  const { getUserName } = useUsers();

  if (!collection) return null;

  const collectorName = getUserName(
    collection.collected_by,
    collection.collector?.full_name || (collection as any).collector_name || (collection as any).collected_by_name || (collection as any).sales_rep_name || "Accounts"
  );

  const receiptNo =
    collection.collection_number || `COL-${String(collection.id).slice(0, 8)}`;

  // 1. Cross-reference collection's customer_id with actual CRM Customers list / localStore
  const allCustomers: Customer[] = getCustomers();
  const targetCustId = collection.customer_id || collection.customer?.id;

  let matchedCustomer: Customer | null = targetCustId
    ? (allCustomers.find((k: Customer) => String(k.id).trim() === String(targetCustId).trim()) || null)
    : null;

  // If not matched by ID, try matching via linked order
  if (!matchedCustomer && collection.order_id) {
    const allOrders = getOrders();
    const ord = allOrders.find((o: any) => String(o.id).trim() === String(collection.order_id).trim());
    if (ord && ord.customer_id) {
      matchedCustomer =
        allCustomers.find((k: Customer) => String(k.id).trim() === String(ord.customer_id).trim()) || null;
    }
  }

  // If not matched by ID or order, try matching by name
  const rawTargetName = (
    collection.customer?.outlet_name ||
    collection.customer?.name ||
    (collection as any)?.customer_name ||
    ""
  ).trim().toLowerCase();

  if (!matchedCustomer && rawTargetName) {
    matchedCustomer =
      allCustomers.find(
        (k: Customer) =>
          (k.outlet_name && k.outlet_name.trim().toLowerCase() === rawTargetName) ||
          (k.name && k.name.trim().toLowerCase() === rawTargetName)
      ) || null;
  }

  // Merge so full CRM customer details take precedence for party_code, code, phone, area
  const cust: any = {
    ...(collection.customer || {}),
    ...(matchedCustomer || {}),
  };

  const custName =
    cust?.outlet_name ||
    cust?.name ||
    (cust as any)?.outletName ||
    (collection as any)?.customer_name ||
    (isBn ? "সম্মানিত গ্রাহক" : "Valued Customer");

  // Strict Fallback Priority:
  // customer.party_code -> customer.code -> customer.partyCode -> customer.outletCode -> "N/A"
  const partyCode = resolvePartyCode(cust, collection);

  // 2. Resolve linked order details
  const allOrders = getOrders();
  const linkedOrder = collection.order_id
    ? allOrders.find((o: any) => String(o.id) === String(collection.order_id))
    : collection.order
    ? (allOrders.find((o: any) => o.order_number === collection.order?.order_number) || collection.order)
    : null;

  const resolvedOrderNo =
    linkedOrder?.order_number ||
    collection.order?.order_number ||
    (collection as any)?.order_number;

  // Linked Order or Purpose fallback
  const isAdvance =
    (collection.notes && collection.notes.toLowerCase().includes("advance")) ||
    (collection as any)?.is_advance;

  const linkedOrderDisplay = resolvedOrderNo
    ? resolvedOrderNo
    : isAdvance
    ? isBn
      ? "অগ্রিম প্রদান"
      : "Advance Payment"
    : isBn
    ? "বকেয়া সমন্বয়"
    : "Due Settlement";

  // 3. Balance Breakdown: Previous Due, Amount Paid, Remaining Due
  // HISTORICAL SNAPSHOT (BUG-019): Strictly prioritize snapshotted historical previous_due and remaining_due
  // so viewing or re-printing old receipts displays the exact balance snapshot recorded at collection time.
  const amountPaid = Number(collection.amount || 0);

  const snapshottedPrevDue =
    collection.previous_due !== undefined && collection.previous_due !== null
      ? Number(collection.previous_due)
      : collection.previousDue !== undefined && collection.previousDue !== null
      ? Number(collection.previousDue)
      : null;

  const snapshottedRemDue =
    collection.remaining_due !== undefined && collection.remaining_due !== null
      ? Number(collection.remaining_due)
      : collection.remainingDue !== undefined && collection.remainingDue !== null
      ? Number(collection.remainingDue)
      : null;

  // Fallback to customer's current balance only if historical collection record lacks a snapshot
  const liveCustomerDue = Number(cust?.current_due ?? cust?.currentDue ?? 0);

  const previousDue =
    snapshottedPrevDue !== null
      ? snapshottedPrevDue
      : isAdvance && liveCustomerDue === 0
      ? 0
      : Math.max(0, liveCustomerDue + amountPaid);

  const remainingDue =
    snapshottedRemDue !== null
      ? snapshottedRemDue
      : Math.max(0, previousDue - amountPaid);

  // 4. Amount in Words (localized)
  const inWords = numberToWords(collection.amount, isBn ? "bn" : "en");

  // 5. Remarks / Notes
  const remarks =
    collection.notes ||
    (collection as any)?.description ||
    (collection as any)?.remarks ||
    (collection as any)?.reference ||
    (collection as any)?.reference_number ||
    (collection as any)?.transaction_id ||
    null;

  if (!open || !collection) return null;

  function handlePrint() {
    document.body.classList.add("printing-collection");
    const cleanup = () => {
      document.body.classList.remove("printing-collection");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={
          isBn
            ? `মানি কালেকশন রসিদ: ${receiptNo}`
            : `Collection Receipt: ${receiptNo}`
        }
        size="md"
      >
        <div className="space-y-4">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              {isBn ? "ভাউচার রেফারেন্স:" : "Voucher Ref:"} {receiptNo}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>{isBn ? "প্রিন্ট রসিদ" : "Print Receipt"}</span>
            </Button>
          </div>

          {/* Receipt Card */}
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm print:hidden">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-emerald-100 font-semibold">
                  {isBn ? "অফিসিয়াল মানি রসিদ" : "OFFICIAL MONEY RECEIPT"}
                </p>
                <h3 className="text-base font-bold tracking-tight">
                  {isBn ? "মেসার্স স্বর্ণা এন্টারপ্রাইজ" : "M/S Swarna Enterprise"}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                  {receiptNo}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-4 space-y-3 text-sm">
              {/* Amount & Balance Breakdown Section */}
              <div className="space-y-2.5">
                {/* Amount Received Box */}
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      {isBn ? "আদায়কৃত টাকার পরিমাণ" : "AMOUNT RECEIVED"}
                    </p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                      {formatBDT(collection.amount)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-600 text-white font-semibold text-xs border-transparent flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isBn ? "পরিশোধিত" : "Payment Received"}</span>
                  </Badge>
                </div>

                {/* Amount In Words */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-md px-3 py-1.5 text-xs flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {isBn ? "কথায়:" : "In Words:"}
                  </span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400 italic">
                    {inWords}
                  </span>
                </div>

                {/* Balance Breakdown Section - Prominent Cards */}
                <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/60 text-center">
                  <div className="px-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isBn ? "পূর্বের বকেয়া" : "Previous Due"}
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {formatBDT(previousDue)}
                    </p>
                  </div>
                  <div className="border-x border-border/60 px-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isBn ? "আদায়কৃত অর্থ" : "Amount Paid"}
                    </p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatBDT(amountPaid)}
                    </p>
                  </div>
                  <div className="px-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isBn ? "বর্তমান অবশিষ্ট বকেয়া" : "Remaining Due"}
                    </p>
                    <p
                      className={`text-sm font-black mt-0.5 ${
                        remainingDue > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatBDT(remainingDue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid Customer & Transaction Metadata */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-muted/40 p-2.5 rounded-md border border-border/60">
                  <p className="text-muted-foreground font-medium">
                    {isBn ? "কাস্টমার / আউটলেট" : "Customer / Outlet"}
                  </p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {custName}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-muted-foreground font-medium">
                      {isBn ? "পার্টি কোড:" : "Party Code:"}
                    </span>
                    {partyCode && partyCode !== "N/A" ? (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] font-bold bg-primary/10 text-primary border-primary/20"
                      >
                        {partyCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground font-mono">N/A</span>
                    )}
                  </div>
                  {cust?.phone && (
                    <p className="text-muted-foreground text-[11px] mt-1">
                      {isBn ? "ফোন:" : "Phone:"} {cust.phone}
                    </p>
                  )}
                  {cust?.area && (
                    <p className="text-muted-foreground text-[11px]">
                      {isBn ? "এলাকা:" : "Area:"} {cust.area}
                    </p>
                  )}
                </div>

                <div className="bg-muted/40 p-2.5 rounded-md border border-border/60">
                  <p className="text-muted-foreground font-medium">
                    {isBn ? "তারিখ ও সময়" : "Date & Time"}
                  </p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatDate(collection.collection_date || collection.created_at)}
                  </p>

                  <div className="mt-2">
                    <p className="text-muted-foreground font-medium">
                      {isBn ? "পেমেন্ট মাধ্যম" : "Payment Mode"}
                    </p>
                    <Badge variant="secondary" className="mt-0.5 font-medium">
                      {collection.payment_method || (isBn ? "নগদ" : "Cash")}
                    </Badge>
                  </div>

                  <div className="mt-2">
                    <p className="text-muted-foreground font-medium">
                      {isBn ? "সংযুক্ত অর্ডার / বিবরণ" : "Linked Order / Purpose"}
                    </p>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        resolvedOrderNo ? "text-blue-600" : "text-amber-600"
                      }`}
                    >
                      {linkedOrderDisplay}
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="text-muted-foreground font-medium">
                      {isBn ? "আদায়কারী কর্মকর্তা" : "Collected By"}
                    </p>
                    <p className="font-semibold text-foreground text-xs mt-0.5">
                      {collectorName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank / Cheque details if applicable */}
              {(collection.bank_name || collection.cheque_number || collection.branch_name) && (
                <div className="bg-muted/30 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {isBn ? "ব্যাংক / চেক বিবরণ:" : "Bank / Cheque Information:"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    {collection.bank_name && (
                      <p>
                        <span className="font-medium text-foreground">
                          {isBn ? "ব্যাংক:" : "Bank:"}
                        </span>{" "}
                        {collection.bank_name}
                      </p>
                    )}
                    {collection.branch_name && (
                      <p>
                        <span className="font-medium text-foreground">
                          {isBn ? "শাখা:" : "Branch:"}
                        </span>{" "}
                        {collection.branch_name}
                      </p>
                    )}
                    {collection.cheque_number && (
                      <p className="font-mono">
                        <span className="font-medium text-foreground">
                          {isBn ? "চেক নং:" : "Cheque #:"}
                        </span>{" "}
                        {collection.cheque_number}
                      </p>
                    )}
                    {collection.cheque_date && (
                      <p>
                        <span className="font-medium text-foreground">
                          {isBn ? "চেকের তারিখ:" : "Cheque Date:"}
                        </span>{" "}
                        {formatDate(collection.cheque_date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks / Notes */}
              {remarks && (
                <div className="bg-muted/30 p-2.5 rounded-md border border-border/50 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {isBn ? "মন্তব্য / নোট: " : "Remarks / Notes: "}
                  </span>
                  {remarks}
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Printable Receipt Layout for window.print() */}
      {open && collection && typeof document !== "undefined" &&
        createPortal(
          <div id="print-collection-receipt" className="pdf-container print-container" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            <div
              style={{
                width: "100%",
                margin: "0 auto",
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#111827",
                backgroundColor: "#ffffff",
                boxSizing: "border-box",
              }}
            >
          {/* 1. Header Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              boxSizing: "border-box",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            {/* Left Side: Logo */}
            <div style={{ width: "120px", display: "flex", justifyContent: "flex-start", flexShrink: 0 }}>
              <img
                src="/Hamko.png"
                alt="Hamko Logo"
                style={{
                  height: "40px",
                  maxHeight: "40px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Center Section */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <h1
                className="pi-title"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', Times, serif",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#000",
                  margin: "0 0 2px 0",
                  lineHeight: 1.2,
                  textAlign: "center",
                }}
              >
                M/S Swarna Enterprise
              </h1>
              <p
                className="pi-subtitle"
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                  margin: 0,
                  lineHeight: 1.2,
                  textAlign: "center",
                }}
              >
                Bill of: Cookware Sales Unit
              </p>
            </div>

            {/* Right Spacer for true symmetry */}
            <div style={{ width: "120px", flexShrink: 0 }} />
          </div>

          {/* Clean Horizontal Line */}
          <hr className="pi-header-divider" style={{ borderTop: "2.5px solid #000000", borderBottom: "none", borderLeft: "none", borderRight: "none", margin: "8px 0", width: "100%" }} />

          {/* Document Heading */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            <div
              className="collection-badge"
              style={{
                display: "inline-block",
                padding: "3px 16px",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "12px",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {isBn ? "মানি কালেকশন রসিদ" : "MONEY COLLECTION RECEIPT"}
            </div>
          </div>

          {/* Customer & Transaction Meta Table */}
          <table
            style={{
              width: "100%",
              fontSize: "13px",
              fontFamily: "Arial, Helvetica, sans-serif",
              borderCollapse: "collapse",
              marginBottom: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <tbody>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 12px", width: "20%", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "রসিদ নং:" : "Receipt No:"}
                </td>
                <td style={{ padding: "8px 12px", width: "30%", fontWeight: "700", fontFamily: "monospace", color: "#111827" }}>
                  {receiptNo}
                </td>
                <td style={{ padding: "8px 12px", width: "20%", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "তারিখ ও সময়:" : "Date & Time:"}
                </td>
                <td style={{ padding: "8px 12px", width: "30%", fontWeight: "600", color: "#111827" }}>
                  {formatDate(collection.collection_date || collection.created_at)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 12px", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "কাস্টমার / আউটলেট:" : "Customer / Outlet:"}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: "700", color: "#111827" }}>
                  {custName}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "পার্টি কোড:" : "Party Code:"}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: "700", fontFamily: "monospace", color: "#059669" }}>
                  {partyCode}
                </td>
              </tr>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 12px", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "পেমেন্ট মাধ্যম:" : "Payment Mode:"}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: "600", color: "#111827" }}>
                  {collection.payment_method || (isBn ? "নগদ" : "Cash")}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: "600", color: "#4b5563" }}>
                  {isBn ? "সংযুক্ত অর্ডার / বিবরণ:" : "Linked Order / Purpose:"}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    color: resolvedOrderNo ? "#2563eb" : "#d97706",
                  }}
                >
                  {linkedOrderDisplay}
                </td>
              </tr>
              {(collection.bank_name || collection.cheque_number || cust?.phone) && (
                <tr>
                  <td style={{ padding: "8px 12px", fontWeight: "600", color: "#4b5563" }}>
                    {collection.bank_name || collection.cheque_number
                      ? isBn
                        ? "ব্যাংক / চেক বিবরণ:"
                        : "Bank / Cheque Details:"
                      : isBn
                      ? "যোগাযোগ ফোন:"
                      : "Contact Phone:"}
                  </td>
                  <td colSpan={3} style={{ padding: "8px 12px", color: "#111827" }}>
                    {collection.bank_name || collection.cheque_number ? (
                      <span>
                        {[
                          collection.bank_name,
                          collection.branch_name ? `(${collection.branch_name})` : null,
                          collection.cheque_number ? `Cheque #${collection.cheque_number}` : null,
                          collection.cheque_date ? `dated ${formatDate(collection.cheque_date)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </span>
                    ) : (
                      <span>{cust?.phone || "—"}</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Amount Box */}
          <div
            style={{
              border: "2px solid #059669",
              backgroundColor: "#ecfdf5",
              padding: "14px 20px",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#065f46",
                  display: "block",
                  textTransform: "uppercase",
                }}
              >
                {isBn ? "আদায়কৃত টাকার পরিমাণ:" : "AMOUNT RECEIVED:"}
              </span>
              <span
                style={{
                  fontSize: "26px",
                  fontWeight: "900",
                  color: "#047857",
                  letterSpacing: "-0.5px",
                }}
              >
                {formatBDT(collection.amount)}
              </span>
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#ffffff",
                backgroundColor: "#059669",
                padding: "6px 14px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              {isBn ? "পরিশোধিত" : "Payment Received"}
            </div>
          </div>

          {/* In Words Section */}
          <div
            style={{
              margin: "0 0 12px 0",
              padding: "8px 14px",
              backgroundColor: "#f0fdf4",
              border: "1px dashed #059669",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#1f2937",
            }}
          >
            <strong style={{ color: "#374151" }}>
              {isBn ? "কথায়: " : "In Words: "}
            </strong>
            <span style={{ fontStyle: "italic", fontWeight: "700", color: "#047857" }}>
              {inWords}
            </span>
          </div>

          {/* Balance Breakdown Prominent Cards (Aligned with Modal View) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {/* Card 1: Previous Due */}
            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {isBn ? "পূর্বের বকেয়া" : "Previous Due"}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginTop: "4px",
                }}
              >
                {formatBDT(previousDue)}
              </div>
            </div>

            {/* Card 2: Amount Paid */}
            <div
              style={{
                backgroundColor: "#ecfdf5",
                border: "1.5px solid #059669",
                borderRadius: "6px",
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#065f46",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {isBn ? "আদায়কৃত অর্থ" : "Amount Paid"}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#047857",
                  marginTop: "4px",
                }}
              >
                {formatBDT(amountPaid)}
              </div>
            </div>

            {/* Card 3: Remaining Due */}
            <div
              style={{
                backgroundColor: remainingDue > 0 ? "#fffbeb" : "#f0fdf4",
                border: remainingDue > 0 ? "1px solid #fde68a" : "1px solid #bbf7d0",
                borderRadius: "6px",
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: remainingDue > 0 ? "#b45309" : "#065f46",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {isBn ? "বর্তমান অবশিষ্ট বকেয়া" : "Remaining Due"}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: remainingDue > 0 ? "#b45309" : "#047857",
                  marginTop: "4px",
                }}
              >
                {formatBDT(remainingDue)}
              </div>
            </div>
          </div>

          {/* Remarks Section */}
          {remarks && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#374151",
                marginBottom: "24px",
              }}
            >
              <strong>{isBn ? "মন্তব্য / নোট: " : "Remarks / Notes: "}</strong>
              <span>{remarks}</span>
            </div>
          )}

          {/* Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "45px",
              paddingTop: "8px",
            }}
          >
            {/* Left: Customer / Depositor Signature */}
            <div style={{ textAlign: "center", width: "200px" }}>
              <div style={{ height: "40px" }} />
              <div
                style={{
                  borderTop: "1px dotted #4b5563",
                  paddingTop: "6px",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                {isBn ? "গ্রাহক / জমাকারীর স্বাক্ষর" : "Customer / Depositor Signature"}
              </div>
            </div>

            {/* Center: Dynamic Collector Signature */}
            <div style={{ textAlign: "center", width: "200px" }}>
              <div
                className="digital-signature-font"
                style={{
                  height: "40px",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  fontFamily: "'Yellowtail', cursive",
                  fontSize: "24px",
                  fontWeight: "400",
                  color: "#0f172a",
                  paddingBottom: "2px",
                  letterSpacing: "0.5px",
                  lineHeight: "1",
                }}
              >
                {collectorName || "Accounts"}
              </div>
              <div
                style={{
                  borderTop: "1px dotted #4b5563",
                  paddingTop: "6px",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "600",
                }}
              >
                {isBn ? "আদায়কারী" : "Collected By"}
              </div>
            </div>

            {/* Right: Authorized Officer Signature */}
            <div style={{ textAlign: "center", width: "200px" }}>
              <div style={{ height: "40px" }} />
              <div
                style={{
                  borderTop: "1px dotted #4b5563",
                  paddingTop: "6px",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                {isBn ? "অনুমোদিত কর্মকর্তার স্বাক্ষর" : "Authorized Officer Signature"}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
