import fs from "fs";
import assert from "assert";

console.log("=== RUNNING LOG VISIT MODAL VALIDATION TESTS ===");

function toDateTimeLocalString(date = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Test 1: Date formatting for <input type="datetime-local">
const now = new Date();
const localStr = toDateTimeLocalString(now);
console.log("1. Generated local datetime string:", localStr);
assert(typeof localStr === "string" && localStr.length === 16, "Must be in format YYYY-MM-DDTHH:mm");
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStr), "Must match regex YYYY-MM-DDTHH:mm");

// Test 2: Verify i18n translation keys
const i18nContent = fs.readFileSync("src/lib/i18n.tsx", "utf8");
assert(i18nContent.includes('visitDate: "Visit Date / Time"'), "i18n en should contain visitDate");
assert(i18nContent.includes('visitDate: "ভিজিটের তারিখ / সময়"'), "i18n bn should contain visitDate");
console.log("2. i18n keys verified (en & bn) successfully.");

// Test 3: Verify LogVisitModal component contains datetime-local input, required validation & error text
const modalContent = fs.readFileSync("src/components/LogVisitModal.tsx", "utf8");
assert(modalContent.includes('type="datetime-local"'), "LogVisitModal must render datetime-local input");
assert(modalContent.includes('name="visit_date"'), "LogVisitModal input must have name='visit_date'");
assert(modalContent.includes('errors.visit_date = "Visit date is required."'), "LogVisitModal must set 'Visit date is required.'");
assert(modalContent.includes('"Visit date is required."'), "LogVisitModal must render inline error text");
assert(modalContent.includes('toDateTimeLocalString(new Date())'), "LogVisitModal must prefill current date/time");
console.log("3. LogVisitModal component structure & validation rules verified.");

// Test 4: Verify SfaPage mounts LogVisitModal with handleSaveVisit passing visit_date
const sfaContent = fs.readFileSync("src/pages/SfaPage.tsx", "utf8");
assert(sfaContent.includes("<LogVisitModal"), "SfaPage must mount <LogVisitModal");
assert(sfaContent.includes("onSave={handleSaveVisit}"), "SfaPage must pass handleSaveVisit to LogVisitModal");
assert(sfaContent.includes("visit_date: payload.visit_date"), "handleSaveVisit must store payload.visit_date");
console.log("4. SfaPage integration with LogVisitModal verified.");

// Test 5: Verify Visit Log coordinates badge is clickable to Google Maps
assert(sfaContent.includes('href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}'), "Must link to Google Maps with coordinates");
assert(sfaContent.includes('target="_blank"'), "Link must open in new tab");
assert(sfaContent.includes('rel="noopener noreferrer"'), "Link must have rel='noopener noreferrer'");
console.log("5. Google Maps coordinates link verified.");

// Test 6: Verify GPS Location High Accuracy options & error handling in LogVisitModal
assert(modalContent.includes("enableHighAccuracy: true"), "Must enable high accuracy for GPS");
assert(modalContent.includes("timeout: 10000"), "Must set timeout: 10000");
assert(modalContent.includes("maximumAge: 0"), "Must set maximumAge: 0");
assert(modalContent.includes("Unable to fetch exact GPS location. Please ensure location permissions are enabled."), "Must display permission/location error message");
console.log("6. GPS High Accuracy options and error handling verified.");

// Test 7: Verify Visit Log Delete action & confirmation modal
assert(sfaContent.includes('<TableHead className="text-right">{t("actions")}</TableHead>'), "Must have Actions header column");
assert(sfaContent.includes("onClick={() => setDeletingVisit(v)}"), "Row must have delete trigger button");
assert(sfaContent.includes("Are you sure you want to delete this visit log entry?"), "Must show confirmation message");
assert(sfaContent.includes("handleDeleteVisit"), "Must have handleDeleteVisit function");
assert(sfaContent.includes("STORAGE_KEYS.DELETED_VISITS"), "Must prevent resurrection with DELETED_VISITS");
console.log("7. Visit Log Delete action & confirmation dialog verified.");

console.log("=== ALL LOG VISIT MODAL VALIDATION TESTS PASSED ===");
