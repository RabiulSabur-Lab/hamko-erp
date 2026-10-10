import type { Order, Collection, Expense, OrderItem, StockTransaction } from "./supabase";

/**
 * Initial empty mock/fallback arrays for system testing and fresh state initialization.
 * Configured as empty arrays so Orders, Accounts, and transactional pages load empty with ৳0 totals.
 */
export const initialOrders: Order[] = [];
export const initialCollections: Collection[] = [];
export const initialExpenses: Expense[] = [];
export const initialOrderItems: OrderItem[] = [];
export const initialStockTransactions: StockTransaction[] = [];
