import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, Store, Sparkles, Plus, ShieldCheck, ChevronDown, ChevronUp, MapPin, Compass } from "lucide-react";
import { BANGLADESH_BANKS } from "./CashCollectionModal";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase, type Customer } from "@/lib/supabase";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  optimisticAdd,
  optimisticUpdate,
  saveCustomer,
  getCustomers,
  getOrders,
  getCollections,
  getAreas,
  generatePartyCode,
  type Area,
  r2,
  getCustomerLedgerDetails,
  dispatchGlobalStateUpdate,
} from "@/utils/localStore";
import { AreaManagementModal } from "./AreaManagementModal";
import { sanitizeCustomerPayload, executeWithSchemaResilience } from "@/lib/payloadSanitizer";

export { generatePartyCode };

function generateClientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

export const PREDEFINED_AREAS = [
  "Mathbaria",
  "Bhandaria",
  "Pirojpur Sadar",
  "Kawkhali",
  "Nazirpur",
  "Nesarabad (Swarupkathi)",
  "Zianagar (Indurkani)",
  "Barishal Sadar",
  "Bakerganj",
  "Babuganj",
  "Wazirpur",
  "Banaripara",
  "Gournadi",
  "Agailjhara",
  "Mehendiganj",
  "Muladi",
  "Hizla",
  "Jhalokathi Sadar",
  "Nalchity",
  "Rajapur",
  "Kathalia",
  "Patuakhali Sadar",
  "Galachipa",
  "Bauphal",
  "Dumki",
  "Mirzaganj",
  "Kalapara",
  "Barguna Sadar",
  "Amtali",
  "Patharghata",
  "Betagi",
  "Bamna",
  "Taltali",
  "Dhaka Central",
  "Chattogram",
] as const;

const customerTypes = ["Dealer", "Retailer", "Wholesale"] as const;
const dueStatuses = ["Clear", "Overdue", "Partial"] as const;
const customerStatuses = ["Active", "Inactive"] as const;

// Centralized generatePartyCode imported from localStore.ts and re-exported above

/**
 * Parses party_code, area, alt_phone and security cheque metadata tags from customer notes string.
 */
export function parseCustomerNotes(rawNotes?: string | null): {
  party_code?: string;
  area?: string;
  alt_phone?: string;
  securityChequeNo?: string;
  securityBankName?: string;
  securityBranchName?: string;
  securityChequeDate?: string;
  securityNotes?: string;
  status?: "Active" | "Inactive" | string;
  cleanNotes?: string;
} {
  if (!rawNotes || typeof rawNotes !== "string") {
    return { cleanNotes: rawNotes || "" };
  }
  let party_code: string | undefined;
  let area: string | undefined;
  let alt_phone: string | undefined;
  let securityChequeNo: string | undefined;
  let securityBankName: string | undefined;
  let securityBranchName: string | undefined;
  let securityChequeDate: string | undefined;
  let securityNotes: string | undefined;
  let status: "Active" | "Inactive" | string | undefined;

  const statusMatch = rawNotes.match(/\[STATUS:([^\]]+)\]/i);
  if (statusMatch) {
    const rawSt = statusMatch[1].trim();
    if (rawSt.toLowerCase() === "inactive") status = "Inactive";
    else if (rawSt.toLowerCase() === "active") status = "Active";
    else status = rawSt;
  }

  const partyMatch = rawNotes.match(/\[PARTY:([^\]]+)\]/i);
  if (partyMatch) party_code = partyMatch[1].trim();

  const areaMatch = rawNotes.match(/\[AREA:([^\]]+)\]/i);
  if (areaMatch) area = areaMatch[1].trim();

  const altMatch = rawNotes.match(/\[ALT:([^\]]+)\]/i);
  if (altMatch) alt_phone = altMatch[1].trim();

  const secChequeMatch = rawNotes.match(/\[SEC_CHEQUE:([^\]]+)\]/i);
  if (secChequeMatch) securityChequeNo = secChequeMatch[1].trim();

  const secBankMatch = rawNotes.match(/\[SEC_BANK:([^\]]+)\]/i);
  if (secBankMatch) securityBankName = secBankMatch[1].trim();

  const secBranchMatch = rawNotes.match(/\[SEC_BRANCH:([^\]]+)\]/i);
  if (secBranchMatch) securityBranchName = secBranchMatch[1].trim();

  const secDateMatch = rawNotes.match(/\[SEC_DATE:([^\]]+)\]/i);
  if (secDateMatch) securityChequeDate = secDateMatch[1].trim();

  const secNotesMatch = rawNotes.match(/\[SEC_NOTES:([^\]]+)\]/i);
  if (secNotesMatch) securityNotes = secNotesMatch[1].trim();

  const cleanNotes = rawNotes
    .replace(/\[STATUS:[^\]]+\]/gi, "")
    .replace(/\[PARTY:[^\]]+\]/gi, "")
    .replace(/\[AREA:[^\]]+\]/gi, "")
    .replace(/\[ALT:[^\]]+\]/gi, "")
    .replace(/\[SEC_CHEQUE:[^\]]+\]/gi, "")
    .replace(/\[SEC_BANK:[^\]]+\]/gi, "")
    .replace(/\[SEC_BRANCH:[^\]]+\]/gi, "")
    .replace(/\[SEC_DATE:[^\]]+\]/gi, "")
    .replace(/\[SEC_NOTES:[^\]]+\]/gi, "")
    .trim();

  return {
    party_code,
    area,
    alt_phone,
    securityChequeNo,
    securityBankName,
    securityBranchName,
    securityChequeDate,
    securityNotes,
    status,
    cleanNotes: cleanNotes || undefined,
  };
}

