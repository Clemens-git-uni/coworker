import { Badge } from "@/components/ui/badge";
import { languageName, proficiencyLabel, formatDate, type ProfileAttribute, type ProfileLanguage } from "@/lib/profile-meta";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, returnDate, className }: { status: string; returnDate?: string | null | undefined; className?: string }) {
  if (status !== "on_leave" && status !== "inactive") return null;
  return (
    <Badge variant="outline" className={cn(status === "on_leave" ? "border-warning/60 text-warning" : "text-muted-foreground", className)}>
      {status === "on_leave" ? "On leave" : "Inactive"}
      {returnDate ? ` · back ${formatDate(returnDate)}` : ""}
    </Badge>
  );
}

export function LanguageBadges({ languages, max, className }: { languages: ProfileLanguage[]; max?: number; className?: string }) {
  if (!languages.length) return null;
  const shown = max ? languages.slice(0, max) : languages;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((l) => (
        <Badge key={l.code} variant="secondary" className="px-1.5 py-0 text-[11px] font-medium" title={`${languageName(l.code)} · ${proficiencyLabel(l.proficiency)}`}>
          {languageName(l.code)}<span className="ml-1 text-muted-foreground">{proficiencyLabel(l.proficiency)}</span>
        </Badge>
      ))}
      {max && languages.length > max && <span className="text-[11px] text-muted-foreground">+{languages.length - max}</span>}
    </div>
  );
}

export function AttributePills({ attributes, onSelect, active, className }: {
  attributes: ProfileAttribute[]; onSelect?: (slug: string) => void; active?: string | null; className?: string;
}) {
  if (!attributes.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {attributes.map((a) => {
        const content = <>{a.label} · {a.count}</>;
        const cls = "rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary";
        return onSelect ? (
          <button key={a.slug} type="button" aria-pressed={active === a.slug} onClick={() => onSelect(a.slug)}
            className={cn(cls, "hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active === a.slug && "bg-primary text-primary-foreground")}>
            {content}
          </button>
        ) : <span key={a.slug} className={cls}>{content}</span>;
      })}
    </div>
  );
}
