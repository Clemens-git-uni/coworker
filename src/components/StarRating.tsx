import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useFormat } from "@/lib/format";

export function StarRating({ value, className }: { value: number; className?: string }) {
  const { t } = useTranslation("profile");
  const { number } = useFormat();
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={t("rating_aria", { value: number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            value >= i - 0.25 ? "fill-chart-4 text-chart-4" : "fill-muted text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
