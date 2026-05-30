const STORAGE_KEY = "coordinator-seen-tx";
const MAX_IDS = 200;

export function getCoordinatorSeenTransactionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function markCoordinatorTransactionAsSeen(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const seen = getCoordinatorSeenTransactionIds();
    seen.add(id);
    const arr = Array.from(seen).slice(-MAX_IDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function markAllCoordinatorTransactionsAsSeen(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const seen = getCoordinatorSeenTransactionIds();
    for (const id of ids) seen.add(id);
    const arr = Array.from(seen).slice(-MAX_IDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}
