export function formatNumber(val: number | string | undefined | null, decimals: number = 4): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "string") return val;
  if (!isFinite(val)) return "∞";
  return val.toFixed(decimals);
}

export function formatMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  return `${ms.toFixed(1)} ms`;
}