/**
 * Encodes party_code, area, alt_phone and security cheque metadata tags into notes for cross-system persistence.
 */
export function encodeCustomerNotes(
  userNotes?: string | null,
  partyCode?: string | null,
  area?: string | null,
  altPhone?: string | null,
  securityChequeNo?: string | null,
  securityBankName?: string | null,
  securityBranchName?: string | null,
  securityChequeDate?: string | null,
  securityNotes?: string | null,
  status?: string | null
): string | null {
  const metaTags = [
    status && status === "Inactive" ? `[STATUS:Inactive]` : status === "Active" ? `[STATUS:Active]` : status ? `[STATUS:${status.trim()}]` : "",
    partyCode ? `[PARTY:${partyCode.trim()}]` : "",
    area ? `[AREA:${area.trim()}]` : "",
    altPhone ? `[ALT:${altPhone.trim()}]` : "",
    securityChequeNo ? `[SEC_CHEQUE:${securityChequeNo.trim()}]` : "",
    securityBankName ? `[SEC_BANK:${securityBankName.trim()}]` : "",
    securityBranchName ? `[SEC_BRANCH:${securityBranchName.trim()}]` : "",
    securityChequeDate ? `[SEC_DATE:${securityChequeDate.trim()}]` : "",
    securityNotes ? `[SEC_NOTES:${securityNotes.trim()}]` : "",
  ].filter(Boolean).join("");

  const cleanNotes = userNotes ? userNotes.trim() : "";
  if (metaTags && cleanNotes) return `${metaTags} ${cleanNotes}`;
  if (metaTags) return metaTags;
  return cleanNotes || null;
}

export interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  existingCustomers?: Customer[];
  onSaved?: (customer: Customer) => void;
}

