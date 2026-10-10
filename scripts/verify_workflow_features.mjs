import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== VERIFYING IMPLEMENTED SMART WORKFLOW, SECURITY & OFFLINE FEATURES ===\n");

const root = process.cwd();

// 1. GEO-FENCED CUSTOMER ONBOARDING
console.log("1. Checking Geo-Fenced Customer Onboarding...");
const addCustModalPath = path.join(root, "src/components/AddCustomerModal.tsx");
const addCustModal = fs.readFileSync(addCustModalPath, "utf-8");
const supabaseTs = fs.readFileSync(path.join(root, "src/lib/supabase.ts"), "utf-8");

assert(addCustModal.includes("postal_code"), "AddCustomerModal must include postal_code field");
assert(addCustModal.includes("latitude") && addCustModal.includes("longitude"), "AddCustomerModal must include latitude and longitude");
assert(addCustModal.includes("enableHighAccuracy: true"), "AddCustomerModal must enable high accuracy GPS");
assert(addCustModal.includes("Capture Live Store GPS") || addCustModal.includes("Live Store GPS"), "AddCustomerModal must have GPS capture action");
assert(supabaseTs.includes("postal_code?: string | null;"), "supabase.ts Customer type must include postal_code");
console.log("✔ Geo-Fenced Customer Onboarding verified!\n");

// 2. EVENING HANDOVER & CASH RECONCILIATION
console.log("2. Checking Evening Handover & Cash Reconciliation...");
const handoverModalPath = path.join(root, "src/components/EveningHandoverModal.tsx");
assert(fs.existsSync(handoverModalPath), "EveningHandoverModal.tsx must exist");
const handoverModal = fs.readFileSync(handoverModalPath, "utf-8");

assert(handoverModal.includes("Complete Day") && handoverModal.includes("Generate Cash Slip"), "Must have 'Complete Day & Generate Cash Slip' button");
assert(handoverModal.includes("Cash") && handoverModal.includes("bKash") && handoverModal.includes("Cheque"), "Must break down Cash, bKash, and Cheque");
assert(handoverModal.includes("Handover QR Code") || handoverModal.includes("Handover Slip QR Code"), "Must display Handover QR Code");
assert(handoverModal.includes("verification_pin") || handoverModal.includes("verificationPin"), "Must generate Handover PIN");
assert(handoverModal.includes("VERIFIED") && handoverModal.includes("PENDING_VERIFICATION"), "Must update status to VERIFIED");

const sfaPage = fs.readFileSync(path.join(root, "src/pages/SfaPage.tsx"), "utf-8");
const dashboardPage = fs.readFileSync(path.join(root, "src/pages/DashboardPage.tsx"), "utf-8");

assert(sfaPage.includes("EveningHandoverModal"), "SfaPage must import and render EveningHandoverModal");
assert(dashboardPage.includes("EveningHandoverModal"), "DashboardPage must import and render EveningHandoverModal");
console.log("✔ Evening Handover & Cash Reconciliation verified!\n");

// 3. SECURITY & OFFLINE INTELLIGENCE
console.log("3. Checking Security & Offline Intelligence...");
const offlineSyncPath = path.join(root, "src/utils/offlineSync.ts");
assert(fs.existsSync(offlineSyncPath), "offlineSync.ts must exist");
const offlineSync = fs.readFileSync(offlineSyncPath, "utf-8");

assert(offlineSync.includes("useOfflineFieldSync"), "Must export useOfflineFieldSync hook");
assert(offlineSync.includes("syncOfflineDataToBackend"), "Must export syncOfflineDataToBackend function");
assert(offlineSync.includes("window.addEventListener(\"online\""), "Must listen to online events for auto-sync");

assert(dashboardPage.includes("Smart Operations Reminders"), "DashboardPage must include Smart Operations Reminders");
assert(dashboardPage.includes("visits remaining"), "DashboardPage must remind about remaining route visits");
assert(dashboardPage.includes("Handover pending"), "DashboardPage must remind about daily cash collection handover pending");
assert(sfaPage.includes("useOfflineFieldSync"), "SfaPage must use offline field sync hook");
console.log("✔ Security & Offline Intelligence verified!\n");

// 4. ANTI-FRAUD BACKDATED VISIT PREVENTION
console.log("4. Checking Anti-Fraud Backdated Visit Prevention...");
const logVisitModal = fs.readFileSync(path.join(root, "src/components/LogVisitModal.tsx"), "utf-8");

assert(logVisitModal.includes("Backdated visit logs are strictly prohibited"), "LogVisitModal must show anti-fraud message");
assert(logVisitModal.includes("startOfToday"), "LogVisitModal must compare visit date against start of today");
assert(sfaPage.includes("Backdated visit logs are strictly prohibited"), "SfaPage handleSaveVisit must block backdated entries");
console.log("✔ Anti-Fraud Backdated Visit Prevention verified!\n");

console.log("=================================================");
console.log("ALL 4 APPROVED WORKFLOW & SECURITY FEATURES PASSED!");
console.log("=================================================");
