/** Stable React list key; works on HTTP LAN where crypto.randomUUID is unavailable. */
export function createRowKey(prefix = "row") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
