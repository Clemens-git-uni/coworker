/** Normalize user input to https://www.linkedin.com/in/<handle>, or return null if invalid. */
export function normalizeLinkedIn(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  const m = u.pathname.match(/^\/in\/([A-Za-z0-9\-_%]{3,100})\/?$/);
  if (!m) return null;
  return `https://www.linkedin.com/in/${m[1]}`;
}
