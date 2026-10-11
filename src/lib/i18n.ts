import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const UI_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number]["code"];
const STORAGE_KEY = "coworker-ui-language";

// One JSON file per language and feature namespace: src/locales/<lang>/<ns>.json
const files = import.meta.glob<{ default: Record<string, unknown> }>("../locales/*/*.json", { eager: true });
const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, mod] of Object.entries(files)) {
  const m = path.match(/locales\/(\w+)\/(\w+)\.json$/);
  if (!m) continue;
  const [, lng, ns] = m as unknown as [string, string, string];
  (resources[lng] ??= {})[ns] = mod.default;
}

export const isUiLanguage = (v: unknown): v is UiLanguage => UI_LANGUAGES.some((l) => l.code === v);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "en", // server render + first client render are English; the stored choice is applied after hydration
    fallbackLng: "en",
    defaultNS: "common",
    ns: Object.keys(resources["en"] ?? { common: {} }),
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key ${ns}:${key} (${lngs.join(",")})`);
    },
  });
}

export function setHtmlLang(lng: string) {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
}

export function readStoredLanguage(): UiLanguage {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (isUiLanguage(s)) return s;
  } catch { /* ignore */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l?.slice(0, 2).toLowerCase();
    if (isUiLanguage(base)) return base;
  }
  return "en";
}

export function applyLanguage(lng: UiLanguage, persist = true) {
  if (persist) { try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ } }
  setHtmlLang(lng);
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
}

/** Call once from a root useEffect. */
export function syncClientLanguage() {
  applyLanguage(readStoredLanguage(), false);
}

export default i18n;
