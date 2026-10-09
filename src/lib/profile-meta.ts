export type Proficiency = "basic" | "conversational" | "professional" | "native";
export type ProfileStatus = "active" | "on_leave" | "inactive";
export type Relationship = "managed" | "reported_to" | "peer" | "client" | "vendor";

export interface ProfileLanguage { code: string; proficiency: Proficiency }
export interface ProfileAttribute { slug: string; label: string; count: number }

export const PROFICIENCIES: { value: Proficiency; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "conversational", label: "Conversational" },
  { value: "professional", label: "Professional" },
  { value: "native", label: "Native" },
];
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
export const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();

export const STATUSES: { value: ProfileStatus; label: string; help: string }[] = [
  { value: "active", label: "Active", help: "You're working and open to messages. Shown normally everywhere." },
  { value: "on_leave", label: "On leave", help: "Temporarily away (parental leave, sabbatical…). You stay in search with an \"On leave\" badge." },
  { value: "inactive", label: "Inactive", help: "Not currently working. Hidden from search and homepage stats, but your profile link still works." },
];
export const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

export const RELATIONSHIPS: { value: Relationship; label: string; filter: string }[] = [
  { value: "managed", label: "Managed them", filter: "Managers" },
  { value: "reported_to", label: "Reported to them", filter: "Direct reports" },
  { value: "peer", label: "Peer / same team", filter: "Peers" },
  { value: "client", label: "Client", filter: "Clients" },
  { value: "vendor", label: "Vendor", filter: "Vendors" },
];
export const relationshipLabel = (r: string | null | undefined) => RELATIONSHIPS.find((x) => x.value === r)?.label ?? null;

export function formatYearRange(from: string | null, to: string | null) {
  if (!from) return null;
  const a = from.slice(0, 4);
  const b = to ? to.slice(0, 4) : "Present";
  return a === b ? a : `${a}–${b}`;
}

/** "Managed them · Acme GmbH · 2021–2023" or null for legacy reviews. */
export function reviewContextLabel(r: { relationship?: string | null; worked_company?: string | null; worked_from?: string | null; worked_to?: string | null }) {
  const parts = [relationshipLabel(r.relationship), r.worked_company, formatYearRange(r.worked_from ?? null, r.worked_to ?? null)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function formatDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
