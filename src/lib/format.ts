import { useTranslation } from "react-i18next";

const localeFor = (lng: string) => (lng === "de" ? "de-DE" : "en-US");

/** Locale-aware formatters following the selected UI language. */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  return {
    locale,
    number: (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts).format(n),
    date: (d: string | number | Date, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }) =>
      new Intl.DateTimeFormat(locale, opts).format(new Date(d)),
    monthYear: (d: string | number | Date) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" }).format(new Date(d)),
    relative: (d: string | number | Date) => {
      const diff = (new Date(d).getTime() - Date.now()) / 1000;
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
      for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
      return rtf.format(Math.round(diff), "second");
    },
  };
}
