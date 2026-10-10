import { createPortal } from "react-dom";
import { type Order } from "@/lib/supabase";
import { STORAGE_KEYS, getLocalData, r2 } from "@/utils/localStore";
import { resolveOrderProduct, formatTierLabel } from "@/utils/productUtils";
import { useUsers } from "@/context/UsersContext";

function fmt(amount: number | string | null | undefined): string {
  const n = Number(amount);
  const val = Number.isFinite(n) ? r2(n) : 0;
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatBDT(amount: number | string | null | undefined): string {
  return "৳ " + fmt(amount);
}

function tierLabel(tier?: string | null): string {
  if (!tier) return "DP";
  return formatTierLabel(tier) || "DP";
}

function formatPrintDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}-${months[d.getMonth()]}-${yy}`;
}

const EMPTY_ROWS = 4;

interface BarcodeProps {
  value: string;
}

function Barcode({ value }: BarcodeProps) {
  const bars: { black: boolean; width: number }[] = [];
  bars.push({ black: true, width: 2 }, { black: false, width: 1 }, { black: true, width: 1 }, { black: false, width: 1 });
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const w1 = (code % 3) + 1;
    const w2 = ((code >> 2) % 2) + 1;
    const w3 = ((code >> 4) % 3) + 1;
    bars.push(
      { black: true, width: w1 },
      { black: false, width: 1 },
      { black: true, width: w2 },
      { black: false, width: w3 },
    );
  }
  bars.push({ black: true, width: 2 }, { black: false, width: 1 }, { black: true, width: 2 });

  return (
    <div className="pi-barcode" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => (
        <span
          key={i}
          className="pi-bar"
          style={{ width: `${b.width}px`, background: b.black ? "#000" : "transparent" }}
        />
      ))}
    </div>
  );
}

export function OrderPrintInvoice({ order }: { order: Order }) {
  const { getUserName } = useUsers();
  const officerName = getUserName(
    order.sales_rep_id,
    order.sales_rep?.full_name || order.sales_rep_name || (order as any).created_by_name || "Sales Officer"
  );
  const rawItems: any[] = order.order_items ?? (order as any).items ?? [];
  // Deduplicate items if identical (same product_id, unit_price, and price_tier)
  const seenItems = new Set<string>();
  const items: any[] = rawItems.filter((it: any) => {
    const key = it.product_id
      ? `${it.product_id}-${it.unit_price}-${it.price_tier || "Custom"}`
      : it.id
      ? String(it.id)
      : `${it.quantity}-${it.unit_price}`;
    if (seenItems.has(key)) return false;
    seenItems.add(key);
    return true;
  });
  const totalQty = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);

  const lineItemTotal = r2(items.reduce((s: number, it: any) => s + Number(it.subtotal || 0), 0));
  const creditAdjust = r2(Number(order.discount || 0));
  const currentBill = r2(lineItemTotal - creditAdjust);

  // Look up latest customer record from local cache or order.customer
  const customers = getLocalData<any>(STORAGE_KEYS.CUSTOMERS, []);
  const custRecord = (order.customer_id ? customers.find((c: any) => c.id === order.customer_id) : null) || order.customer;
  const totalCustomerDue = r2(Number(custRecord?.current_due ?? order.customer?.current_due ?? 0));

  // The order's due contribution
  const orderDue = r2(Number(order.due_amount !== undefined ? order.due_amount : currentBill));

  // 1. If customer.current_due already includes the current order (e.g. 6,000 BDT >= 5,000 BDT),
  //    calculate previousDue = customer.current_due - orderDue = 1,000 BDT.
  // 2. If customer.current_due < orderDue (e.g. 1,000 BDT < 5,000 BDT, customer.current_due was not yet updated),
  //    then customer.current_due is already the previous balance before this order.
  let previousDue = 0;
  if (totalCustomerDue >= orderDue && orderDue > 0) {
    previousDue = r2(totalCustomerDue - orderDue);
  } else {
    previousDue = totalCustomerDue;
  }

  const paidAmt = r2(Number(order.paid_amount ?? (order as any).paidAmount ?? 0));
  const netPayable = r2(previousDue + (paidAmt > 0 ? orderDue : currentBill));

  const invoiceElement = (
    <div
      id="print-invoice"
      className="pdf-container print-invoice-root print-container"
      style={{
        boxSizing: "border-box",
        width: "100%",
        margin: "0 auto",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* 1. Header Section */}
      <div
        className="pi-header"
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
            className="pi-logo"
            style={{
              height: "40px",
              maxHeight: "40px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Middle/Center Section */}
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

      {/* Metadata Block: 2-Column Grid */}
      <div
        className="pi-meta-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          width: "100%",
          boxSizing: "border-box",
          margin: "8px 0",
          border: "1px solid #ccc",
          padding: "6px 10px",
          fontSize: "11px",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        {/* Left Column (Invoice Specs) */}
        <div
          className="pi-meta-block"
          style={{
            borderRight: "1px solid #ccc",
            paddingRight: "10px",
          }}
        >
          <div className="pi-invoice-no-cell" style={{ marginBottom: "2px" }}>
            <div className="pi-meta-row" style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
              <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Invoice No:</span>
              <span className="pi-meta-value font-bold" style={{ fontWeight: "700" }}>{order.order_number}</span>
            </div>
            <div style={{ marginTop: "1px" }}>
              <Barcode value={order.order_number} />
            </div>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Ref No:</span>
            <span className="pi-meta-value">{`D4-${(order.order_number || "").replace(/[^0-9]/g, "").slice(-5).padStart(4, "0")}/26`}</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Date:</span>
            <span className="pi-meta-value">{formatPrintDate(order.order_date)}</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Gate Pass Ref:</span>
            <span className="pi-meta-value">—</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Officer:</span>
            <span className="pi-meta-value font-semibold">{officerName}</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Note:</span>
            <span className="pi-meta-value">{order.notes ?? "—"}</span>
          </div>
        </div>

        {/* Right Column (Party Details) */}
        <div
          className="pi-meta-block"
          style={{
            paddingLeft: "4px",
          }}
        >
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Party Code:</span>
            <span className="pi-meta-value font-mono font-semibold">
              {custRecord?.party_code || order.customer?.party_code || order.customer?.id?.slice(-6).toUpperCase() || "—"}
            </span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Party Name:</span>
            <span className="pi-meta-value font-bold text-gray-900">
              {custRecord?.outlet_name || custRecord?.name || order.customer?.outlet_name || order.customer?.name || "M/S Swarna Enterprise"}
            </span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Address:</span>
            <span className="pi-meta-value">{[order.customer?.address, order.customer?.city].filter(Boolean).join(", ") || "—"}</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>Contact:</span>
            <span className="pi-meta-value">{order.customer?.phone ?? "—"}</span>
          </div>
          <div className="pi-meta-row" style={{ display: "flex", gap: "6px" }}>
            <span className="pi-meta-label" style={{ fontWeight: "bold", minWidth: "80px" }}>NID:</span>
            <span className="pi-meta-value">{order.customer?.trade_license_number ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="pi-items-table" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <thead>
          <tr>
            <th className="pi-col-sr">Serial No</th>
            <th className="pi-col-desc">Description Of Goods</th>
            <th className="pi-col-qty">Quantity</th>
            <th className="pi-col-rate">Rate</th>
            <th className="pi-col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, idx: number) => {
            const prodInfo = resolveOrderProduct(it.product, it.product_id);
            return (
              <tr key={it.id || idx}>
                <td className="pi-col-sr">{idx + 1}</td>
                <td className="pi-col-desc">
                  {prodInfo.exists ? prodInfo.name : "[Deleted Product]"}
                  <span className="pi-tier-tag">[{tierLabel(it.price_tier ?? "DP")}]</span>
                </td>
                <td className="pi-col-qty">{it.quantity}</td>
                <td className="pi-col-rate">{formatBDT(it.unit_price)}</td>
                <td className="pi-col-amount">{formatBDT(it.subtotal)}</td>
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, EMPTY_ROWS - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="pi-empty-row">
              <td className="pi-col-sr">&nbsp;</td>
              <td className="pi-col-desc">&nbsp;</td>
              <td className="pi-col-qty">&nbsp;</td>
              <td className="pi-col-rate">&nbsp;</td>
              <td className="pi-col-amount">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div
        className="pi-summary"
        style={{
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div className="pi-summary-left">
          <p className="pi-summary-qty">Sub TOTAL: {totalQty} Pcs</p>
        </div>
        <div className="pi-summary-right">
          <div className="pi-sum-row pi-sum-grand">
            <span>Current Bill (Grand Total)</span>
            <span>{formatBDT(currentBill)}</span>
          </div>
          {paidAmt > 0 && (
            <div className="pi-sum-row">
              <span>Paid Amount</span>
              <span>- {formatBDT(paidAmt)}</span>
            </div>
          )}
          {creditAdjust > 0 && (
            <div className="pi-sum-row">
              <span>Credit / Adjustments</span>
              <span>- {formatBDT(creditAdjust)}</span>
            </div>
          )}
          <div className="pi-sum-row">
            <span>Previous Due</span>
            <span>{formatBDT(previousDue)}</span>
          </div>
          <div className="pi-sum-row pi-sum-net">
            <span>Net Payable</span>
            <span>{formatBDT(netPayable)}</span>
          </div>
        </div>
      </div>

      {/* Signatures Footer */}
      <div
        className="pi-signatures"
        style={{
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div className="pi-sig-block">
          <p>Prepared By: {officerName}</p>
          <p>Checked BY:....................................</p>
        </div>
        <div className="pi-sig-block pi-sig-right">
          <p>Authorized BY:....................................</p>
          <p>Customer Signature:....................................</p>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(invoiceElement, document.body);
  }
  return invoiceElement;
}

export const InvoicePrint = OrderPrintInvoice;
export const BillPrint = OrderPrintInvoice;
export default OrderPrintInvoice;
