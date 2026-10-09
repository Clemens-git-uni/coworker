/** Remembers the ordered search results so profile pages can offer previous/next. */
export interface ResultsNav { ids: string[]; backHref: string; scrollY: number }
const KEY = "coworker-results-nav";
const RESTORE = "coworker-restore-scroll";

export function saveResultsNav(nav: ResultsNav) {
  try { sessionStorage.setItem(KEY, JSON.stringify(nav)); } catch { /* ignore */ }
}
export function readResultsNav(): ResultsNav | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return v && Array.isArray(v.ids) && typeof v.backHref === "string" ? v : null;
  } catch { return null; }
}
export function requestScrollRestore(y: number) {
  try { sessionStorage.setItem(RESTORE, String(y)); } catch { /* ignore */ }
}
export function takeScrollRestore(): number | null {
  try {
    const v = sessionStorage.getItem(RESTORE);
    sessionStorage.removeItem(RESTORE);
    return v === null ? null : Number(v);
  } catch { return null; }
}
