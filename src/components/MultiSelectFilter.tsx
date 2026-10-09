import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption { value: string; count: number; label?: string }

/** Searchable checkbox list for multi-select filters. */
export function MultiSelectFilter({ label, options, selected, onChange, loading, hideCounts }: {
  label: string; options: FilterOption[]; selected: string[]; onChange: (next: string[]) => void; loading?: boolean; hideCounts?: boolean;
}) {
  const [term, setTerm] = useState("");
  const shown = options.filter((o) => (o.label ?? o.value).toLowerCase().includes(term.toLowerCase())).slice(0, 50);
  const id = label.toLowerCase().replace(/\W+/g, "-");

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <Input placeholder={`Search ${label.toLowerCase()}…`} value={term} onChange={(e) => setTerm(e.target.value)} aria-label={`Search ${label}`} className="h-8" />
      <div role="group" aria-labelledby={id} className="max-h-48 space-y-0.5 overflow-y-auto">
        {loading ? <p className="py-2 text-xs text-muted-foreground">Loading…</p>
          : shown.length === 0 ? <p className="py-2 text-xs text-muted-foreground">No matches</p>
          : shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button key={o.value} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {on && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label ?? o.value}</span>
                {!hideCounts && <span className="text-xs text-muted-foreground">{o.count}</span>}
              </button>
            );
          })}
      </div>
    </fieldset>
  );
}
