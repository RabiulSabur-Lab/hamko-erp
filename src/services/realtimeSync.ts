import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureValidSession, hasActiveSessionToken } from "@/lib/auth";
import { applyRealtimeTablePatch, broadcastCrossTabSync } from "@/utils/localStore";
import { pullFreshCloudStateToLocalStore } from "@/utils/cloudSync";

export type RealtimeSyncStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

interface RealtimeManagerConfig {
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  pullDebounceMs?: number;
}

const DEFAULT_CONFIG: Required<RealtimeManagerConfig> = {
  reconnectBaseMs: 1500,
  reconnectMaxMs: 30000,
  pullDebounceMs: 350,
};

// Monitored primary database tables for Postgres Change Data Capture (CDC)
const MONITORED_TABLES = [
  "orders",
  "order_items",
  "collections",
  "customers",
  "products",
  "inventory",
  "stock_transactions",
  "expenses",
  "categories",
  "visits",
  "territories",
  "sales_targets",
  "notifications",
] as const;

class RealtimeSyncManager {
  private static instance: RealtimeSyncManager | null = null;

  private syncChannel: RealtimeChannel | null = null;
  private broadcastChannel: RealtimeChannel | null = null;
  private status: RealtimeSyncStatus = "DISCONNECTED";
  private isDestroyed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pullDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastResumeSyncAt = 0;
  private lastCloudSyncAt = 0;
  private isAutoPulling = false;
  private convergencePollTimer: ReturnType<typeof setInterval> | null = null;
  private config: Required<RealtimeManagerConfig>;

  private constructor(config?: RealtimeManagerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (typeof window !== "undefined") {
      (window as any).__hamkoRealtimeBroadcast = (detail: any) => this.broadcastMutation(detail);
    }
    this.bindPlatformLifecycleEvents();
    this.startConvergencePolling();
  }

