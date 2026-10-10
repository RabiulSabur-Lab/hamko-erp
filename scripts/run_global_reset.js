import { resetAllSystemData } from "../src/utils/resetCustomerBalances";

(async () => {
  try {
    const result = await resetAllSystemData();
    console.log("Global reset result:", result);
  } catch (e) {
    console.error("Error during global reset:", e);
  }
})();
