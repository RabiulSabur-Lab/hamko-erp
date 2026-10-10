import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/utils";
import { generatePaymentReminder, formatHamkoPaymentReminder } from "@/services/geminiService";
import { getCustomerLedgerDetails } from "@/utils/localStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  Send,
  RefreshCw,
  AlertCircle,
  Pencil,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/lib/supabase";

export interface PaymentReminderModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  dueAmount?: number;
  lastPaymentDate?: string;
}

export function PaymentReminderModal({
  open,
  onClose,
  customer,
  dueAmount,
  lastPaymentDate,
}: PaymentReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [reminderText, setReminderText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic live due computation directly from customer.currentDue or live ledger recalculation
  const computeLiveDue = (cust: Customer | null, fallbackDue?: number): number => {
    if (!cust?.id) return fallbackDue || 0;
    // 1. Dynamic recalculation live: (Opening Balance + Total Orders - Total Collections)
    const ledger = getCustomerLedgerDetails(cust.id);
    if (ledger && typeof ledger.currentDue === "number" && !isNaN(ledger.currentDue)) {
      return ledger.currentDue;
    }
    // 2. Direct customer.currentDue check
    if (typeof (cust as any).currentDue === "number" && !isNaN((cust as any).currentDue)) {
      return (cust as any).currentDue;
    }
    if (typeof cust.current_due === "number" && !isNaN(cust.current_due)) {
      return cust.current_due;
    }
    return fallbackDue || 0;
  };

  const [liveDueAmount, setLiveDueAmount] = useState(() => computeLiveDue(customer, dueAmount));

  // Initialize draft immediately with exact requested template & dynamic variables upon open
  useEffect(() => {
    const currentDue = computeLiveDue(customer, dueAmount);
    setLiveDueAmount(currentDue);
    if (open && customer) {
      const custName = customer.outlet_name || customer.name;
      setReminderText(formatHamkoPaymentReminder(custName, currentDue));
      setIsEditing(false);
      setCopied(false);
      setError(null);
    } else {
      setIsEditing(false);
      setCopied(false);
      setError(null);
    }
  }, [open, customer?.id, dueAmount]);

  // Real-time state synchronization when new collections/orders occur
  useEffect(() => {
    const handleUpdate = () => {
      const freshDue = computeLiveDue(customer, dueAmount);
      setLiveDueAmount(freshDue);
      if (open && customer && !isEditing) {
        const custName = customer.outlet_name || customer.name;
        setReminderText(formatHamkoPaymentReminder(custName, freshDue));
      }
    };
    window.addEventListener("sales_erp_storage_update", handleUpdate);
    window.addEventListener("customer_ledger_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sales_erp_storage_update", handleUpdate);
      window.removeEventListener("customer_ledger_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [open, customer?.id, dueAmount, isEditing]);

  const handleGenerate = async () => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const custName = customer.outlet_name || customer.name;
      const currentDue = computeLiveDue(customer, dueAmount);
      setLiveDueAmount(currentDue);
      const text = await generatePaymentReminder(custName, currentDue, lastPaymentDate);
      setReminderText(text);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to generate payment reminder:", err);
      const custName = customer.outlet_name || customer.name;
      const currentDue = computeLiveDue(customer, dueAmount);
      setReminderText(formatHamkoPaymentReminder(custName, currentDue));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!reminderText) return;
    try {
      // Strip markdown asterisks for clean clipboard paste
      const plainText = reminderText.replace(/\*\*(.*?)\*\*/g, "$1");
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Reminder text copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const cleanPhone = customer?.phone?.replace(/[^0-9]/g, "") || "";
  const waPhone = cleanPhone.startsWith("0") ? `88${cleanPhone}` : cleanPhone;

  const handleOpenWhatsApp = () => {
    if (!reminderText) return;
    if (!waPhone) {
      toast.error("No phone number available for this customer");
      return;
    }
    // WhatsApp uses single asterisk *text* for bold rendering
    const waFormatted = reminderText.replace(/\*\*(.*?)\*\*/g, "*$1*");
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(waFormatted)}`;
    window.open(url, "_blank");
  };

  const handleSendSMS = () => {
    if (!reminderText) return;
    if (!cleanPhone) {
      toast.error("No phone number available for this customer");
      return;
    }
    // Clean plaintext for standard SMS gateways
    const smsClean = reminderText.replace(/\*\*(.*?)\*\*/g, "$1");
    const url = `sms:${cleanPhone}?body=${encodeURIComponent(smsClean)}`;
    window.open(url, "_blank");
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="" className="p-0 overflow-hidden">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="border-b bg-muted/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">
                  AI Payment Reminder Draft
                </h3>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  Gemini 1.5 Flash
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Polite & professional Bengali SMS / WhatsApp collection message
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Customer Due Summary Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-card">
            <div>
              <span className="text-xs text-muted-foreground">Recipient</span>
              <p className="text-sm font-semibold text-foreground">
                {customer.outlet_name || customer.name}
              </p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground font-mono">{customer.phone}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Outstanding Due</span>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                {formatBDT(liveDueAmount)}
              </p>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Text Area / Rendered Markdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <label className="font-medium text-foreground">Draft Message (Bengali)</label>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {isEditing ? "Editing Mode" : "Rendered Preview"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={isEditing ? "Switch to formatted preview" : "Edit draft text"}
                >
                  {isEditing ? <Eye className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  <span>{isEditing ? "Preview" : "Edit Text"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Regenerate with Gemini 1.5 Flash"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="h-44 border rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Generating reminder with Gemini 1.5 Flash...</span>
              </div>
            ) : isEditing ? (
              <Textarea
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                rows={6}
                style={{
                  fontFamily: "'Anek Bangla', 'Hind Siliguri', 'SolaimanLipi', cursive, sans-serif",
                  fontStyle: "italic",
                }}
                className="bengali-reminder-script text-[15px] sm:text-[16px] leading-relaxed italic resize-none focus-visible:ring-primary rounded-xl border-primary/30 bg-background shadow-xs p-4 text-foreground"
                placeholder="Message draft will appear here..."
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                title="Click to edit draft"
                className="bengali-reminder-script group relative cursor-text min-h-[145px] p-4 sm:p-5 rounded-xl border border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.08] hover:border-primary/40 transition-colors shadow-xs"
                style={{
                  fontFamily: "'Anek Bangla', 'Hind Siliguri', 'SolaimanLipi', cursive, sans-serif",
                  fontStyle: "italic",
                }}
              >
                <div className="text-[15px] sm:text-[16px] leading-relaxed tracking-wide italic text-foreground select-text">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ children }) => (
                        <strong className="font-bold font-semibold not-italic text-foreground">
                          {children}
                        </strong>
                      ),
                      p: ({ children }) => (
                        <p className="whitespace-pre-line leading-relaxed mb-3 last:mb-0">
                          {children}
                        </p>
                      ),
                    }}
                  >
                    {reminderText}
                  </ReactMarkdown>
                </div>
                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-background/90 text-muted-foreground flex items-center gap-1 shadow-xs border">
                    <Pencil className="h-2.5 w-2.5" /> Edit
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {isEditing
                ? "Click 'Preview' or outside to switch back to the rendered view."
                : "Rendered with bold formatting & Bengali cursive styling. Click box or 'Edit Text' to customize."}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-muted/30 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!reminderText || loading}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </Button>

            {customer.phone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendSMS}
                  disabled={!reminderText || loading}
                  className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>SMS</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenWhatsApp}
                  disabled={!reminderText || loading}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
