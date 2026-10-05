import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5 stars`}>
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