  public static getInstance(config?: RealtimeManagerConfig): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager(config);
    }
    return RealtimeSyncManager.instance;
  }

  public getStatus(): RealtimeSyncStatus {
    return this.status;
  }

  /**
   * Initializes or re-establishes the global Supabase Realtime channel subscription.
   */
  public async init(): Promise<void> {
    if (typeof window === "undefined" || !supabase?.channel) return;
    this.isDestroyed = false;
    this.startConvergencePolling();

    // Align realtime auth credentials with active session if present
    await this.alignRealtimeAuth();

    // If channel is already connected and active, skip redundant re-subscription
    if (this.syncChannel && this.status === "CONNECTED") {
      return;
    }

    this.teardownChannels();
    this.status = "CONNECTING";

    try {
      // 1. Multiplexed Postgres Changes Subscription Channel
      const channelName = `hamko-global-realtime-${Date.now().toString(36)}`;
      let channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: "client-session" },
        },
      });

      // Register listener for each primary ERP table
      for (const table of MONITORED_TABLES) {
        channel = channel.on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table },
          (payload: any) => this.handlePostgresChange(table, payload),
        );
      }

      // Track channel connection state
      channel.subscribe((subStatus, err) => {
        if (this.isDestroyed) return;

        if (subStatus === "SUBSCRIBED") {
          this.status = "CONNECTED";
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT" || subStatus === "CLOSED") {
          this.status = "ERROR";
          if (err) {
            console.warn(`[RealtimeSync] Channel ${subStatus} notice:`, err.message || err);
          }
          this.scheduleReconnect("channel_status_" + subStatus.toLowerCase());
        }
      });

      this.syncChannel = channel;

      // 2. Cross-Device Sub-Millisecond Peer Broadcast Channel
      this.broadcastChannel = supabase
        .channel("hamko-cross-device-sync", {
          config: { broadcast: { self: false } },
        })
        .on("broadcast", { event: "erp_mutation" }, (payload: any) => {
          this.handleCrossDeviceBroadcast(payload);
        })
        .subscribe();
    } catch (err) {
      this.status = "ERROR";
      console.warn("[RealtimeSync] Initialization exception:", err);
      this.scheduleReconnect("init_exception");
    }
  }

  /**
   * Aligns Supabase Realtime WebSocket authorization with active session JWT
   */
  private async alignRealtimeAuth(): Promise<void> {
    try {
      const sessionCheck = await ensureValidSession();
      const token = sessionCheck?.session?.access_token;
      if (token && hasActiveSessionToken(sessionCheck.session) && supabase?.realtime?.setAuth) {
        supabase.realtime.setAuth(token);
      }
    } catch {
      // Fall back safely to anon credentials
    }
  }

  /**
   * Instantly reconciles database CDC payloads and dispatches local state updates.
   */
  private handlePostgresChange(table: string, payload: any): void {
    if (!payload) return;
    const eventType = (payload.eventType || "UPDATE").toUpperCase() as "INSERT" | "UPDATE" | "DELETE";
    const record = eventType === "DELETE" ? payload.old : payload.new;

    try {
      // 1. Zero-lag instant in-memory and localStore reconciliation
      if (record) {
        applyRealtimeTablePatch(table, eventType, record);
      }

      // 2. Dispatch reactive DOM storage event for immediate component re-render
      const detail = {
        type: "realtime_cdc",
        table,
        eventType,
        recordId: record?.id,
        timestamp: Date.now(),
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail }));
        if (table === "customers" || table === "orders" || table === "collections" || table === "order_items") {
          const custId = record?.customer_id || record?.customerId || record?.id;
          if (custId) {
            window.dispatchEvent(new CustomEvent("customer_ledger_updated", { detail: { customerId: custId } }));
          }
        }
      }

      // 3. Cross-tab browser sync
      broadcastCrossTabSync({ detail });
    } catch (err) {
      console.warn(`[RealtimeSync] Local patch error for table ${table}:`, err);
    }

    // 4. Debounced cloud pull for relational consistency and balance convergence
    this.scheduleDebouncedPull();
  }

  /**
   * Handles peer-to-peer real-time broadcast from another device instance.
   */
  private handleCrossDeviceBroadcast(payload: any): void {
    const detail = payload?.payload?.detail || { type: "erp_mutation" };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail }));
    }
    broadcastCrossTabSync({ detail });
    this.scheduleDebouncedPull();
  }

  /**
   * Broadcasts a local mutation to all other active connected devices immediately.
   */
  public async broadcastMutation(detail?: any): Promise<void> {
    try {
      if (!this.broadcastChannel) {
        await this.init();
      }
      if (this.broadcastChannel) {
        void this.broadcastChannel.send({
          type: "broadcast",
          event: "erp_mutation",
          payload: { detail: detail || { type: "mutation" }, ts: Date.now() },
        });
      }
    } catch {
      // Ignore broadcast errors when offline
    }
  }

  /**
   * Debounces full cloud state pull to prevent network thrashing on bulk mutations.
   */
  private scheduleDebouncedPull(): void {
    if (this.pullDebounceTimer) {
      clearTimeout(this.pullDebounceTimer);
    }
    this.pullDebounceTimer = setTimeout(() => {
      this.pullDebounceTimer = null;
      if (!this.isDestroyed && !this.isAutoPulling) {
        this.isAutoPulling = true;
        void pullFreshCloudStateToLocalStore({ force: true, silent: true }).finally(() => {
          this.isAutoPulling = false;
        });
      }
    }, this.config.pullDebounceMs);
  }

  /**
   * Schedules reconnect with exponential backoff and jitter.
   */
  public scheduleReconnect(reason?: string): void {
    if (this.isDestroyed) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const backoff = Math.min(
      this.config.reconnectBaseMs * Math.pow(1.5, this.reconnectAttempts - 1),
      this.config.reconnectMaxMs,
    );
    const jitter = Math.random() * 400;
    const delay = Math.round(backoff + jitter);

    if (reason) {
      // Diagnostic trace
      // console.debug(`[RealtimeSync] Reconnecting in ${delay}ms (${reason}, attempt ${this.reconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed) {
        void this.init();
      }
    }, delay);
  }

  /**
   * Immediately reconnects and triggers fresh cloud synchronization.
   */
  public async reconnect(reason = "manual_or_lifecycle"): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    await this.init();

    // Trigger state convergence on reconnect if network is available
    const now = Date.now();
    if (now - this.lastCloudSyncAt > 1500) {
      this.lastCloudSyncAt = now;
      void pullFreshCloudStateToLocalStore({ force: true, silent: true });
    }
  }

  /**
   * Attaches browser and native Capacitor mobile app lifecycle listeners.
   */
  private bindPlatformLifecycleEvents(): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleResumeOrFocus = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - this.lastResumeSyncAt < 1200) return;
      this.lastResumeSyncAt = now;
      void this.reconnect("app_foreground_resume");
    };

    const handleOnline = () => {
      void this.reconnect("network_online");
    };

    // Web visibility & focus
    document.addEventListener("visibilitychange", handleResumeOrFocus);
    window.addEventListener("focus", handleResumeOrFocus);
    window.addEventListener("pageshow", handleResumeOrFocus);
    window.addEventListener("online", handleOnline);

    // Native Cordova / Capacitor resume event
    document.addEventListener("resume", handleResumeOrFocus as EventListener);
    window.addEventListener("resume", handleResumeOrFocus as EventListener);

    // Native Capacitor App Plugin listener (if running in Android / iOS container)
    try {
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.App?.addListener) {
        cap.Plugins.App.addListener("appStateChange", (state: { isActive: boolean }) => {
          if (state.isActive) {
            handleResumeOrFocus();
          }
        });
      }
    } catch {
      // Safe fallback when Capacitor App plugin is unlinked
    }
  }

  /**
   * Tears down existing channels cleanly.
   */
  private teardownChannels(): void {
    try {
      if (this.syncChannel && supabase?.removeChannel) {
        supabase.removeChannel(this.syncChannel);
      }
      if (this.broadcastChannel && supabase?.removeChannel) {
        supabase.removeChannel(this.broadcastChannel);
      }
    } catch {
      // Safe cleanup
    } finally {
      this.syncChannel = null;
      this.broadcastChannel = null;
    }
  }

  /**
   * Continuous background state convergence polling loop.
   * Forcefully queries Supabase every 7.5s, bypassing any WebSocket dropouts.
   */
  public startConvergencePolling(): void {
    if (this.convergencePollTimer) return;
    this.convergencePollTimer = setInterval(() => {
      if (this.isDestroyed) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (!this.isAutoPulling) {
        this.isAutoPulling = true;
        void pullFreshCloudStateToLocalStore({ force: true, silent: true }).finally(() => {
          this.isAutoPulling = false;
        });
      }
    }, 7500);
  }

  public stopConvergencePolling(): void {
    if (this.convergencePollTimer) {
      clearInterval(this.convergencePollTimer);
      this.convergencePollTimer = null;
    }
  }

  /**
   * Fully cleans up and unsubscribes channels.
   */
  public cleanup(): void {
    this.isDestroyed = true;
    this.stopConvergencePolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pullDebounceTimer) {
      clearTimeout(this.pullDebounceTimer);
      this.pullDebounceTimer = null;
    }
    this.teardownChannels();
    this.status = "DISCONNECTED";
  }
}

// Singleton convenience accessors
export const realtimeSyncManager = RealtimeSyncManager.getInstance();

export function initRealtimeSync(): Promise<void> {
  return realtimeSyncManager.init();
}

export function cleanupRealtimeSync(): void {
  realtimeSyncManager.cleanup();
}

export function reconnectRealtimeSync(reason?: string): Promise<void> {
  return realtimeSyncManager.reconnect(reason);
}

export function broadcastRealtimeMutation(detail?: any): Promise<void> {
  return realtimeSyncManager.broadcastMutation(detail);
}

export function getRealtimeStatus(): RealtimeSyncStatus {
  return realtimeSyncManager.getStatus();
}
