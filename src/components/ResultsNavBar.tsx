import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readResultsNav, requestScrollRestore, type ResultsNav } from "@/lib/results-nav";
import { profileQueryOptions } from "@/lib/profile-queries";

export function ResultsNavBar({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nav, setNav] = useState<ResultsNav | null>(null);
  useEffect(() => { setNav(readResultsNav()); }, []);

  const idx = nav ? nav.ids.indexOf(id) : -1;
  const prev = idx > 0 ? nav!.ids[idx - 1] : null;
  const next = nav && idx >= 0 && idx < nav.ids.length - 1 ? nav.ids[idx + 1] : null;

  useEffect(() => {
    for (const n of [prev, next]) if (n) qc.prefetchQuery(profileQueryOptions(n));
  }, [prev, next, qc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable=true], [role=dialog]"))) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" && prev) navigate({ to: "/profile/$id", params: { id: prev }, search: { nav: true } });
      if (e.key === "ArrowRight" && next) navigate({ to: "/profile/$id", params: { id: next }, search: { nav: true } });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, navigate]);

  if (!nav || idx < 0) return null;
  return (
    <nav aria-label="Search results navigation" className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" size="sm" asChild>
        <a href={nav.backHref} onClick={(e) => { e.preventDefault(); requestScrollRestore(nav.scrollY); navigate({ href: nav.backHref }); }}>
          <ArrowLeft className="size-4" />Back to results
        </a>
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!prev} asChild={!!prev} aria-label="Previous profile">
          {prev ? <Link to="/profile/$id" params={{ id: prev }} search={{ nav: true }}><ChevronLeft className="size-4" />Previous</Link>
            : <span><ChevronLeft className="size-4" />Previous</span>}
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">{idx + 1} of {nav.ids.length}</span>
        <Button variant="outline" size="sm" disabled={!next} asChild={!!next} aria-label="Next profile">
          {next ? <Link to="/profile/$id" params={{ id: next }} search={{ nav: true }}>Next<ChevronRight className="size-4" /></Link>
            : <span>Next<ChevronRight className="size-4" /></span>}
        </Button>
      </div>
    </nav>
  );
}
