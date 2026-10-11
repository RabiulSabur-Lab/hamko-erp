import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  pushAllLocalDataToSupabase,
  exportAllLocalData,
  type SyncProgress,
  type SyncSummary,
} from "@/utils/cloudSync";
import {
  getProducts,
  getCustomers,
  getOrders,
  getCollections,
  getLocalData,
  STORAGE_KEYS,
} from "@/utils/localStore";
import {
  CloudUpload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  Layers,
  ShoppingBag,
  Users,
  ShoppingCart,
  Receipt,
  Wallet,
} from "lucide-react";

export interface CloudSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function CloudSyncModal({ open, onClose, onSyncComplete }: CloudSyncModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<SyncSummary | null>(null);

  const localProducts = getProducts();
  const localCustomers = getCustomers();
  const localOrders = getOrders();
  const localCollections = getCollections();
  const localExpenses = getLocalData<any[]>(STORAGE_KEYS.EXPENSES, []);
  const localCategories = getLocalData<any[]>(STORAGE_KEYS.CATEGORIES, []);

  async function handleStartSync() {
    setSyncing(true);
    setResult(null);
    setProgress({
      phase: "Initializing...",
      completed: 0,
      total: 1,
      errorCount: 0,
      details: ["Starting synchronization to live Supabase database..."],
    });

    try {
      const summary = await pushAllLocalDataToSupabase((p) => {
        setProgress(p);
      });
      setResult(summary);
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setResult({
        categories: 0,
        products: 0,
        customers: 0,
        orders: 0,
        orderItems: 0,
        collections: 0,
        expenses: 0,
        inventory: 0,
        errors: [err?.message || "Sync encountered unexpected error"],
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => (!syncing ? onClose() : null)}>
      <div className="p-6 max-w-xl w-full">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CloudUpload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sync Local ERP to Supabase Cloud</h2>
            <p className="text-xs text-muted-foreground">
              Push all products, categories, customers, and orders to match live Vercel deployment 100%
            </p>
          </div>
        </div>

        {/* Current Local Dataset Counts */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Products</p>
              <p className="text-sm font-semibold">{localProducts.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Customers</p>
              <p className="text-sm font-semibold">{localCustomers.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Orders</p>
              <p className="text-sm font-semibold">{localOrders.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Collections</p>
              <p className="text-sm font-semibold">{localCollections.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Categories</p>
              <p className="text-sm font-semibold">{localCategories.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-rose-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Expenses</p>
              <p className="text-sm font-semibold">{localExpenses.length}</p>
            </div>
          </div>
        </div>

        {/* Progress or Result Display */}
        {syncing && progress && (
          <div className="p-4 my-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress.phase}
              </span>
              <span>
                {progress.completed} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            {progress.details.length > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">
                {progress.details[progress.details.length - 1]}
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="p-4 my-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Synchronization Complete!
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>✔ Synchronized {result.products} products and {result.categories} categories</p>
              <p>✔ Synchronized {result.customers} customers & outlets</p>
              <p>✔ Synchronized {result.orders} orders and {result.orderItems} order items</p>
              <p>✔ Synchronized {result.collections} collections & payments</p>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                <p className="font-semibold">Notices ({result.errors.length}):</p>
                <div className="max-h-20 overflow-y-auto space-y-0.5 mt-1">
                  {result.errors.slice(0, 5).map((e, idx) => (
                    <p key={idx}>• {e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAllLocalData}
            disabled={syncing}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON Backup
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={syncing}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleStartSync}
              disabled={syncing}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pushing to Supabase...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Push All to Supabase
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default CloudSyncModal;
