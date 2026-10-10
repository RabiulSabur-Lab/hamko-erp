import assert from "assert";

console.log("=== RUNNING LOGICAL E2E TEST FOR DYNAMIC PRICE TIERS ===\n");

// 1. Simulating ProductEditModal parsing & submission
const mockProduct = {
  id: "prod-test-101",
  sku_code: "HAMKO-TEST",
  name: "Hamko Test Battery 100Ah",
  unit_price: 12000,
  distributor_price: 10500,
  stock_quantity: 50,
  price_tiers: JSON.stringify([
    { name: "Retail VIP", price: 11500 },
    { name: "Wholesale Super", price: 10800 }
  ])
};

// Test getProductPriceTiers parser logic
function getProductPriceTiers(product) {
  if (!product) return [];
  let tiers = product.price_tiers;
  if (typeof tiers === "string") {
    try {
      tiers = JSON.parse(tiers);
    } catch {
      tiers = [];
    }
  }
  if (Array.isArray(tiers) && tiers.length > 0) {
    return tiers
      .filter((t) => t && (t.name != null || t.tier_name != null))
      .map((t) => ({
        name: String(t.name ?? t.tier_name ?? "").trim(),
        price: Number(t.price != null ? t.price : t.rate) || 0,
      }))
      .filter((t) => t.name.length > 0);
  }
  if (tiers && typeof tiers === "object" && !Array.isArray(tiers)) {
    return Object.entries(tiers).map(([name, price]) => ({
      name: String(name).trim(),
      price: Number(price) || 0,
    }));
  }
  const legacy = [];
  if (product.d10_price && Number(product.d10_price) > 0) legacy.push({ name: "D10 Rate", price: Number(product.d10_price) });
  if (product.b12_price && Number(product.b12_price) > 0) legacy.push({ name: "B12 Rate", price: Number(product.b12_price) });
  return legacy;
}

// 1. Verify parsing existing product tiers
console.log("1. Testing initial parsing of existing product price_tiers...");
const parsedTiers = getProductPriceTiers(mockProduct);
assert.strictEqual(parsedTiers.length, 2, "Should parse 2 tiers from JSON string");
assert.strictEqual(parsedTiers[0].name, "Retail VIP");
assert.strictEqual(parsedTiers[0].price, 11500);
assert.strictEqual(parsedTiers[1].name, "Wholesale Super");
assert.strictEqual(parsedTiers[1].price, 10800);
console.log("✔ Product price_tiers parsing verified!\n");

// 2. Simulating adding a new tier in ProductEditModal: + Add New Tier -> [{ name: '', price: 0 }]
console.log("2. Testing adding a new tier...");
const editedTiers = [...parsedTiers, { name: "Special Eid Offer", price: 10200 }];
const cleanedTiers = editedTiers
  .filter((t) => t.name.trim().length > 0)
  .map((t) => ({
    name: t.name.trim(),
    price: Math.max(0, parseFloat(String(t.price)) || 0),
  }));

assert.strictEqual(cleanedTiers.length, 3, "Should have 3 cleaned tiers");
assert.strictEqual(cleanedTiers[2].name, "Special Eid Offer");
assert.strictEqual(cleanedTiers[2].price, 10200);
console.log("✔ New tier addition and cleaning verified!\n");

// 3. Simulating persistence in localStore / DB payload
console.log("3. Testing persistence payload...");
const savedProduct = {
  ...mockProduct,
  price_tiers: cleanedTiers
};

// Reopening modal verification
const reopenedTiers = getProductPriceTiers(savedProduct);
assert.strictEqual(reopenedTiers.length, 3, "Reopened product must retain 3 tiers");
assert.strictEqual(reopenedTiers[2].name, "Special Eid Offer");
assert.strictEqual(reopenedTiers[2].price, 10200);
console.log("✔ Persistence and reopening verification passed!\n");

// 4. Simulating Order creation selection & price auto-fill
console.log("4. Testing Order Modal dropdown mapping and auto-fill...");
const orderItem = {
  product_id: savedProduct.id,
  quantity: 2,
  price_tier: "DP",
  unit_price: savedProduct.unit_price,
  discount: 0,
  subtotal: savedProduct.unit_price * 2
};

// Dropdown options should include: DP, Dynamic tiers, Custom
const dynamicTiers = getProductPriceTiers(savedProduct);
const dropdownOptions = [
  { value: "DP", label: `DP Price (${savedProduct.unit_price})` },
  ...dynamicTiers.map((dt) => ({ value: dt.name, label: `${dt.name} (${dt.price})` })),
  { value: "Custom", label: "Custom Price" }
];

assert.strictEqual(dropdownOptions.length, 5, "Dropdown should have DP + 3 tiers + Custom");
assert.strictEqual(dropdownOptions[0].value, "DP");
assert.strictEqual(dropdownOptions[1].value, "Retail VIP");
assert.strictEqual(dropdownOptions[2].value, "Wholesale Super");
assert.strictEqual(dropdownOptions[3].value, "Special Eid Offer");
assert.strictEqual(dropdownOptions[4].value, "Custom");

// Selecting "Special Eid Offer" from dropdown
function onSelectTier(item, selectedTier, product) {
  const tiers = getProductPriceTiers(product);
  const matched = tiers.find((t) => t.name === selectedTier);
  if (matched) {
    item.price_tier = matched.name;
    item.unit_price = Number(matched.price);
  } else if (selectedTier === "DP") {
    item.price_tier = "DP";
    item.unit_price = product.unit_price;
  } else if (selectedTier === "Custom") {
    item.price_tier = "Custom";
  }
  item.subtotal = (item.unit_price - item.discount) * item.quantity;
  return item;
}

const updatedItem = onSelectTier(orderItem, "Special Eid Offer", savedProduct);
assert.strictEqual(updatedItem.price_tier, "Special Eid Offer");
assert.strictEqual(updatedItem.unit_price, 10200, "Unit price must be updated with exact Box 2 rate");
assert.strictEqual(updatedItem.subtotal, 20400, "Subtotal must be recalculating: 10200 * 2 = 20400");

// Selecting "DP Price" fallback
const dpItem = onSelectTier(orderItem, "DP", savedProduct);
assert.strictEqual(dpItem.unit_price, 12000, "Unit price must return to base DP");

console.log("✔ Order dropdown and price auto-fill logic verified!\n");
console.log("ALL LOGICAL TESTS PASSED SUCCESSFULLY!");
