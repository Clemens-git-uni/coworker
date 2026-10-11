import i18n from "@/lib/i18n";
export type Proficiency = "basic" | "conversational" | "professional" | "native";
export type ProfileStatus = "active" | "on_leave" | "inactive";
export type Relationship = "managed" | "reported_to" | "peer" | "client" | "vendor";

export interface ProfileLanguage { code: string; proficiency: Proficiency }
export interface ProfileAttribute { slug: string; label: string; count: number }

const tr = (key: string) => i18n.t(`meta:${key}`);
const withLabels = <T extends object>(item: T, keys: Record<string, string>) => {
  for (const [prop, key] of Object.entries(keys)) Object.defineProperty(item, prop, { get: () => tr(key), enumerable: true });
  return item;
};

export const PROFICIENCIES = (["basic", "conversational", "professional", "native"] as Proficiency[])
  .map((value) => withLabels({ value } as { value: Proficiency; label: string }, { label: `proficiency.${value}` }));
export const proficiencyLabel = (p: string) => PROFICIENCIES.find((x) => x.value === p)?.label ?? p;

export const LANGUAGES: { code: string; name: string }[] = [
  ["ar", "Arabic"], ["bg", "Bulgarian"], ["bn", "Bengali"], ["ca", "Catalan"], ["cs", "Czech"], ["da", "Danish"],
  ["de", "German"], ["el", "Greek"], ["en", "English"], ["es", "Spanish"], ["et", "Estonian"], ["fa", "Persian"],
  ["fi", "Finnish"], ["fr", "French"], ["he", "Hebrew"], ["hi", "Hindi"], ["hr", "Croatian"], ["hu", "Hungarian"],
  ["id", "Indonesian"], ["it", "Italian"], ["ja", "Japanese"], ["ko", "Korean"], ["lt", "Lithuanian"], ["lv", "Latvian"],
  ["ms", "Malay"], ["nl", "Dutch"], ["no", "Norwegian"], ["pl", "Polish"], ["pt", "Portuguese"], ["ro", "Romanian"],
  ["ru", "Russian"], ["sk", "Slovak"], ["sl", "Slovenian"], ["sr", "Serbian"], ["sv", "Swedish"], ["sw", "Swahili"],
  ["ta", "Tamil"], ["th", "Thai"], ["tl", "Filipino"], ["tr", "Turkish"], ["uk", "Ukrainian"], ["ur", "Urdu"],
  ["vi", "Vietnamese"], ["zh", "Chinese"],
].map(([code, name]) => ({ code: code!, name: name! }));
export const languageName = (code: string) => {
  try { return new Intl.DisplayNames([i18n.language || "en"], { type: "language" }).of(code) ?? code.toUpperCase(); }
  catch { return LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase(); }
};

export const STATUSES = (["active", "on_leave", "inactive"] as ProfileStatus[])
  .map((value) => withLabels({ value } as { value: ProfileStatus; label: string; help: string }, { label: `status.${value}`, help: `statusHelp.${value}` }));
export const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

export const RELATIONSHIPS = (["managed", "reported_to", "peer", "client", "vendor"] as Relationship[])
  .map((value) => withLabels({ value } as { value: Relationship; label: string; filter: string }, { label: `relationship.${value}`, filter: `relationshipFilter.${value}` }));
export const relationshipLabel = (r: string | null | undefined) => RELATIONSHIPS.find((x) => x.value === r)?.label ?? null;

export function formatYearRange(from: string | null, to: string | null) {
  if (!from) return null;
  const a = from.slice(0, 4);
  const b = to ? to.slice(0, 4) : tr("present");
  return a === b ? a : `${a}–${b}`;
}

/** "Managed them · Acme GmbH · 2021–2023" or null for legacy reviews. */
export function reviewContextLabel(r: { relationship?: string | null; worked_company?: string | null; worked_from?: string | null; worked_to?: string | null }) {
  const parts = [relationshipLabel(r.relationship), r.worked_company, formatYearRange(r.worked_from ?? null, r.worked_to ?? null)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function formatDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}
