import { useState, useEffect } from "react";
import { type Order, supabase } from "@/lib/supabase";
import { getOrders, getProducts } from "@/utils/localStore";
import { formatDate, formatBDT } from "@/lib/utils";
import { resolveOrderProduct, formatTierLabel } from "@/utils/productUtils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";
import { OrderPrintInvoice } from "@/components/OrderPrintInvoice";
import { printElementOrDocument } from "@/lib/export";

export interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

function statusVariant(s?: string) {
  if (s === "Approved" || s === "Delivered") return "success";
  if (s === "Cancelled") return "destructive";
  if (s === "Pending") return "warning";
  return "secondary";
}

function deduplicateItems(items: any[]): any[] {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.product_id
      ? `${it.product_id}-${it.unit_price}-${formatTierLabel(it.price_tier) || "Custom"}`
      : it.id
      ? String(it.id)
      : `${it.quantity}-${it.unit_price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function OrderDetailsModal({ open, onClose, order: initialOrder }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !initialOrder) {
      setOrder(initialOrder);
      return;
    }

    // 1. First check local storage for complete order with items
    const localOrders = getOrders();
    const foundLocal = localOrders.find(
      (o: any) =>
        String(o.id) === String(initialOrder.id) ||
        String(o.order_number) === String(initialOrder.order_number)
    );

    const hasItems =
      foundLocal &&
      Array.isArray(foundLocal.order_items || (foundLocal as any).items) &&
      (foundLocal.order_items || (foundLocal as any).items).length > 0;

    if (hasItems) {
      setOrder(foundLocal);
      return;
    }

    // 2. If items are missing, fetch complete order from Supabase
    setOrder(foundLocal || initialOrder);
    let isCurrent = true;
    async function fetchFullOrder() {
      try {
        setLoading(true);
        const orderId = initialOrder?.id;
        if (!orderId) return;

        const { data, error } = await supabase
          .from("orders")
          .select("*, customer:customers(*), order_items(*, product:products(*))")
          .eq("id", orderId)
          .single();

        if (!error && data && isCurrent) {
          setOrder(data as Order);
        }
      } catch (err) {
        console.warn("Notice fetching full order details:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    fetchFullOrder();
    return () => {
      isCurrent = false;
    };
  }, [open, initialOrder]);

  if (!open || !order) return null;

  function handlePrint() {
    void printElementOrDocument({
      elementId: "print-invoice",
      filename: `Invoice_${order?.order_number || order?.id || "Order"}`,
      bodyPrintClass: "printing-invoice",
      orientation: "portrait",
      title: `Order Invoice ${order?.order_number || ""}`,
    });
  }

  const orderItems = deduplicateItems(order.order_items || (order as any).items || []);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={order.order_number || "Order Details"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              ID: {order.id}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Loading latest order items...</span>
            </div>
          )}

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 p-3 rounded-lg border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="font-semibold text-foreground">
                  {order.customer?.outlet_name || order.customer?.name || "—"}
                </p>
                {order.customer?.party_code && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {order.customer.party_code}
                  </Badge>
                )}
              </div>
              {order.customer?.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Phone: {order.customer.phone}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="font-medium mt-0.5">
                {formatDate(order.order_date || order.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Order Status</p>
              <div className="mt-0.5">
                <Badge
                  variant={statusVariant(order.status) as any}
                  className="text-[10px]"
                >
                  {order.status || "Pending"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <div className="mt-0.5">
                <Badge variant="secondary" className="text-[10px]">
                  {order.payment_status || "Unpaid"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Price Tier</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-xs text-muted-foreground"
                    >
                      No item details found for this order.
                    </TableCell>
                  </TableRow>
                ) : (
                  orderItems.map((it: any) => {
                    const prodInfo = resolveOrderProduct(it.product, it.product_id, getProducts());
                    return (
                      <TableRow key={it.id || `${it.product_id}-${it.unit_price}`}>
                        <TableCell className="text-sm">
                          {prodInfo.exists ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {prodInfo.name}
                              </div>
                              {prodInfo.sku_code && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {prodInfo.sku_code}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="font-medium text-destructive/90 italic">
                              [Deleted Product]
                            </div>
                          )}
                        </TableCell>
                      <TableCell className="text-right text-sm">
                        {it.quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                          title={
                            (formatTierLabel(it.price_tier) || "DP").toUpperCase() === "DP"
                              ? "DP: Dealer Price (Wholesale Base Tier)"
                              : undefined
                          }
                        >
                          {formatTierLabel(it.price_tier) || "DP"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatBDT(it.unit_price)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatBDT(it.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              </TableBody>
            </Table>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            {Number(order.discount || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Discount / Adjustment:</span>
                <span>-{formatBDT(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <span>Total Bill:</span>
              <span className="text-primary">{formatBDT(order.total_amount)}</span>
            </div>
            {order.paid_amount !== undefined && (
              <div className="flex justify-between text-xs text-emerald-600 font-medium">
                <span>Paid Amount:</span>
                <span>{formatBDT(order.paid_amount)}</span>
              </div>
            )}
            {order.due_amount !== undefined && (
              <div className="flex justify-between text-xs text-amber-600 font-medium">
                <span>Due Amount:</span>
                <span>{formatBDT(order.due_amount)}</span>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Hidden element rendered for window.print() */}
      {open && order && <OrderPrintInvoice order={order} />}
    </>
  );
}
