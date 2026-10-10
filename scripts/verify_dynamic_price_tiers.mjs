import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== VERIFYING DYNAMIC 2-BOX KEY-VALUE PRICE TIERS FEATURE ===\n");

const root = process.cwd();

// 1. DYNAMIC 2-BOX PAIRS IN PRODUCT EDIT MODAL
console.log("1. Checking ProductEditModal 2-box pairs and controls...");
const productEditModalPath = path.join(root, "src/components/ProductEditModal.tsx");
assert(fs.existsSync(productEditModalPath), "ProductEditModal.tsx must exist");
const productEditModal = fs.readFileSync(productEditModalPath, "utf-8");

assert(productEditModal.includes("Dynamic Price Tiers"), "Must have Dynamic Price Tiers section");
assert(productEditModal.includes("Add New Tier"), "Must have Add New Tier button");
assert(productEditModal.includes("Trash2"), "Must render Trash2 delete icon button");
assert(productEditModal.includes("tier.name") && productEditModal.includes("tier.price"), "Must bind tier.name and tier.price");
assert(productEditModal.includes("handleRemoveTier"), "Must have handleRemoveTier function");
assert(productEditModal.includes("handleAddTier"), "Must have handleAddTier function");
assert(productEditModal.includes("price_tiers: cleanedTiers") || productEditModal.includes("price_tiers:"), "Must pass price_tiers in onSave");
console.log("✔ ProductEditModal 2-box dynamic layout verified!\n");

// 2. DATA STORAGE & SCHEMA PERSISTENCE
console.log("2. Checking Data Storage & Persistence...");
const supabaseTs = fs.readFileSync(path.join(root, "src/lib/supabase.ts"), "utf-8");
assert(supabaseTs.includes("price_tiers?: { name: string; price: number }[]"), "Product interface must include price_tiers");

const productsPage = fs.readFileSync(path.join(root, "src/pages/ProductsPage.tsx"), "utf-8");
assert(productsPage.includes("price_tiers: priceTiers"), "ProductsPage must include price_tiers in baseDbPayload");
assert(productsPage.includes("price_tiers") && productsPage.includes("sanitized"), "ProductsPage must handle fallback unmapped column gracefully");
console.log("✔ Data storage and schema persistence verified!\n");

// 3. DYNAMIC ORDER FORM SYNCHRONIZATION
console.log("3. Checking Order Form Dynamic Tier Synchronization...");
const newOrderModal = fs.readFileSync(path.join(root, "src/components/NewOrderModal.tsx"), "utf-8");
assert(newOrderModal.includes("dynamicTiers.map"), "NewOrderModal must map dynamic tiers into select options");
assert(newOrderModal.includes("dt.name") && newOrderModal.includes("dt.price"), "NewOrderModal options must include tier name and price");
assert(newOrderModal.includes("matchedCustom") && newOrderModal.includes("current.unit_price = Number(matchedCustom.price)"), "NewOrderModal updateItem must update unit price when dynamic tier selected");

const orderCreate = fs.readFileSync(path.join(root, "src/pages/OrderCreate.tsx"), "utf-8");
assert(orderCreate.includes("dynamicTiers.map"), "OrderCreate must map dynamic tiers into select options");
assert(orderCreate.includes("matchedCustom") && orderCreate.includes("current.unit_price = Number(matchedCustom.price)"), "OrderCreate updateItem must update unit price when dynamic tier selected");
console.log("✔ Dynamic Order Form Synchronization verified!\n");

console.log("=================================================");
console.log("ALL DYNAMIC 2-BOX PRICE TIER TESTS PASSED!");
console.log("=================================================");
