import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SearchableSelect, type SearchableOption } from "@/components/SearchableSelect";
import { formatBDT } from "@/lib/utils";
import { useRouter } from "@/router";
import { toast } from "sonner";
import {
  getSuppliers,
  saveSupplier,
  savePurchaseInvoice,
  getProducts,
  setLocalData,
  STORAGE_KEYS,
  r2,
  type Supplier,
  type Product,
  type PurchaseInvoiceItem,
  generatePurchaseInvoiceNumber,
} from "@/utils/localStore";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Calendar,
  FileText,
  Warehouse,
  Loader2,
  CheckCircle2,
  TrendingDown,
  Info,
} from "lucide-react";

interface PurchaseItemRow {
  product_id: string;
  quantity: number | string;
  purchase_rate: number | string;
  subtotal: number;
}

export function PurchaseInvoice() {
  const { navigate } = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [products, setProducts] = useState<Product[]>(() => getProducts());

  // Form Header State
  const [supplierId, setSupplierId] = useState<string>(() => {
    const supList = getSuppliers();
    const hamko = supList.find((s) => s.name.toLowerCase().includes("hamko")) || supList[0];
    return hamko?.id || "";
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() =>
    generatePurchaseInvoiceNumber()
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [warehouse, setWarehouse] = useState<string>("Main Warehouse");
  const [notes, setNotes] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [saving, setSaving] = useState<boolean>(false);

  // New Supplier Quick Modal State
  const [addSupplierModal, setAddSupplierModal] = useState<boolean>(false);
  const [newSupplierName, setNewSupplierName] = useState<string>("");
  const [newSupplierPhone, setNewSupplierPhone] = useState<string>("");
  const [newSupplierAddress, setNewSupplierAddress] = useState<string>("");

  // Line Items State
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      product_id: "",
      quantity: 1,
      purchase_rate: 0,
      subtotal: 0,
    },
  ]);

  useEffect(() => {
    const supList = getSuppliers();
    setSuppliers(supList);
    const hamko = supList.find((s) => s.name.toLowerCase().includes("hamko")) || supList[0];
    if (hamko && (!supplierId || !supList.some((s) => s.id === supplierId))) {
      setSupplierId(hamko.id);
    }
    setProducts(getProducts());
  }, []);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId);
  }, [suppliers, supplierId]);

  // Searchable Product Options
  const productOptions: SearchableOption[] = useMemo(() => {
    return [...products]
      .filter((p) => p.is_active !== false)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((p) => {
        const catName = p.category?.name || "";
        const defaultRate = Number(p.distributor_price ?? p.unit_price ?? 0);
        return {
          value: p.id,
          label: catName ? `[${catName}] ${p.name}` : p.name,
          sublabel: `${p.sku_code} · Stock: ${p.stock_quantity}`,
          badge: `Rate: ${formatBDT(defaultRate)}`,
        };
      });
  }, [products]);

  // Add Item Row
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        purchase_rate: 0,
        subtotal: 0,
      },
    ]);
  };

  // Remove Item Row
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Item Row
  const updateItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (field === "product_id") {
        current.product_id = value;
        const prod = products.find((p) => p.id === value);
        if (prod) {
          // Default purchase rate to distributor_price (purchase cost)
          const defaultRate = Number(prod.distributor_price ?? prod.unit_price ?? 0);
          current.purchase_rate = defaultRate;
        }
      } else if (field === "quantity") {
        current.quantity = value === "" ? "" : Math.max(1, Math.round(Number(value) || 1));
      } else if (field === "purchase_rate") {
        current.purchase_rate = value === "" ? "" : Math.max(0, r2(Number(value) || 0));
      }

      const qty = Number(current.quantity) || 0;
      const rate = Number(current.purchase_rate) || 0;
      current.subtotal = r2(qty * rate);

      next[index] = current;
      return next;
    });
  };

  // Calculations
  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return r2(items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0));
  }, [items]);

  const immediatePaid = useMemo(() => {
    const paid = Number(paidAmount) || 0;
    return Math.min(totalAmount, Math.max(0, paid));
  }, [paidAmount, totalAmount]);

  const netPayableAdded = useMemo(() => {
    return r2(Math.max(0, totalAmount - immediatePaid));
  }, [totalAmount, immediatePaid]);

  // Handle Quick Add Supplier
  function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const created = saveSupplier({
      name: newSupplierName.trim(),
      phone: newSupplierPhone.trim() || null,
      address: newSupplierAddress.trim() || null,
    });
    const refreshed = getSuppliers();
    setSuppliers(refreshed);
    setSupplierId(created.id);
    setAddSupplierModal(false);
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierAddress("");
    toast.success(`Supplier "${created.name}" created and selected`);
  }

  // Handle Save Purchase Invoice
  async function handleSaveInvoice() {
    if (saving) return;
    if (!supplierId || !selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error("Please enter a Chalan / Invoice number");
      return;
    }

    const validItems = items.filter((it) => it.product_id);
    if (validItems.length === 0) {
      toast.error("Please add at least one product with quantity and rate");
      return;
    }

    setSaving(true);
    try {
      const lineItems: PurchaseInvoiceItem[] = validItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
        const rate = Math.max(0, r2(Number(it.purchase_rate) || 0));
        return {
          id: `pi-item-${Date.now()}-${idx}`,
          invoice_id: "",
          product_id: it.product_id,
          product_name: prod?.name || "Product",
          sku_code: prod?.sku_code || "SKU",
          quantity: qty,
          purchase_rate: rate,
          subtotal: r2(qty * rate),
        };
      });

      // 1. Save purchase invoice chalan and record ledger/audit trail (handles stock increment internally)
      savePurchaseInvoice({
        invoice_number: invoiceNumber.trim(),
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        invoice_date: invoiceDate,
        warehouse: warehouse.trim() || "Main Warehouse",
        total_amount: totalAmount,
        paid_amount: immediatePaid,
        due_amount: netPayableAdded,
        status: netPayableAdded <= 0 ? "Paid" : immediatePaid > 0 ? "Partial" : "Received",
        notes: notes.trim() || null,
        items: lineItems,
      });

      // 2. Refresh local products state from single source of truth
      setProducts(getProducts());
      window.dispatchEvent(new Event("sales_erp_storage_update"));

      toast.success(
        `Procurement Chalan ${invoiceNumber} saved! Inventory stock increased by ${totalQuantity} pcs and ${formatBDT(netPayableAdded)} added to ${selectedSupplier.name} payable.`
      );

      navigate(`/procurement?supplier=${selectedSupplier.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save purchase invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/procurement")}
            className="h-9 w-9 shrink-0"
            title="Back to Supplier Ledger"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              New Procurement / Purchase Entry
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Record incoming stock from suppliers (e.g. HAMKO). Increases warehouse stock and updates supplier payable balance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/procurement")}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveInvoice}
            disabled={saving || !supplierId || items.filter((it) => it.product_id).length === 0}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save & Update Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Entry Form (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Chalan Header Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Supplier & Chalan Details</CardTitle>
              <CardDescription>
                Select supplier and enter official chalan or voucher tracking number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Selector */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-xs text-foreground">Supplier / Manufacturer</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddSupplierModal(true)}
                      className="h-6 px-2 text-xs text-primary hover:underline"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add New Supplier
                    </Button>
                  </div>
                  <Select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  {selectedSupplier && (
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1 bg-muted/30 p-2 rounded border">
                      <span><strong>Contact:</strong> {selectedSupplier.contact_person || "—"}</span>
                      <span><strong>Phone:</strong> {selectedSupplier.phone || "—"}</span>
                      <span><strong>Address:</strong> {selectedSupplier.address || "—"}</span>
                    </div>
                  )}
                </div>

                {/* Chalan / Invoice No */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Chalan / Invoice No</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. CHALAN-2026-001"
                    className="font-mono font-medium"
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Receiving Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="font-medium"
                    required
                  />
                </div>

                {/* Warehouse */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Receiving Warehouse</Label>
                  <Input
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    placeholder="Main Warehouse"
                  />
                </div>

                {/* Remarks / Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transport / Note</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivery via SA Paribahan / Truck #402"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">2. Procured Product Items</CardTitle>
                <CardDescription>
                  Purchase rates default to Master Purchase Price but can be edited per line item.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" /> Add Line Item
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-visible">
              <div className="overflow-x-auto min-h-[350px] pb-10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[360px] sm:min-w-[420px]">Product</TableHead>
                      <TableHead className="w-24 text-center">Qty (Pcs)</TableHead>
                      <TableHead className="w-32 text-right">Purchase Rate (৳)</TableHead>
                      <TableHead className="w-32 text-right">Subtotal (৳)</TableHead>
                      <TableHead className="w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          No items added. Click "Add Line Item" to select products received.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.product_id);
                        return (
                          <TableRow key={idx}>
                            {/* Product Search */}
                            <TableCell className="p-2 min-w-[360px] sm:min-w-[420px]">
                              <SearchableSelect
                                options={productOptions}
                                value={it.product_id}
                                onChange={(val) => updateItem(idx, "product_id", val)}
                                placeholder="Select received product..."
                                searchPlaceholder="Search product by name or SKU..."
                                className="w-full min-w-[350px]"
                                minWidth={400}
                                maxHeight={350}
                              />
                            </TableCell>

                            {/* Quantity */}
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                className="h-9 text-center font-mono font-medium"
                              />
                            </TableCell>

                            {/* Purchase Rate (Editable, defaults to distributor_price) */}
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.purchase_rate}
                                onChange={(e) => updateItem(idx, "purchase_rate", e.target.value)}
                                className="h-9 font-mono text-right font-medium"
                                title="Editable purchase rate for this invoice"
                              />
                            </TableCell>

                            {/* Subtotal */}
                            <TableCell className="p-2 text-right font-mono font-semibold">
                              {formatBDT(it.subtotal || 0)}
                            </TableCell>

                            {/* Remove Row */}
                            <TableCell className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(idx)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={items.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary (Right 1 col) */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-muted/10 sticky top-4">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Procurement Summary</CardTitle>
              <CardDescription>Financial impact on Supplier Ledger</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Line Items:</span>
                <span className="font-semibold font-mono">{items.filter((it) => it.product_id).length}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Quantity Received:</span>
                <span className="font-semibold font-mono">{totalQuantity} pcs</span>
              </div>

              <div className="flex justify-between font-bold border-t pt-3 text-lg">
                <span>Total Invoice Value:</span>
                <span className="text-primary font-mono">{formatBDT(totalAmount)}</span>
              </div>

              {/* Immediate Advance / Paid upon delivery */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label className="font-semibold text-muted-foreground">Immediate Cash/Advance Paid (৳):</Label>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  value={paidAmount === 0 ? "" : paidAmount}
                  placeholder="0.00"
                  onChange={(e) => setPaidAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="font-mono text-right"
                />
              </div>

              {/* Net Balance Added to Payable */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Net Added to Supplier Payable
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Increases liability on Supplier Ledger
                  </p>
                </div>
                <span className="font-mono text-base font-bold text-amber-700 dark:text-amber-400">
                  +{formatBDT(netPayableAdded)}
                </span>
              </div>

              {/* Notice */}
              <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md border flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Saving this invoice will automatically add <strong>{totalQuantity} pcs</strong> to warehouse inventory and record full line-item purchase costs on the Supplier Ledger.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      <Dialog
        open={addSupplierModal}
        onClose={() => setAddSupplierModal(false)}
        title="Add New Supplier / Vendor"
        size="md"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Supplier Name *</Label>
            <Input
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="e.g. HAMKO Industries Ltd."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone / Contact Number</Label>
            <Input
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              placeholder="e.g. 01711-xxxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address / Factory Location</Label>
            <Textarea
              value={newSupplierAddress}
              onChange={(e) => setNewSupplierAddress(e.target.value)}
              placeholder="e.g. Banglamotor, Dhaka"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setAddSupplierModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Supplier</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default PurchaseInvoice;
