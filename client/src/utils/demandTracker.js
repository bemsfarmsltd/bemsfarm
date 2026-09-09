import api from "../services/api";

const LOCAL_STORAGE_KEY = "bf_oos_demand_clicks";
const SUMMARY_STORAGE_KEY = "bf_oos_demand_summary";

/**
 * Record a customer click / intent on an out-of-stock product
 * @param {Object} product - Product data object
 * @param {string} source - Where the click originated (e.g. "shop_page", "home_page", "quick_view")
 * @param {Object} user - Optional logged in user object
 */
export async function recordOutOfStockDemand(product, source = "catalog", user = null) {
  if (!product) return;

  const eventPayload = {
    id: `oos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    productId: product.id,
    productName: product.name,
    category: product.category_name || "Produce",
    price: Number(product.price || 0),
    source,
    timestamp: new Date().toISOString(),
    userEmail: user?.email || undefined,
    userId: user?.id || undefined,
  };

  // 1. Save to Local Persistence
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const updated = [eventPayload, ...existing].slice(0, 500); // Keep latest 500 records
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // Update aggregated summary for procurement planning
    const summary = JSON.parse(localStorage.getItem(SUMMARY_STORAGE_KEY) || "{}");
    const currentCount = summary[product.id] || {
      productId: product.id,
      productName: product.name,
      category: product.category_name,
      clickCount: 0,
      lastRequested: eventPayload.timestamp,
    };
    currentCount.clickCount += 1;
    currentCount.lastRequested = eventPayload.timestamp;
    summary[product.id] = currentCount;
    localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summary));
  } catch (err) {
    console.warn("Local demand tracking write error:", err);
  }

  // 2. Dispatch to Backend Telemetry / Analytics
  try {
    await api.post("/telemetry/demand-click", eventPayload);
  } catch {
    try {
      await api.post("/analytics/events", {
        eventType: "out_of_stock_click",
        payload: eventPayload,
      });
    } catch {
      // Graceful offline fallback
    }
  }

  return eventPayload;
}

/**
 * Get aggregated ranking of most demanded out-of-stock products
 */
export function getOutOfStockDemandSummary() {
  try {
    const summary = JSON.parse(localStorage.getItem(SUMMARY_STORAGE_KEY) || "{}");
    return Object.values(summary).sort((a, b) => b.clickCount - a.clickCount);
  } catch {
    return [];
  }
}

/**
 * Get all detailed timestamped demand clicks
 */
export function getOutOfStockDemandLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
