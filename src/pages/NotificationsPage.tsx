import { useEffect, useState, useMemo } from "react";
import { supabase, type Notification } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { timeAgo, formatCurrency, cn } from "@/lib/utils";
import { Bell, CheckCheck, Loader2, AlertTriangle, DollarSign, Target, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getNotifications,
  deleteNotification,
  clearReadNotifications,
  getDeletedIds,
} from "@/utils/localStore";
import { sanitizePayload } from "@/lib/payloadSanitizer";

const typeIcons: Record<string, any> = {
  "Due Reminder": DollarSign,
  "Low Stock": AlertTriangle,
  "Sales Target": Target,
  "Order Status": Package,
  "General": Bell,
};

const typeColors: Record<string, string> = {
  "Due Reminder": "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Low Stock": "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  "Sales Target": "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  "Order Status": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  "General": "text-sky-600 bg-sky-50 dark:bg-sky-950/30",
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(() => getNotifications().length === 0);
  const [notifications, setNotifications] = useState<Notification[]>(() => getNotifications());

  useEffect(() => {
    let isMounted = true;
    async function init() {
      await loadNotifications(isMounted);
      await generateSystemNotifications(isMounted);
    }
    init();
    return () => { isMounted = false; };
  }, [profile?.id]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_NOTIFICATIONS);
      const updated = getNotifications().filter((n) => !deletedIds.has(n.id));
      setNotifications([...updated]);
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
    };
  }, []);

  async function loadNotifications(isMounted: boolean = true) {
    const local = getLocalData<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    if (!profile?.id) {
      if (isMounted) {
        setNotifications(local);
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (Array.isArray(data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_NOTIFICATIONS);
        const filtered = data.filter((n: any) => !deletedIds.has(n.id));
        setNotifications(filtered);
        setLocalData(STORAGE_KEYS.NOTIFICATIONS, filtered);
      } else {
        setNotifications(local);
      }
    } catch (err) {
      console.warn("Error fetching remote notifications, falling back to local:", err);
      setNotifications(local);
    } finally {
      setLoading(false);
    }
  }

  async function generateSystemNotifications(isMounted: boolean = true) {
    if (!profile?.id) return;
    try {
      const [products, customers, existing] = await Promise.all([
        supabase.from("products").select("name, stock_quantity, reorder_level").eq("is_active", true),
        supabase.from("customers").select("name, current_due, due_status").gt("current_due", 0),
        supabase.from("notifications")
          .select("title, message")
          .eq("user_id", profile.id)
          .in("type", ["Low Stock", "Due Reminder"])
          .gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
      ]);

      const dismissed = new Set(
        getLocalData<string[]>(STORAGE_KEYS.DISMISSED_NOTIFICATIONS, [])
      );
      const existingKeys = new Set([
        ...(existing.data ?? []).map((n) => `${n.title}|${n.message}`),
        ...dismissed,
      ]);

      const lowStock = products.data?.filter((p) => p.stock_quantity <= p.reorder_level) ?? [];
      const overdue = customers.data?.filter((c) => c.due_status === "Overdue") ?? [];

      const toInsert: any[] = [];
      lowStock.slice(0, 5).forEach((p) => {
        const titleKey = "notifications.lowStockTitle";
        const messageKey = "notifications.lowStockMsg";
        const params = { productName: p.name, count: p.stock_quantity };
        const title = "Low Stock Alert";
        const message = `${p.name} is below reorder level (${p.stock_quantity} units)`;
        if (!existingKeys.has(`${title}|${message}`) && !existingKeys.has(`${titleKey}|${messageKey}|${p.name}`)) {
          toInsert.push({
            user_id: profile.id,
            type: "Low Stock",
            title,
            message,
            titleKey,
            messageKey,
            params,
            is_read: false,
          });
        }
      });
      overdue.slice(0, 5).forEach((c) => {
        const titleKey = "notifications.overduePaymentTitle";
        const messageKey = "notifications.overduePaymentMsg";
        const params = { customerName: c.name, amount: formatCurrency(c.current_due) };
        const title = "Overdue Payment";
        const message = `${c.name} has overdue payment of ৳${c.current_due}`;
        if (!existingKeys.has(`${title}|${message}`) && !existingKeys.has(`${titleKey}|${messageKey}|${c.name}`)) {
          toInsert.push({
            user_id: profile.id,
            type: "Due Reminder",
            title,
            message,
            titleKey,
            messageKey,
            params,
            is_read: false,
          });
        }
      });

      if (toInsert.length > 0) {
        let insertedRows: any[] = [];
        try {
          const sanitizedPayloads = toInsert.map((item) => sanitizePayload("notifications", item));
          const { data, error } = await supabase.from("notifications").insert(sanitizedPayloads).select();
          if (!error && data && data.length > 0) {
            insertedRows = data.map((r: any, idx: number) => ({
              ...r,
              titleKey: toInsert[idx]?.titleKey ?? r.titleKey,
              messageKey: toInsert[idx]?.messageKey ?? r.messageKey,
              params: toInsert[idx]?.params ?? r.params,
            }));
          }
        } catch {
          // Handled below
        }

        if (insertedRows.length === 0) {
          insertedRows = toInsert.map((item, idx) => ({
            id: `sys-notif-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            ...item,
          }));
        }

        if (insertedRows.length > 0 && isMounted) {
          setNotifications((prev) => {
            const updated = [...insertedRows, ...prev];
            setLocalData(STORAGE_KEYS.NOTIFICATIONS, updated);
            return updated;
          });
          window.dispatchEvent(new Event("sales_erp_storage_update"));
        }
      }
    } catch (e) { /* silent */ }
  }

  async function markAsRead(n: Notification) {
    if (n.is_read) return;
    // Instant optimistic update
    setNotifications((prev) => {
      const updated = prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item));
      setLocalData(STORAGE_KEYS.NOTIFICATIONS, updated);
      return updated;
    });
    window.dispatchEvent(new Event("sales_erp_storage_update"));

    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    } catch (e) {
      // Local state is already updated
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    // Instant optimistic update
    setNotifications((prev) => {
      const updated = prev.map((item) => ({ ...item, is_read: true }));
      setLocalData(STORAGE_KEYS.NOTIFICATIONS, updated);
      return updated;
    });
    window.dispatchEvent(new Event("sales_erp_storage_update"));
    toast.success(t("updated") || "All notifications marked as read");

    try {
      await supabase.from("notifications").update({ is_read: true }).in("id", unread.map((n) => n.id));
    } catch (e) {
      // Local state is already updated
    }
  }

  const handleDeleteNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = deleteNotification(id);
    setNotifications([...updated]); // Spread operator creates a new array reference to force immediate React re-render
    toast.success("Notification deleted");
  };

  const handleClearRead = () => {
    const updated = clearReadNotifications();
    setNotifications([...updated]);
    toast.success("Cleared read notifications");
  };

  const { unreadCount, readCount } = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read).length;
    return { unreadCount: unread, readCount: notifications.length - unread };
  }, [notifications]);

  const getNotificationTitle = (n: Notification): string => {
    if (n.titleKey) {
      const translated = t(n.titleKey, n.params || undefined);
      if (translated && translated !== n.titleKey) return translated;
    }
    if (n.title === "Low Stock Alert") return t("notifications.lowStockTitle") || t("lowStockAlert") || n.title;
    if (n.title === "Overdue Payment") return t("notifications.overduePaymentTitle") || n.title;
    if (n.title === "Sales Target Alert") return t("notifications.salesTargetTitle") || n.title;
    return t(n.title) || n.title;
  };

  const getNotificationMessage = (n: Notification): string => {
    if (n.messageKey) {
      const translated = t(n.messageKey, n.params || undefined);
      if (translated && translated !== n.messageKey) return translated;
    }
    if (n.title === "Low Stock Alert" && n.message) {
      const match = n.message.match(/^(.+) is below reorder level \((\d+) units\)$/);
      if (match) {
        return t("notifications.lowStockMsg", { productName: match[1], count: Number(match[2]) });
      }
    }
    if (n.title === "Overdue Payment" && n.message) {
      const match = n.message.match(/^(.+) has overdue payment of ৳([\d,.]+)$/);
      if (match) {
        return t("notifications.overduePaymentMsg", {
          customerName: match[1],
          amount: formatCurrency(Number(match[2].replace(/,/g, ""))),
        });
      }
    }
    return n.message || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{unreadCount} {t("unread")}</p>
        </div>
        <div className="flex items-center gap-2">
          {readCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearRead} className="text-xs text-muted-foreground hover:text-foreground">
              Clear Read ({readCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> {t("markAllRead")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={<Bell className="h-10 w-10" />} title={t("noNotifications")} />
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n)}
                    className={cn(
                      "flex w-full items-start gap-3 p-4 text-left transition-colors cursor-pointer hover:bg-muted/50",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", typeColors[n.type] ?? typeColors.General)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{n.titleKey ? t(n.titleKey, n.params || undefined) : getNotificationTitle(n)}</p>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.messageKey ? t(n.messageKey, n.params || undefined) : getNotificationMessage(n)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{t(n.type.toLowerCase().replace(" ", "") as string) || n.type}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