export function AddCustomerModal({
  open,
  onClose,
  customer = null,
  existingCustomers = [],
  onSaved,
}: AddCustomerModalProps) {
  const { t } = useI18n();
  const { profile, user } = useAuth();
  const isEditing = Boolean(customer && customer.id);

  const [saving, setSaving] = useState(false);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [customAreaText, setCustomAreaText] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [altPhoneTouched, setAltPhoneTouched] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const [form, setForm] = useState<Partial<Customer>>({
    name: "",
    outlet_name: "",
    party_code: "",
    area: "Mathbaria",
    customer_type: "Retailer",
    contact_person: "",
    phone: "",
    alt_phone: "",
    address: "",
    trade_license_number: "",
    opening_balance: 0,
    current_due: 0,
    due_status: "Clear",
    notes: "",
    status: "Active",
    is_active: true,
    securityChequeNo: "",
    securityBankName: "",
    securityBranchName: "",
    securityChequeDate: "",
    securityNotes: "",
    postal_code: "",
    latitude: null,
    longitude: null,
  });

  // Geo-Fenced GPS Live Location Capture State
  const [capturingGps, setCapturingGps] = useState(false);

  const captureLiveGps = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error("Geolocation is not supported by this browser");
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCapturingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((prev: any) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        if (!silent) toast.success(`Live store GPS captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      (err) => {
        setCapturingGps(false);
        if (!silent) {
          console.error("GPS capture error:", err);
          toast.error("Unable to get high accuracy GPS location: " + err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Source list of all customers to determine next Party Code
  const allCustomers: Customer[] = useMemo(() => {
    if (existingCustomers && existingCustomers.length > 0) return existingCustomers;
    return getCustomers();
  }, [existingCustomers, open]);

  const [availableAreas, setAvailableAreas] = useState<Area[]>(() => getAreas());
  const [areaModalOpen, setAreaModalOpen] = useState(false);

  // Sync available areas on storage event
  useEffect(() => {
    const handleSync = () => {
      setAvailableAreas(getAreas());
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("sales_erp_storage_update", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("sales_erp_storage_update", handleSync);
    };
  }, []);

  // Sync modal state whenever opened or customer changes
  useEffect(() => {
    if (!open) return;
    setPhoneTouched(false);
    setAltPhoneTouched(false);

    const liveAreas = getAreas();
    setAvailableAreas(liveAreas);

    if (customer) {
      const currentArea = customer.area || "";
      const isPredefined = liveAreas.some((a) => a.name.toLowerCase() === currentArea.toLowerCase());
      setIsCustomArea(!isPredefined && Boolean(currentArea));
      setCustomAreaText(!isPredefined ? currentArea : "");

      const parsed = parseCustomerNotes(customer.notes);
      const secCheque = customer.securityChequeNo || (customer as any).security_cheque_no || parsed.securityChequeNo || "";
      const secBank = customer.securityBankName || (customer as any).security_bank_name || parsed.securityBankName || "";
      const secBranch = customer.securityBranchName || (customer as any).security_branch_name || parsed.securityBranchName || "";
      const secDate = customer.securityChequeDate || (customer as any).security_cheque_date || parsed.securityChequeDate || "";
      const secNotes = customer.securityNotes || (customer as any).security_notes || parsed.securityNotes || "";

      setSecurityOpen(Boolean(secCheque || secBank || secBranch || secDate || secNotes));

      setForm({
        ...customer,
        name: customer.outlet_name || customer.name || "",
        outlet_name: customer.outlet_name || customer.name || "",
        party_code: customer.party_code || "",
        area: currentArea || "Mathbaria",
        alt_phone: customer.alt_phone || "",
        phone: customer.phone || "",
        address: customer.address || "",
        postal_code: customer.postal_code || (customer as any).postalCode || "",
        latitude: customer.latitude ?? null,
        longitude: customer.longitude ?? null,
        opening_balance: customer.opening_balance ?? 0,
        current_due: customer.current_due ?? 0,
        due_status: customer.due_status ?? "Clear",
        status: customer.status || (customer.is_active === false ? "Inactive" : "Active"),
        is_active: (customer.status ? customer.status === "Active" : customer.is_active !== false),
        notes: parsed.cleanNotes !== undefined ? parsed.cleanNotes : (customer.notes || ""),
        trade_license_number: customer.trade_license_number || "",
        securityChequeNo: secCheque,
        securityBankName: secBank,
        securityBranchName: secBranch,
        securityChequeDate: secDate,
        securityNotes: secNotes,
      });
    } else {
      // Default to first active area or Mathbaria for new outlet
      const defaultArea = (liveAreas && liveAreas[0]?.name) || "Mathbaria";
      setIsCustomArea(false);
      setCustomAreaText("");
      setSecurityOpen(false);
      const initialPartyCode = generatePartyCode(defaultArea, allCustomers);

      setForm({
        name: "",
        outlet_name: "",
        party_code: initialPartyCode,
        area: defaultArea,
        customer_type: "Retailer",
        contact_person: "",
        phone: "",
        alt_phone: "",
        address: "",
        postal_code: "",
        latitude: null,
        longitude: null,
        trade_license_number: "",
        opening_balance: 0,
        current_due: 0,
        due_status: "Clear",
        notes: "",
        status: "Active",
        is_active: true,
        securityChequeNo: "",
        securityBankName: "",
        securityBranchName: "",
        securityChequeDate: "",
        securityNotes: "",
      });

      // Automatically capture live GPS coordinates on onboarding a new store
      captureLiveGps(true);
    }
  }, [open, customer, allCustomers]);

  // Handle Area Selection & dynamic Party Code recalculation
  function handleAreaChange(selectedArea: string) {
    if (selectedArea === "__CUSTOM__") {
      setIsCustomArea(true);
      const activeArea = customAreaText.trim() || "Area";
      const nextCode = generatePartyCode(activeArea, allCustomers, customer?.id);
      setForm((prev) => ({
        ...prev,
        area: activeArea,
        party_code: nextCode,
      }));
    } else {
      setIsCustomArea(false);
      const nextCode = generatePartyCode(selectedArea, allCustomers, customer?.id);
      setForm((prev) => ({
        ...prev,
        area: selectedArea,
        party_code: nextCode,
      }));
    }
  }

  function handleCustomAreaTextChange(val: string) {
    setCustomAreaText(val);
    const activeArea = val.trim() || "Area";
    const nextCode = generatePartyCode(activeArea, allCustomers, customer?.id);
    setForm((prev) => ({
      ...prev,
      area: val,
      party_code: nextCode,
    }));
  }

  function handleRegenerateCode() {
    const activeArea = isCustomArea ? customAreaText.trim() : (form.area || (availableAreas && availableAreas[0]?.name) || "Mathbaria");
    const newCode = generatePartyCode(activeArea, allCustomers, customer?.id);
    setForm((prev) => ({ ...prev, party_code: newCode }));
    toast.info(`Party code updated: ${newCode}`);
  }

  async function handleSave(e?: React.FormEvent | React.MouseEvent) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const outletName = (form.outlet_name || form.name || "").trim();
    if (!outletName) {
      toast.error("Outlet Name is required");
      return;
    }
    if (!form.customer_type) {
      toast.error("Customer Type is required");
      return;
    }

    // 11-Digit Phone Number Validation
    const primaryPhone = (form.phone || "").trim().replace(/\D/g, "");
    if (!primaryPhone || primaryPhone.length !== 11 || !/^\d{11}$/.test(primaryPhone)) {
      setPhoneTouched(true);
      toast.error("Phone number must be exactly 11 digits");
      return;
    }

    const altPhone = (form.alt_phone || "").trim().replace(/\D/g, "");
    if (altPhone && (altPhone.length !== 11 || !/^\d{11}$/.test(altPhone))) {
      setAltPhoneTouched(true);
      toast.error("Alternative phone number must be exactly 11 digits");
      return;
    }

    const finalArea = isCustomArea ? customAreaText.trim() : (form.area?.trim() || "Mathbaria");
    const finalPartyCode = form.party_code?.trim() || generatePartyCode(finalArea, allCustomers, customer?.id);

    setSaving(true);
    try {
      const secCheque = form.securityChequeNo?.trim() || null;
      const secBank = form.securityBankName?.trim() || null;
      const secBranch = form.securityBranchName?.trim() || null;
      const secChequeDate = form.securityChequeDate?.trim() || null;
      const secNotes = form.securityNotes?.trim() || null;

      const finalStatus: "Active" | "Inactive" =
        form.status === "Inactive" || form.is_active === false ? "Inactive" : "Active";
      const finalIsActive = finalStatus === "Active";

      const payload: Partial<Customer> = {
        name: outletName,
        outlet_name: outletName,
        party_code: finalPartyCode,
        area: finalArea,
        customer_type: form.customer_type,
        contact_person: form.contact_person?.trim() || null,
        phone: primaryPhone,
        alt_phone: altPhone || null,
        address: form.address?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
        latitude: form.latitude !== null && form.latitude !== undefined && !isNaN(Number(form.latitude)) ? Number(form.latitude) : null,
        longitude: form.longitude !== null && form.longitude !== undefined && !isNaN(Number(form.longitude)) ? Number(form.longitude) : null,
        trade_license_number: form.trade_license_number?.trim() || null,
        opening_balance: r2(Number(form.opening_balance) || 0),
        current_due: r2(Number(form.current_due) || 0),
        due_status: form.due_status ?? "Clear",
        notes: form.notes?.trim() || null,
        status: finalStatus,
        is_active: finalIsActive,
        securityChequeNo: secCheque,
        securityBankName: secBank,
        securityBranchName: secBranch,
        securityChequeDate: secChequeDate,
        securityNotes: secNotes,
        security_cheque_no: secCheque,
        security_bank_name: secBank,
        security_branch_name: secBranch,
        security_cheque_date: secChequeDate,
        security_notes: secNotes,
      };

      if (isEditing && customer) {
        const customerId = String(customer.id).trim();
        const updatedRecord: Customer = {
          ...customer,
          ...payload,
          status: finalStatus,
          is_active: finalIsActive,
          updated_at: new Date().toISOString(),
        } as Customer;

        // 1. Optimistic Local Store update
        saveCustomer(updatedRecord);

        // 2. Cascade update to orders (STORAGE_KEYS.ORDERS)
        const allOrders = getOrders();
        let ordersChanged = false;
        const cascadedOrders = allOrders.map((o: any) => {
          if (String(o.customer_id || "").trim() === customerId) {
            ordersChanged = true;
            return {
              ...o,
              customer_name: outletName,
              customer: {
                ...(o.customer || {}),
                id: customer.id,
                name: outletName,
                outlet_name: outletName,
                party_code: finalPartyCode,
                area: finalArea,
                phone: payload.phone ?? o.customer?.phone,
                alt_phone: payload.alt_phone ?? o.customer?.alt_phone,
                address: payload.address ?? o.customer?.address,
                customer_type: payload.customer_type ?? o.customer?.customer_type,
                status: finalStatus,
                is_active: finalIsActive,
              },
            };
          }
          return o;
        });
        if (ordersChanged) {
          setLocalData(STORAGE_KEYS.ORDERS, cascadedOrders);
        }

        // 3. Cascade update to collections (STORAGE_KEYS.COLLECTIONS)
        const allCols = getCollections();
        let colsChanged = false;
        const cascadedCols = allCols.map((col: any) => {
          if (String(col.customer_id || "").trim() === customerId) {
            colsChanged = true;
            return {
              ...col,
              customer_name: outletName,
              customer: {
                ...(col.customer || {}),
                id: customer.id,
                name: outletName,
                outlet_name: outletName,
                party_code: finalPartyCode,
                area: finalArea,
                status: finalStatus,
                is_active: finalIsActive,
              },
            };
          }
          return col;
        });
        if (colsChanged) {
          setLocalData(STORAGE_KEYS.COLLECTIONS, cascadedCols);
        }

        // 4. Cascade update to route plans
        const allRoutes = getLocalData<any>(STORAGE_KEYS.ROUTE_PLAN);
        if (Array.isArray(allRoutes) && allRoutes.length > 0) {
          let routesChanged = false;
          const cascadedRoutes = allRoutes.map((r: any) => {
            if (String(r.customer_id || "").trim() === customerId) {
              routesChanged = true;
              return {
                ...r,
                name: outletName,
                address: payload.address !== undefined ? payload.address : r.address,
                area: finalArea,
                party_code: finalPartyCode,
                phone: payload.phone !== undefined ? payload.phone : r.phone,
              };
            }
            return r;
          });
          if (routesChanged) {
            setLocalData(STORAGE_KEYS.ROUTE_PLAN, cascadedRoutes);
          }
        }

        // Recalculate customer ledger to ensure due reflects new opening balance & orders/collections
        getCustomerLedgerDetails(customerId, undefined, undefined, { persist: true });

        dispatchGlobalStateUpdate({ customerId, type: "customer_updated" });
        toast.success(t("updated") || "Outlet updated successfully");
        onSaved?.(updatedRecord);
        onClose();

        // 5. Remote Supabase persistence (clean schema payload with notes metadata)
        try {
          const combinedNotes = encodeCustomerNotes(
            payload.notes,
            finalPartyCode,
            finalArea,
            payload.alt_phone,
            secCheque,
            secBank,
            secBranch,
            secChequeDate,
            secNotes,
            finalStatus
          );

          const validCustType = ["Dealer", "Retailer", "Wholesale"].includes(String(payload.customer_type || ""))
            ? String(payload.customer_type)
            : "Retailer";
          const validDueStatus = ["Clear", "Overdue", "Partial"].includes(String(payload.due_status))
            ? payload.due_status
            : (Number(payload.current_due || 0) > 0 ? "Partial" : "Clear");

          // Standard Supabase customers table columns (is_active is boolean; notes holds metadata tag)
          const supabasePayload: Record<string, any> = {
            name: outletName,
            customer_type: validCustType,
            contact_person: payload.contact_person || null,
            phone: payload.phone || null,
            address: payload.address || null,
            city: finalArea || null,
            trade_license_number: payload.trade_license_number || null,
            opening_balance: Number(payload.opening_balance ?? 0),
            current_due: Number(payload.current_due ?? 0),
            due_status: validDueStatus,
            notes: combinedNotes,
            latitude: payload.latitude ?? null,
            longitude: payload.longitude ?? null,
            is_active: finalIsActive,
            updated_at: new Date().toISOString(),
          };

          const cleanPayload = sanitizeCustomerPayload(supabasePayload);
          const res = await executeWithSchemaResilience("customers", cleanPayload, (p) =>
            supabase.from("customers").update(p).eq("id", customer.id),
          );

          if (res.error) {
            toast.error("Failed to update customer: " + res.error.message);
            return;
          }

          saveCustomer({ id: customer.id, is_offline: false, _unsynced: false });
        } catch (err: any) {
          toast.error("Failed to update customer: " + (err?.message || "Network error"));
          return;
        }
      } else {
        // Create New Customer / Outlet directly in Supabase Central Database
        const creatorId = (isValidUuid(profile?.id) ? profile?.id : null) || (isValidUuid(user?.id) ? user?.id : null);
        const creatorName = profile?.full_name || null;
        const newUuid = generateClientUuid();

        const combinedNotes = encodeCustomerNotes(
          payload.notes,
          finalPartyCode,
          finalArea,
          payload.alt_phone,
          secCheque,
          secBank,
          secBranch,
          secChequeDate,
          secNotes,
          finalStatus
        );

        const validCustType = ["Dealer", "Retailer", "Wholesale"].includes(String(payload.customer_type || ""))
          ? String(payload.customer_type)
          : "Retailer";
        const validDueStatus = ["Clear", "Overdue", "Partial"].includes(String(payload.due_status))
          ? payload.due_status
          : (Number(payload.current_due || 0) > 0 ? "Partial" : "Clear");

        const rawSupabasePayload: Record<string, any> = {
          id: newUuid,
          name: outletName,
          customer_type: validCustType,
          contact_person: payload.contact_person || null,
          phone: payload.phone || null,
          address: payload.address || null,
          city: finalArea || null,
          trade_license_number: payload.trade_license_number || null,
          opening_balance: Number(payload.opening_balance ?? 0),
          current_due: Number(payload.current_due ?? 0),
          due_status: validDueStatus,
          notes: combinedNotes,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          assigned_to: creatorId,
          is_active: finalIsActive,
        };

        const cleanPayload = sanitizeCustomerPayload(rawSupabasePayload, true);

        let res = await executeWithSchemaResilience("customers", cleanPayload, (p) =>
          supabase.from("customers").insert(p).select().single(),
        );

        // If FK constraint fails on assigned_to, retry with assigned_to: null
        if (res.error && (res.error.code === "23503" || res.error.message?.includes("foreign key"))) {
          console.warn("[AddCustomer] FK violation on assigned_to; retrying with assigned_to: null:", res.error.message);
          cleanPayload.assigned_to = null;
          res = await executeWithSchemaResilience("customers", cleanPayload, (p) =>
            supabase.from("customers").insert(p).select().single(),
          );
        }

        if (res.error || !res.data) {
          toast.error("Failed to create customer: " + (res.error?.message || "Database insert error"));
          return;
        }

        const remoteCustomer = res.data;
        const newRecord: Customer = {
          id: remoteCustomer.id,
          ...payload,
          assigned_to: remoteCustomer.assigned_to || creatorId,
          assigned_to_name: creatorName,
          created_by_name: creatorName,
          status: finalStatus,
          is_active: finalIsActive,
          opening_balance: payload.opening_balance ?? 0,
          current_due: payload.current_due ?? 0,
          due_status: payload.due_status ?? "Clear",
          created_at: remoteCustomer.created_at || new Date().toISOString(),
          updated_at: remoteCustomer.updated_at || new Date().toISOString(),
        } as Customer;

        saveCustomer(newRecord);
        window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail: { customer: newRecord } }));
        dispatchGlobalStateUpdate({ customerId: remoteCustomer.id, type: "customer_created" });
        toast.success(t("created") || "Outlet created successfully");
        onSaved?.(newRecord);
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit Outlet (${form.name || ""})` : "Add New Outlet"}
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(e);
        }}
      >
        {/* Top Header Banner */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 border border-primary/15 text-xs text-primary">
          <Store className="h-4 w-4 shrink-0 text-primary" />
          <span>
            {isEditing
              ? "Update retail outlet profile and contact information."
              : "Register a new retail store / dealer outlet with an automated party code."}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Outlet Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-sm font-semibold flex items-center justify-between">
              <span>Outlet Name *</span>
              <span className="text-xs text-muted-foreground font-normal">Store / Shop / Business Name</span>
            </Label>
            <Input
              value={form.outlet_name ?? form.name ?? ""}
              onChange={(e) =>
                setForm({ ...form, outlet_name: e.target.value, name: e.target.value })
              }
              placeholder="e.g., M/S Fatema Enterprise or Bhuiyan Store"
              autoFocus
            />
          </div>

          {/* Area / Market Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Area / Market *</Label>
              <button
                type="button"
                onClick={() => setAreaModalOpen(true)}
                className="text-[11px] text-primary flex items-center gap-1 hover:underline cursor-pointer"
                title="Add new area or manage existing areas"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>+ Add / Manage Areas</span>
              </button>
            </div>
            <Select
              value={isCustomArea ? "__CUSTOM__" : form.area || (availableAreas[0]?.name || "Mathbaria")}
              onChange={(e) => {
                if (e.target.value === "__NEW_AREA__") {
                  setAreaModalOpen(true);
                } else {
                  handleAreaChange(e.target.value);
                }
              }}
            >
              {availableAreas.map((ar) => (
                <option key={ar.id} value={ar.name}>
                  {ar.name} ({ar.code_prefix})
                </option>
              ))}
              <option value="__NEW_AREA__">+ Add New Area...</option>
              <option value="__CUSTOM__">+ Other / Custom Area</option>
            </Select>
            {isCustomArea && (
              <Input
                className="mt-1.5"
                placeholder="Enter custom Area / Market name"
                value={customAreaText}
                onChange={(e) => handleCustomAreaTextChange(e.target.value)}
              />
            )}
          </div>

          {/* Dynamic Party Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <span>Party Code</span>
                <Sparkles className="h-3 w-3 text-amber-500" />
              </Label>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="text-[11px] text-primary flex items-center gap-1 hover:underline cursor-pointer"
                title="Regenerate next sequential code for this area"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Auto-generate</span>
              </button>
            </div>
            <Input
              value={form.party_code ?? ""}
              onChange={(e) => setForm({ ...form, party_code: e.target.value.toUpperCase() })}
              placeholder="e.g., SDR-0123"
              className="font-mono uppercase tracking-wider font-semibold bg-muted/40"
            />
            <p className="text-[10px] text-muted-foreground">
              Format: 3-letter Prefix + 4-digit serial (e.g., SDR-0001, SDR-0123). Auto-increments per area.
            </p>
          </div>

          {/* Customer Type */}
          <div className="space-y-1.5">
            <Label>{t("customerType")}</Label>
            <Select
              value={form.customer_type ?? "Retailer"}
              onChange={(e) => setForm({ ...form, customer_type: e.target.value as any })}
            >
              {customerTypes.map((ty) => (
                <option key={ty} value={ty}>
                  {t(ty.toLowerCase())}
                </option>
              ))}
            </Select>
          </div>

          {/* Contact Person */}
          <div className="space-y-1.5">
            <Label>{t("contactPerson")}</Label>
            <Input
              value={form.contact_person ?? ""}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              placeholder="e.g., Md. Rafiqul Islam (Proprietor)"
            />
          </div>

          {/* Primary Phone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Phone (Primary) *</Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {(form.phone || "").length}/11
              </span>
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={form.phone ?? ""}
              onBlur={() => setPhoneTouched(true)}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                setForm({ ...form, phone: numericOnly });
              }}
              placeholder="017XXXXXXXX (11 digits)"
              className={
                phoneTouched && (form.phone || "").length !== 11
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {phoneTouched && (form.phone || "").length !== 11 && (
              <p className="text-xs text-destructive font-medium">
                Phone number must be exactly 11 digits
              </p>
            )}
          </div>

          {/* Alternative Phone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Alternative Phone (Optional)</Label>
              {Boolean(form.alt_phone) && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(form.alt_phone || "").length}/11
                </span>
              )}
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={form.alt_phone ?? ""}
              onBlur={() => setAltPhoneTouched(true)}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                setForm({ ...form, alt_phone: numericOnly });
              }}
              placeholder="018XXXXXXXX (11 digits)"
              className={
                altPhoneTouched && Boolean(form.alt_phone) && (form.alt_phone || "").length !== 11
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {altPhoneTouched && Boolean(form.alt_phone) && (form.alt_phone || "").length !== 11 && (
              <p className="text-xs text-destructive font-medium">
                Alternative phone number must be exactly 11 digits
              </p>
            )}
          </div>

          {/* Trade License / NID */}
          <div className="space-y-1.5">
            <Label>{t("tradeLicense")}</Label>
            <Input
              value={form.trade_license_number ?? ""}
              onChange={(e) => setForm({ ...form, trade_license_number: e.target.value })}
              placeholder="Trade License or NID number"
            />
          </div>

          {/* Opening Balance */}
          <div className="space-y-1.5">
            <Label>Opening Balance (BDT)</Label>
            <Input
              type="number"
              value={form.opening_balance ?? 0}
              onChange={(e) => {
                const ob = Number(e.target.value);
                setForm((prev) => {
                  const shouldSyncDue =
                    !isEditing &&
                    (prev.current_due === undefined ||
                      prev.current_due === prev.opening_balance ||
                      prev.current_due === 0);
                  const newDue = shouldSyncDue ? ob : (prev.current_due ?? 0);
                  return {
                    ...prev,
                    opening_balance: ob,
                    current_due: newDue,
                    due_status:
                      newDue <= 0 ? "Clear" : prev.due_status === "Clear" ? "Partial" : prev.due_status,
                  };
                });
              }}
            />
          </div>

          {/* Current Due & Due Status */}
          <div className="space-y-1.5">
            <Label>Current Due (BDT)</Label>
            <Input
              type="number"
              value={form.current_due ?? 0}
              onChange={(e) => {
                const cd = Number(e.target.value);
                setForm((prev) => ({
                  ...prev,
                  current_due: cd,
                  due_status: cd <= 0 ? "Clear" : prev.due_status === "Clear" ? "Partial" : prev.due_status,
                }));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("dueStatus")}</Label>
            <Select
              value={form.due_status ?? "Clear"}
              onChange={(e) => setForm({ ...form, due_status: e.target.value as any })}
            >
              {dueStatuses.map((d) => (
                <option key={d} value={d}>
                  {t(d.toLowerCase())}
                </option>
              ))}
            </Select>
          </div>

          {/* Status (Active / Inactive) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Status</Label>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  (form.status || (form.is_active === false ? "Inactive" : "Active")) === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                }`}
              >
                {form.status || (form.is_active === false ? "Inactive" : "Active")}
              </span>
            </div>
            <Select
              value={form.status || (form.is_active === false ? "Inactive" : "Active")}
              onChange={(e) => {
                const val = e.target.value as "Active" | "Inactive";
                setForm({ ...form, status: val, is_active: val === "Active" });
              }}
            >
              {customerStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </div>

          {/* Detailed Address Textarea */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address (Detailed Location)</Label>
            <Textarea
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              placeholder="Holding / Shop No, Road No, Bazaar / Stand Landmark"
            />
          </div>

          {/* Geo-Fenced GPS Live Location & Postal Code Section */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-3 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Geo-Fenced Store Location & Postal Code
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => captureLiveGps(false)}
                disabled={capturingGps}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {capturingGps ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Compass className="h-3.5 w-3.5" />
                )}
                {capturingGps ? "Acquiring GPS..." : "Capture Live Store GPS"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Postal / PIN Code</Label>
                <Input
                  value={form.postal_code ?? ""}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  placeholder="e.g. 8560"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Latitude (GPS)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude ?? ""}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Auto-captured (e.g. 22.7234)"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Longitude (GPS)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude ?? ""}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Auto-captured (e.g. 90.3541)"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {form.latitude && form.longitude ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                ✓ Geo-fence locked: {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)} (Ready for route navigation)
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Click &quot;Capture Live Store GPS&quot; while standing at the storefront to enable automatic route navigation.
              </p>
            )}
          </div>

          {/* Security Guarantee / Security Cheque Collapsible Section */}
          <div className="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden sm:col-span-2">
            <button
              type="button"
              onClick={() => setSecurityOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300/40">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Security Guarantee / Security Cheque
                    </span>
                    {(form.securityChequeNo || form.securityBankName) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded">
                        Active Cheque
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guarantee cheque number, bank name, branch & credit security terms
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                <span>{securityOpen ? "Hide" : "Add / Edit"}</span>
                {securityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {securityOpen && (
              <div className="p-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 grid gap-3 sm:grid-cols-2 bg-background/80">
                {/* Security Cheque Number */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Security Cheque Number</Label>
                  <Input
                    value={form.securityChequeNo ?? ""}
                    onChange={(e) => setForm({ ...form, securityChequeNo: e.target.value })}
                    placeholder="e.g., CD-9023412 or Cheque No"
                    className="font-mono text-sm uppercase"
                  />
                </div>

                {/* Bank Name with autocomplete datalist */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bank Name</Label>
                  <Input
                    list="security-banks-list"
                    value={form.securityBankName ?? ""}
                    onChange={(e) => setForm({ ...form, securityBankName: e.target.value })}
                    placeholder="e.g., Dutch-Bangla Bank (DBBL), Islami Bank..."
                  />
                  <datalist id="security-banks-list">
                    {BANGLADESH_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                {/* Branch Name */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Branch Name</Label>
                  <Input
                    value={form.securityBranchName ?? ""}
                    onChange={(e) => setForm({ ...form, securityBranchName: e.target.value })}
                    placeholder="e.g., Motijheel Branch, Dhaka / Mathbaria Branch"
                  />
                </div>

                {/* Security Cheque Received Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Security Cheque Received Date</Label>
                  <Input
                    type="date"
                    value={form.securityChequeDate ?? ""}
                    onChange={(e) => setForm({ ...form, securityChequeDate: e.target.value })}
                  />
                </div>

                {/* Security Notes / Guarantee Terms */}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Security Notes / Guarantee Terms</Label>
                  <Input
                    value={form.securityNotes ?? ""}
                    onChange={(e) => setForm({ ...form, securityNotes: e.target.value })}
                    placeholder="e.g., ৳5,00,000 guarantee against 30-day credit limit"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Additional remarks, credit limit preferences, etc."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {t("save")}
          </Button>
        </div>
      </form>

      {/* Dynamic Area Management Modal */}
      <AreaManagementModal
        open={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        onSelectArea={(newAreaName) => {
          setAvailableAreas(getAreas());
          handleAreaChange(newAreaName);
        }}
      />
    </Dialog>
  );
}
