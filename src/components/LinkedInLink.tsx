import { Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function LinkedInLink({ url, label = false, className }: { url?: string | null | undefined; label?: boolean; className?: string }) {
  const { t } = useTranslation("profile");
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t("linkedin.aria")}
      className={cn("relative z-10 inline-flex items-center gap-1 text-primary hover:underline", className)}>
      <Linkedin className="size-4" />{label && <span>{t("linkedin.label")}</span>}
    </a>
  );
}
