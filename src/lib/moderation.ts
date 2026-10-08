// Mirrors the database keyword filter (public.review_contains_abuse) for instant feedback.
const ABUSE =
  /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|bastard\w*|dickhead\w*|retard\w*|whore\w*|slut\w*|faggot\w*|nigger\w*|idiot\w*|moron\w*|kill yourself|kys)\b/i;

export function containsAbuse(text: string) {
  return ABUSE.test(text);
}

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "false_information", label: "False information" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
] as const;

export function reasonLabel(v: string) {
  return REPORT_REASONS.find((r) => r.value === v)?.label ?? v;
}
