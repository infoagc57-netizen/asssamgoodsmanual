const LEGACY_STORAGE_KEY = "agc_rate_master";
const MIGRATED_FLAG_KEY = "agc_rate_master_migrated_v1";

export async function migrateLegacyRatesFromBrowser() {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(MIGRATED_FLAG_KEY) === "1") return false;

  let legacy = [];
  try {
    legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
  } catch {
    legacy = [];
  }
  if (!Array.isArray(legacy) || legacy.length === 0) {
    window.localStorage.setItem(MIGRATED_FLAG_KEY, "1");
    return false;
  }

  const response = await fetch("/api/rates/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rates: legacy }),
  });
  if (!response.ok) return false;

  window.localStorage.setItem(MIGRATED_FLAG_KEY, "1");
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return true;
}

export async function fetchRatesFromApi() {
  const response = await fetch("/api/rates", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load rates");
  }
  const data = await response.json();
  return Array.isArray(data.rates) ? data.rates : [];
}

export async function loadRatesWithMigration() {
  await migrateLegacyRatesFromBrowser();
  return fetchRatesFromApi();
}
