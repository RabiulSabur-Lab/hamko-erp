import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Customer } from "@/lib/supabase";
import { toast } from "sonner";

export interface LogVisitModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onSave: (payload: {
    customer_id: string;
    visit_date: string;
    purpose?: string;
    outcome?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => Promise<void> | void;
  saving?: boolean;
}

export function toDateTimeLocalString(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function LogVisitModal({
  open,
  onClose,
  customers = [],
  onSave,
  saving = false,
}: LogVisitModalProps) {
  const { t } = useI18n();

  const [customerId, setCustomerId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formErrors, setFormErrors] = useState<{
    customer_id?: string;
    visit_date?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setCustomerId("");
      setVisitDate(toDateTimeLocalString(new Date()));
      setPurpose("");
      setOutcome("");
      setNotes("");
      setCoords(null);
      setFormErrors({});
    }
  }, [open]);

  const [capturingLocation, setCapturingLocation] = useState(false);

  function captureLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.info("GPS is optional. Geolocation is not available on this device.");
      return;
    }
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturingLocation(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        toast.success("GPS location captured successfully");
      },
      (error) => {
        setCapturingLocation(false);
        console.warn("GPS capture skipped or failed (non-blocking):", error);
        // Fall back gracefully to null coordinates without blocking the submission
        setCoords(null);
        toast.info("GPS is optional: could not fetch exact location. You can proceed and save the visit.");
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const errors: { customer_id?: string; visit_date?: string } = {};

    if (!customerId || !customerId.trim()) {
      errors.customer_id = t("selectCustomer") || "Customer is required";
    }

    if (!visitDate || !visitDate.trim()) {
      errors.visit_date = "Visit date is required.";
    } else {
      const parsedDate = new Date(visitDate);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Anti-Fraud check: strictly block past dates prior to today
      if (parsedDate.getTime() < startOfToday.getTime()) {
        errors.visit_date = "Backdated visit logs are strictly prohibited. Visits must be recorded in real-time.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.visit_date) {
        toast.error(errors.visit_date);
      } else if (errors.customer_id) {
        toast.error(t("selectCustomer") || "Customer is required");
      }
      return;
    }

    // Convert local datetime to ISO string for backend/state storage
    const parsedDate = new Date(visitDate);
    const visitDateIso = !isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

    await onSave({
      customer_id: customerId,
      visit_date: visitDateIso,
      purpose: purpose.trim() || undefined,
      outcome: outcome.trim() || undefined,
      notes: notes.trim() || undefined,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("newVisit") || "Log Visit"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Customer Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="visit-customer-select">
            {t("selectCustomer")} <span className="text-destructive">*</span>
          </Label>
          <Select
            id="visit-customer-select"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              if (formErrors.customer_id) {
                setFormErrors((prev) => ({ ...prev, customer_id: undefined }));
              }
            }}
            className={formErrors.customer_id ? "border-destructive focus-visible:ring-destructive" : ""}
          >
            <option value="">—</option>
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
          {formErrors.customer_id && (
            <p className="text-xs text-destructive font-medium" data-testid="customer-id-error">
              {formErrors.customer_id}
            </p>
          )}
        </div>

        {/* 2. Visit Date / Time Field (with Required Validation) */}
        <div className="space-y-1.5">
          <Label htmlFor="visit-date-input">
            {t("visitDate") || "Visit Date / Time"} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="visit-date-input"
            name="visit_date"
            type="datetime-local"
            value={visitDate}
            min={toDateTimeLocalString(new Date(new Date().setHours(0, 0, 0, 0)))}
            onChange={(e) => {
              setVisitDate(e.target.value);
              if (formErrors.visit_date) {
                setFormErrors((prev) => ({ ...prev, visit_date: undefined }));
              }
            }}
            className={formErrors.visit_date ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {formErrors.visit_date && (
            <p className="text-xs text-destructive font-medium" data-testid="visit-date-error">
              {formErrors.visit_date}
            </p>
          )}
        </div>

        {/* 3. Purpose */}
        <div className="space-y-1.5">
          <Label htmlFor="visit-purpose-input">{t("purpose" as string) || "Purpose"}</Label>
          <Input
            id="visit-purpose-input"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Order collection, follow-up, delivery, etc."
          />
        </div>

        {/* 4. Outcome */}
        <div className="space-y-1.5">
          <Label htmlFor="visit-outcome-input">{t("outcome" as string) || "Outcome"}</Label>
          <Textarea
            id="visit-outcome-input"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            placeholder="Visit discussion results or agreements"
          />
        </div>

        {/* 5. Geo Location (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <span>Geo Location</span>
              <span className="text-[11px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                Optional
              </span>
            </Label>
            {coords && (
              <button
                type="button"
                onClick={() => setCoords(null)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                Clear GPS
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={captureLocation}
              disabled={capturingLocation}
              className="gap-2"
            >
              {capturingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
              {capturingLocation ? "Fetching GPS..." : coords ? "Update Location" : "Capture Location (Optional)"}
            </Button>
            {coords ? (
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                ✓ {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">
                Optional — leave blank if GPS unavailable
              </span>
            )}
          </div>
        </div>

        {/* 6. Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="visit-notes-input">{t("notes")}</Label>
          <Textarea
            id="visit-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional remarks"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
