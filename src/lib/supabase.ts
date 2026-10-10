import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  "https://rkjelornojeooqufcuwk.supabase.co";

export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramVsb3Jub2plb29xdWZjdXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMjQ3OTYsImV4cCI6MjA5OTkwMDc5Nn0.gs4GtGqYHbparOAx-h8Ny0GXcMX5opx2_7LSIHfc0sk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Creates an isolated client for secondary auth actions (e.g., admin registering a new user)
 * without wiping or altering the current active session.
 */
export function createSecondaryAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type Role = "Super Admin" | "Sales Manager" | "Sales Officer" | "Distributor" | "Accountant";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_name: Role;
  territory_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  outlet_name?: string | null;
  party_code?: string | null;
  partyCode?: string | null;
  code?: string | null;
  customerCode?: string | null;
  outlet_code?: string | null;
  outletCode?: string | null;
  area?: string | null;
  alt_phone?: string | null;
  contact_person?: string | null;
  phone: string | null;
  address?: string | null;
  customer_type: "Dealer" | "Retailer" | "Wholesale" | string;
  email?: string | null;
  city?: string | null;
  territory_id?: string | null;
  trade_license_number?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_balance?: number;
  current_due?: number;
  currentDue?: number;
  due_status?: "Clear" | "Overdue" | "Partial" | string;
  notes?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  status?: "Active" | "Inactive" | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  territory?: Territory | null;
  // Security Deposit / Guarantee Cheque Details
  securityChequeNo?: string | null;
  securityBankName?: string | null;
  securityBranchName?: string | null;
  securityChequeDate?: string | null;
  securityNotes?: string | null;
  security_cheque_no?: string | null;
  security_bank_name?: string | null;
  security_branch_name?: string | null;
  security_cheque_date?: string | null;
  security_notes?: string | null;
  hasSecurityCheque?: boolean | null;
  security_cheque_status?: string | null;
}

export interface Territory {
  id: string;
  name: string;
  code: string | null;
  manager_id: string | null;
  region: string | null;
  created_at: string;
}

export interface Area {
  id: string;
  name: string;
  code_prefix?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  sku_code: string;
  brand?: string | null;
  category_id?: string | null;
  category?: any;
  purchase_price?: number | null;
  purchase_cost?: number | null;
  cost_price?: number | null;
  unit_price: number;
  dealer_price?: number;
  distributor_price?: number;
  d10_price?: number | null;
  b12_price?: number | null;
  price_tiers?: Record<string, number> | Array<{ name: string; price: number }> | string | null;
  stock_quantity: number;
  reorder_level: number;
  unit: string;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  sales_rep_id: string | null;
  order_date: string;
  delivery_date: string | null;
  status: "Draft" | "Pending" | "Approved" | "Delivered" | "Cancelled";
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "Unpaid" | "Partial" | "Paid";
  paymentStatus?: string;
  payment_method?: string;
  paidAmount?: number;
  dueAmount?: number;
  advance_applied?: number;
  additional_paid?: number;
  items?: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  sales_rep?: UserProfile | null;
  sales_rep_name?: string | null;
  created_by_name?: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  price_tier: string | null;
  created_at: string;
  product?: Product;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse: string;
  quantity: number;
  updated_at: string;
  product?: Product;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: "Stock In" | "Stock Out" | "Transfer" | "Adjustment" | "Damage";
  quantity: number;
  from_warehouse: string | null;
  to_warehouse: string | null;
  reference: string | null;
  notes: string | null;
  performed_by: string | null;
  transaction_date: string;
  product?: Product;
}

export interface Collection {
  id: string;
  collection_number: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  payment_method: "Cash" | "Cheque" | "Cheque / Check" | "Bank Transfer" | "Mobile Banking";
  collection_date: string;
  collected_by: string | null;
  collector_name?: string | null;
  collected_by_name?: string | null;
  collector?: { id?: string; full_name?: string; email?: string } | null;
  notes: string | null;
  created_at: string;
  bank_name?: string | null;
  branch_name?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  customer?: Customer;
  order?: Order | null;
  previous_due?: number | null;
  remaining_due?: number | null;
  previousDue?: number | null;
  remainingDue?: number | null;
  settlement_discount?: number | null;
  settlement_reason?: string | null;
  verification_pin?: string | null;
  [key: string]: any;
}

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  recorded_by: string | null;
  recorded_by_name?: string | null;
  notes: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  customer_id: string;
  visited_by: string | null;
  visited_by_name?: string | null;
  officer_name?: string | null;
  visit_date: string;
  check_in: string | null;
  check_out: string | null;
  latitude: number | null;
  longitude: number | null;
  purpose: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
}

export interface SalesTarget {
  id: string;
  user_id: string | null;
  territory_id: string | null;
  period: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  period_start: string;
  period_end: string;
  target_amount: number;
  achieved_amount: number;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  type: "Due Reminder" | "Low Stock" | "Sales Target" | "Order Status" | "General";
  title: string;
  message: string | null;
  titleKey?: string | null;
  messageKey?: string | null;
  params?: Record<string, any> | null;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
  opening_balance?: number;
  current_payable?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  sku_code: string;
  quantity: number;
  purchase_rate: number; // Frozen line-item purchase rate
  subtotal: number;
  total_amount?: number;
}

export type InvoiceStatus = 'Partial' | 'Paid' | 'Pending' | 'Received' | 'Partially Paid';

export interface PurchaseInvoice {
  id: string;
  invoice_number: string; // Chalan / Invoice No
  supplier_id: string;
  supplier_name: string;
  invoice_date: string;
  warehouse?: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: InvoiceStatus;
  notes?: string | null;
  items: PurchaseInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  payment_mode: "Cash" | "Bank" | "Bank Transfer" | "Cheque" | "MFS/Bkash" | "Mobile Banking" | string;
  reference_no?: string | null;
  payment_date: string;
  notes?: string | null;
  created_at: string;
  invoice_id?: string | null;
  chalan_id?: string | null;
  payment_type?: "Payment" | "Debit Note" | string;
  bank_name?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  transaction_id?: string | null;
  reason?: string | null;
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: "Purchase" | "Payment" | "Opening Balance" | "Debit Note";
  reference: string;
  particulars: string;
  purchaseAmount: number; // (+৳)
  paidAmount: number; // (-৳)
  balance: number; // Current Running Payable Balance
  notes?: string;
  supplierId?: string;
  invoiceId?: string;
  paymentId?: string;
  paymentMode?: string;
  paymentType?: string;
  bankName?: string;
  chequeNo?: string;
  transactionId?: string;
}

export interface ProcurementAuditLog {
  id: string;
  timestamp: string;
  action: "CREATE_INVOICE" | "UPDATE_INVOICE" | "DELETE_INVOICE" | "RECORD_PAYMENT" | "RECORD_DEBIT_NOTE" | "UPDATE_SUPPLIER" | "RESTORE_BACKUP" | string;
  entity_type: "Invoice" | "Payment" | "Debit Note" | "Supplier" | "System" | string;
  entity_id: string;
  reference: string;
  supplier_name?: string;
  user: string;
  user_id?: string;
  user_name?: string;
  details: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface HandoverRecord {
  id: string;
  handover_number: string;
  officer_id: string | null;
  officer_name: string;
  session_date: string;
  total_amount: number;
  cash_amount: number;
  bkash_amount: number;
  cheque_amount: number;
  verification_pin: string;
  status: "PENDING_VERIFICATION" | "VERIFIED";
  collection_ids: string[];
  created_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  notes?: string | null;
}
