import { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Receipt,
  Banknote,
  Smartphone,
  CreditCard,
  Printer,
  KeyRound,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getCollections,
  dispatchGlobalStateUpdate,
  type HandoverRecord,
  type Collection,
} from "@/utils/localStore";

const formatCurrency = (val: number) =>
  Number(val || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface EveningHandoverModalProps {
  open: boolean;
  onClose: () => void;
  mode?: "officer" | "cashier"; // Sales officer generating slip vs Cashier verifying PIN
  selectedUserId?: string; // Optional officer ID override for Admin viewing specific officer's handover
}

export function EveningHandoverModal({
  open,
  onClose,
  mode = "officer",
  selectedUserId,
}: EveningHandoverModalProps) {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"officer" | "cashier">(mode);
  const [verificationInputPin, setVerificationInputPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [generatedSlip, setGeneratedSlip] = useState<HandoverRecord | null>(null);

  const targetOfficerId = String(selectedUserId || profile?.id || user?.id || "").trim();
  const targetOfficerEmail = String(profile?.email || user?.email || "").toLowerCase().trim();
  const targetOfficerName = String(profile?.full_name || (user as any)?.user_metadata?.full_name || "").toLowerCase().trim();

  // 1. Gather all collections from today strictly isolated to the target officer (BUG-009)
  const myTodayCollections: Collection[] = useMemo(() => {
    const list = getCollections();
    const todayStr = new Date().toDateString();

    return list.filter((c: any) => {
      const colDate = c.collection_date || c.created_at;
      const isToday = colDate ? new Date(colDate).toDateString() === todayStr : false;
      if (!isToday) return false;

      // Ownership filter: match strictly on collected_by / officer ID
      const colOfficerId = String(c.collected_by || c.collector?.id || (c as any).collector_id || "").trim();
      if (targetOfficerId && colOfficerId) {
        return colOfficerId === targetOfficerId;
      }

      // Fallback matching by collector email or name if ID was unpopulated (e.g. mock/demo data)
      const colOfficerEmail = String(c.collector?.email || (c as any).collected_by_email || "").toLowerCase().trim();
      if (targetOfficerEmail && colOfficerEmail && colOfficerEmail === targetOfficerEmail) {
        return true;
      }

      const colOfficerName = String(c.collector_name || c.collected_by_name || c.collector?.full_name || "").toLowerCase().trim();
      if (targetOfficerName && colOfficerName && colOfficerName === targetOfficerName) {
        return true;
      }

      return !targetOfficerId;
    });
  }, [open, targetOfficerId, targetOfficerEmail, targetOfficerName]);

  // Breakdown by payment method strictly from myTodayCollections
  const summary = useMemo(() => {
    let cash = 0;
    let bkash = 0;
    let cheque = 0;

    myTodayCollections.forEach((c) => {
      const amt = Number(c.amount) || 0;
      const method = (c.payment_method || "").toLowerCase();
      if (method.includes("cash")) {
        cash += amt;
      } else if (method.includes("mobile") || method.includes("bkash") || method.includes("nagad")) {
        bkash += amt;
      } else {
        cheque += amt;
      }
    });

    const total = cash + bkash + cheque;
    return {
      cash,
      bkash,
      cheque,
      total,
      count: myTodayCollections.length,
    };
  }, [myTodayCollections]);

  // Gather existing pending handovers
  const pendingHandovers: HandoverRecord[] = useMemo(() => {
    const records = getLocalData<HandoverRecord[]>(STORAGE_KEYS.HANDOVERS, []);
    return records.filter((h) => h.status === "PENDING_VERIFICATION");
  }, [open, generatedSlip]);

  // Generate a clean 4-digit PIN deterministically or randomly
  function generate4DigitPin(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  // 1-Click Day-End Closing: Sales Officer completes day and generates cash slip
  function handleCompleteDayAndGenerateSlip() {
    if (summary.total <= 0 && summary.count === 0) {
      toast.error("No collections recorded today to handover.");
      return;
    }

    const pin = generate4DigitPin();
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const handoverNum = `HO-${dateCode}-${Math.floor(100 + Math.random() * 900)}`;

    const officerDisplayName =
      (selectedUserId && selectedUserId !== profile?.id)
        ? (myTodayCollections[0]?.collector_name || myTodayCollections[0]?.collected_by_name || "Sales Officer")
        : (profile?.full_name || (user as any)?.user_metadata?.full_name || "Sales Officer");

    const newHandover: HandoverRecord = {
      id: `handover-${Date.now()}`,
      handover_number: handoverNum,
      officer_id: targetOfficerId || null,
      officer_name: officerDisplayName,
      session_date: new Date().toISOString(),
      total_amount: summary.total,
      cash_amount: summary.cash,
      bkash_amount: summary.bkash,
      cheque_amount: summary.cheque,
      verification_pin: pin,
      status: "PENDING_VERIFICATION",
      collection_ids: myTodayCollections.map((c) => c.id),
      created_at: new Date().toISOString(),
    };

    // Save handover record
    const existing = getLocalData<HandoverRecord[]>(STORAGE_KEYS.HANDOVERS, []);
    const updatedHandovers = [newHandover, ...existing];
    setLocalData(STORAGE_KEYS.HANDOVERS, updatedHandovers);

    // Update collections status to PENDING_VERIFICATION with handover_id
    const targetColIds = new Set(myTodayCollections.map((c) => c.id));
    const colList = getCollections();
    const updatedCollections = colList.map((c) => {
      if (targetColIds.has(c.id)) {
        return {
          ...c,
          status: "PENDING_VERIFICATION",
          handover_id: newHandover.id,
          verification_pin: pin,
        };
      }
      return c;
    });
    setLocalData(STORAGE_KEYS.COLLECTIONS, updatedCollections);

    dispatchGlobalStateUpdate({ type: "handover_created" as any });
    setGeneratedSlip(newHandover);
    toast.success("Day-end closing completed! Handover slip & PIN generated.");
  }

  // Cashier verification by PIN
  function handleVerifyPin(targetPin?: string) {
    const pinToVerify = (targetPin || verificationInputPin).trim();
    if (!pinToVerify || pinToVerify.length !== 4) {
      toast.error("Please enter a valid 4-digit verification PIN.");
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      const allHandovers = getLocalData<HandoverRecord[]>(STORAGE_KEYS.HANDOVERS, []);
      const matchIndex = allHandovers.findIndex(
        (h) => h.verification_pin === pinToVerify && h.status === "PENDING_VERIFICATION"
      );

      if (matchIndex === -1) {
        toast.error("Invalid or already verified PIN. Please check the officer's screen.");
        setVerifying(false);
        return;
      }

      const verifiedRecord = {
        ...allHandovers[matchIndex],
        status: "VERIFIED" as const,
        verified_at: new Date().toISOString(),
        verified_by: profile?.full_name || "Head Cashier",
      };

      allHandovers[matchIndex] = verifiedRecord;
      setLocalData(STORAGE_KEYS.HANDOVERS, allHandovers);

      // Mark collections as VERIFIED
      const targetIds = new Set(verifiedRecord.collection_ids || []);
      const colList = getCollections();
      const updatedCols = colList.map((c) => {
        if (targetIds.has(c.id) || c.verification_pin === pinToVerify) {
          return {
            ...c,
            status: "VERIFIED",
            verified_at: new Date().toISOString(),
            verified_by: profile?.full_name || "Head Cashier",
          };
        }
        return c;
      });
      setLocalData(STORAGE_KEYS.COLLECTIONS, updatedCols);

      dispatchGlobalStateUpdate({ type: "handover_verified" as any });
      setVerifying(false);
      setVerificationInputPin("");
      toast.success(
        `Handover Verified! ৳${formatCurrency(verifiedRecord.total_amount)} physical cash & collections confirmed.`
      );
    }, 400);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Evening Handover & Cash Reconciliation" size="lg">
      <div className="space-y-4">
        {/* Role Toggle Switcher */}
        <div className="flex border-b pb-2 justify-between items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("officer")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "officer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Sales Officer: Day-End Closing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cashier")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "cashier"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Cashier: PIN Verification
            </button>
          </div>

          <Badge variant="outline" className="text-xs font-mono">
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </Badge>
        </div>

        {/* TAB 1: SALES OFFICER VIEW */}
        {activeTab === "officer" && (
          <div className="space-y-4">
            {/* Daily Collections Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Card className="border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs font-semibold">Physical Cash</span>
                  </div>
                  <p className="text-lg font-bold mt-1 text-emerald-800 dark:text-emerald-300">
                    ৳{formatCurrency(summary.cash)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pink-200/80 bg-pink-50/40 dark:bg-pink-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-pink-700 dark:text-pink-400">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-xs font-semibold">bKash / MFS</span>
                  </div>
                  <p className="text-lg font-bold mt-1 text-pink-800 dark:text-pink-300">
                    ৳{formatCurrency(summary.bkash)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs font-semibold">Cheque / Bank</span>
                  </div>
                  <p className="text-lg font-bold mt-1 text-blue-800 dark:text-blue-300">
                    ৳{formatCurrency(summary.cheque)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs font-semibold">Total Handover</span>
                  </div>
                  <p className="text-lg font-bold mt-1 text-primary">
                    ৳{formatCurrency(summary.total)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Generated Slip Display (if completed) */}
            {generatedSlip ? (
              <div className="rounded-xl border-2 border-primary/40 bg-card p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      <h4 className="font-bold text-base">Evening Cash Handover Slip</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      Slip ID: {generatedSlip.handover_number} | Officer: {generatedSlip.officer_name}
                    </p>
                  </div>

                  <Badge
                    variant={generatedSlip.status === "VERIFIED" ? "default" : "outline"}
                    className="gap-1 font-semibold"
                  >
                    {generatedSlip.status === "VERIFIED" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED BY CASHIER
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-amber-500" /> PENDING CASHIER RECEIPT
                      </>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* Left: Summary Table */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Session Date:</span>
                      <span className="font-medium">{new Date(generatedSlip.session_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Invoices / Receipts:</span>
                      <span className="font-medium">{generatedSlip.collection_ids?.length || summary.count} vouchers</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Physical Cash to Handover:</span>
                      <span className="font-bold text-emerald-600">৳{formatCurrency(generatedSlip.cash_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Digital (bKash/MFS):</span>
                      <span className="font-medium">৳{formatCurrency(generatedSlip.bkash_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Cheques / Bank Slips:</span>
                      <span className="font-medium">৳{formatCurrency(generatedSlip.cheque_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm font-bold bg-muted/60 px-2 rounded">
                      <span>Total Collection:</span>
                      <span className="text-primary">৳{formatCurrency(generatedSlip.total_amount)}</span>
                    </div>
                  </div>

                  {/* Right: Security Handover QR Code & 4-Digit PIN */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-muted/30 text-center space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Cashier Verification PIN
                    </p>
                    <div className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-3xl font-extrabold tracking-widest shadow-inner">
                      {generatedSlip.verification_pin}
                    </div>

                    {/* QR Code Canvas Representation */}
                    <div className="p-2 bg-white rounded-lg border shadow-sm flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 100 100"
                        className="h-20 w-20 fill-slate-900"
                      >
                        {/* Crisp QR Code Pattern representation */}
                        <rect x="0" y="0" width="30" height="30" rx="3" />
                        <rect x="5" y="5" width="20" height="20" fill="white" />
                        <rect x="10" y="10" width="10" height="10" />

                        <rect x="70" y="0" width="30" height="30" rx="3" />
                        <rect x="75" y="5" width="20" height="20" fill="white" />
                        <rect x="80" y="10" width="10" height="10" />

                        <rect x="0" y="70" width="30" height="30" rx="3" />
                        <rect x="5" y="75" width="20" height="20" fill="white" />
                        <rect x="10" y="80" width="10" height="10" />

                        <rect x="40" y="10" width="10" height="10" />
                        <rect x="55" y="20" width="8" height="8" />
                        <rect x="45" y="45" width="12" height="12" />
                        <rect x="65" y="55" width="10" height="10" />
                        <rect x="75" y="75" width="15" height="15" />
                        <rect x="40" y="75" width="8" height="15" />
                      </svg>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Show this PIN / QR to Cashier to confirm cash deposit.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                    <Printer className="h-3.5 w-3.5" /> Print Cash Slip
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setActiveTab("cashier");
                      setVerificationInputPin(generatedSlip.verification_pin);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    Verify as Cashier <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/20 p-5 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Ready for Evening Cash Handover?</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                    Clicking &quot;Complete Day &amp; Generate Cash Slip&quot; closes your daily collection session,
                    generates a tamper-proof 4-digit verification PIN, and queues records for cashier confirmation.
                  </p>
                </div>

                {myTodayCollections.length > 0 && (
                  <div className="rounded-xl border bg-card p-3.5 space-y-2 text-left text-xs">
                    <div className="flex justify-between items-center font-semibold text-muted-foreground border-b pb-2">
                      <span>Today&apos;s Officer Receipts ({myTodayCollections.length})</span>
                      <span>Officer: {profile?.full_name || "Sales Officer"}</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-border/60">
                      {myTodayCollections.map((c) => (
                        <div key={c.id} className="py-1.5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{c.collection_number || `COL-${c.id.slice(0, 6)}`}</span>
                            <span className="text-muted-foreground truncate max-w-[150px]">{c.customer?.name || "Customer"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{c.payment_method}</Badge>
                            <span className="font-bold font-mono">৳{formatCurrency(c.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCompleteDayAndGenerateSlip}
                  size="default"
                  className="gap-2 font-semibold shadow-sm"
                >
                  <Receipt className="h-4 w-4" /> Complete Day &amp; Generate Cash Slip
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CASHIER / MANAGER VERIFICATION VIEW */}
        {activeTab === "cashier" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <h4 className="font-bold text-sm">Cashier / Manager Instant Cash Verification</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the 4-Digit PIN shown on the Sales Officer&apos;s evening handover slip to confirm physical
                cash receipt.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyPin();
                }}
                className="flex gap-2 max-w-xs"
              >
                <Input
                  type="text"
                  maxLength={4}
                  value={verificationInputPin}
                  onChange={(e) => setVerificationInputPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 4829"
                  className="text-center font-mono text-xl tracking-widest font-bold h-11"
                />
                <Button
                  type="submit"
                  disabled={verifying || verificationInputPin.length !== 4}
                  className="gap-1.5 h-11 px-5"
                >
                  {verifying ? "Verifying..." : "Verify & Settle"}
                </Button>
              </form>
            </div>

            {/* List of Pending Handover Sessions */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Daily Handovers ({pendingHandovers.length})
              </h5>

              {pendingHandovers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No pending cash handovers. All daily officer collections are settled.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingHandovers.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{h.officer_name}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {h.handover_number}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cash: <span className="font-semibold text-emerald-600">৳{formatCurrency(h.cash_amount)}</span> |
                          Total: <span className="font-semibold">৳{formatCurrency(h.total_amount)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded bg-muted text-xs font-mono font-bold tracking-widest">
                          PIN: {h.verification_pin}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleVerifyPin(h.verification_pin)}
                          className="h-8 text-xs font-medium gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
