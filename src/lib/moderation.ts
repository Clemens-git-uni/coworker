import i18n from "@/lib/i18n";
// Mirrors the database keyword filter (public.review_contains_abuse) for instant feedback.
const ABUSE =
  /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|bastard\w*|dickhead\w*|retard\w*|whore\w*|slut\w*|faggot\w*|nigger\w*|idiot\w*|moron\w*|kill yourself|kys)\b/i;

export function containsAbuse(text: string) {
  return ABUSE.test(text);
}

const tr = (key: string) => i18n.t(`reviews:reasons.${key}`);

export const REPORT_REASONS = [
  { value: "harassment", get label() { return tr("harassment"); } },
  { value: "false_information", get label() { return tr("false_information"); } },
  { value: "spam", get label() { return tr("spam"); } },
  { value: "other", get label() { return tr("other"); } },
];

export function reasonLabel(v: string) {
  return REPORT_REASONS.find((r) => r.value === v)?.label ?? v;
}
