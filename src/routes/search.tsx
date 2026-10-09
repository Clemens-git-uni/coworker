import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "@/components/ProfileCard";
import { MultiSelectFilter, type FilterOption } from "@/components/MultiSelectFilter";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, PROFICIENCIES, languageName, proficiencyLabel } from "@/lib/profile-meta";
import { saveResultsNav, takeScrollRestore } from "@/lib/results-nav";

const PAGE_SIZE = 12;
const REVIEW_PRESETS = [0, 1, 5, 10, 25, 50];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  location: fallback(z.string(), "").default(""),
  minRating: fallback(z.number(), 0).default(0),
  minReviews: fallback(z.number().int(), 0).default(0),
  positions: fallback(z.array(z.string().max(200)).max(30), []).default([]),
  companies: fallback(z.array(z.string().max(200)).max(30), []).default([]),
  languages: fallback(z.array(z.string().max(10)).max(20), []).default([]),
  minProficiency: fallback(z.string(), "").default(""),
  attributes: fallback(z.array(z.string().max(60)).max(20), []).default([]),
  showInactive: fallback(z.boolean(), false).default(false),
  sort: fallback(z.string(), "rating").default("rating"),
  page: fallback(z.number().int(), 1).default(1),
});
type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Find professionals — CoWorker" },
      { name: "description", content: "Search professionals by name, position, company, rating, review count and location." },
      { property: "og:title", content: "Find professionals — CoWorker" },
      { property: "og:description", content: "Search and compare rated professionals on CoWorker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const sort = ["rating", "reviews", "newest"].includes(s.sort) ? s.sort : "rating";
  const minRating = Math.max(0, Math.min(5, s.minRating));
  const minReviews = Math.max(0, s.minReviews);
  const page = Math.max(1, s.page);

  const [q, setQ] = useState(s.q);
  const [loc, setLoc] = useState(s.location);
  useEffect(() => { setQ(s.q); setLoc(s.location); }, [s.q, s.location]);

  const optionsQ = useQuery({
    queryKey: ["filter-options"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("profile_filter_options");
      if (error) throw error;
      const pick = (k: string): FilterOption[] => data.filter((d) => d.kind === k).map((d) => ({ value: d.value, count: Number(d.n) }));
      return { positions: pick("headline"), companies: pick("company") };
    },
  });

  const minProficiency = PROFICIENCIES.some((p) => p.value === s.minProficiency) ? s.minProficiency : "";
  const attrQ = useQuery({
    queryKey: ["attributes"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("attributes").select("slug, label").order("label");
      if (error) throw error;
      return data;
    },
  });
  const attrLabel = (slug: string) => attrQ.data?.find((a) => a.slug === slug)?.label ?? slug;

  const filterArgs = {
    _q: s.q.slice(0, 100),
    _location: s.location.slice(0, 100),
    _min_rating: minRating,
    _headlines: s.positions,
    _companies: s.companies,
    _min_reviews: minReviews,
    _languages: s.languages,
    _min_proficiency: minProficiency,
    _attributes: s.attributes,
    _include_inactive: s.showInactive,
    _sort: sort,
  };
  const filterKey = JSON.stringify(filterArgs);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["search", filterKey, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles_v3", { ...filterArgs, _limit: PAGE_SIZE, _offset: (page - 1) * PAGE_SIZE });
      if (error) throw error;
      return data;
    },
  });

  // Full ordered id list (lightweight) so profile pages can offer previous/next.
  const idsQ = useQuery({
    queryKey: ["search-ids", filterKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles_v3", { ...filterArgs, _limit: 500, _offset: 0 }).select("id");
      if (error) throw error;
      return (data as { id: string }[]).map((r) => r.id);
    },
  });

  useEffect(() => {
    if (isLoading) return;
    const y = takeScrollRestore();
    if (y !== null) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [isLoading]);

  function rememberResults() {
    const ids = idsQ.data ?? (data ?? []).map((r) => r.id);
    saveResultsNav({ ids, backHref: window.location.pathname + window.location.search, scrollY: window.scrollY });
  }

  const results = data ?? [];
  const total = Number(results[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(patch: Partial<SearchParams>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });
  }

  const chips: { label: string; remove: () => void }[] = [
    ...(s.q ? [{ label: `“${s.q}”`, remove: () => update({ q: "" }) }] : []),
    ...(s.location ? [{ label: `Location: ${s.location}`, remove: () => update({ location: "" }) }] : []),
    ...(minRating ? [{ label: `${minRating}+ stars`, remove: () => update({ minRating: 0 }) }] : []),
    ...(minReviews ? [{ label: `${minReviews}+ reviews`, remove: () => update({ minReviews: 0 }) }] : []),
    ...s.positions.map((p) => ({ label: p, remove: () => update({ positions: s.positions.filter((x) => x !== p) }) })),
    ...s.companies.map((c) => ({ label: c, remove: () => update({ companies: s.companies.filter((x) => x !== c) }) })),
    ...s.languages.map((l) => ({ label: `${languageName(l)}${minProficiency ? ` (${proficiencyLabel(minProficiency)}+)` : ""}`, remove: () => update({ languages: s.languages.filter((x) => x !== l) }) })),
    ...s.attributes.map((a) => ({ label: attrLabel(a), remove: () => update({ attributes: s.attributes.filter((x) => x !== a) }) })),
    ...(s.showInactive ? [{ label: "Including inactive", remove: () => update({ showInactive: false }) }] : []),
  ];
  const clearAll = () => navigate({ search: { sort } as SearchParams });

  const panel = (
    <div className="space-y-6">
      <MultiSelectFilter label="Position / expertise" options={optionsQ.data?.positions ?? []} loading={optionsQ.isLoading}
        selected={s.positions} onChange={(positions) => update({ positions })} />
      <MultiSelectFilter label="Company" options={optionsQ.data?.companies ?? []} loading={optionsQ.isLoading}
        selected={s.companies} onChange={(companies) => update({ companies })} />
      <MultiSelectFilter label="Language" options={LANGUAGES.map((l) => ({ value: l.code, label: l.name, count: 0 }))}
        selected={s.languages} onChange={(languages) => update({ languages })} hideCounts />
      {s.languages.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Minimum proficiency</legend>
          <Select value={minProficiency || "any"} onValueChange={(v) => update({ minProficiency: v === "any" ? "" : v })}>
            <SelectTrigger aria-label="Minimum proficiency"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any level</SelectItem>
              {PROFICIENCIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}+</SelectItem>)}
            </SelectContent>
          </Select>
        </fieldset>
      )}
      <MultiSelectFilter label="Strengths" options={(attrQ.data ?? []).map((a) => ({ value: a.slug, label: a.label, count: 0 }))}
        loading={attrQ.isLoading} selected={s.attributes} onChange={(attributes) => update({ attributes })} hideCounts />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Minimum reviews</legend>
        <div className="flex flex-wrap gap-1.5">
          {REVIEW_PRESETS.map((n) => (
            <Button key={n} type="button" size="sm" variant={minReviews === n ? "default" : "outline"} aria-pressed={minReviews === n}
              onClick={() => update({ minReviews: n })}>
              {n === 0 ? "Any" : `${n}+`}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Minimum rating</legend>
        <Select value={String(minRating)} onValueChange={(v) => update({ minRating: Number(v) })}>
          <SelectTrigger aria-label="Minimum rating"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            {[4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n}+ stars</SelectItem>)}
          </SelectContent>
        </Select>
      </fieldset>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="show-inactive" className="text-sm font-semibold">Show inactive profiles</Label>
        <Switch id="show-inactive" checked={s.showInactive} onCheckedChange={(v) => update({ showInactive: v })} />
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">Profiles on leave are always included, with a badge.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Find professionals</h1>

      <form
        className="mt-4 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[2fr_1.3fr_1fr_auto] md:items-end"
        onSubmit={(e) => { e.preventDefault(); update({ q: q.trim(), location: loc.trim() }); }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">Name, company or job title</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="q" className="pl-8" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Designer, Acme" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={loc} maxLength={100} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Vienna" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort by</Label>
          <Select value={sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest rated</SelectItem>
              <SelectItem value="reviews">Most reviewed</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20 rounded-xl border bg-card p-4">{panel}</div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="size-4" />Filters{chips.length ? ` (${chips.length})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-4 px-1">{panel}</div>
              </SheetContent>
            </Sheet>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isLoading ? "Searching…" : `${total} ${total === 1 ? "professional" : "professionals"} found`}
            </p>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Badge key={c.label} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
                  <span className="max-w-48 truncate">{c.label}</span>
                  <button type="button" onClick={c.remove} aria-label={`Remove filter ${c.label}`} className="rounded-full p-0.5 hover:bg-background">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="link" size="sm" className="h-auto p-0" onClick={clearAll}>Clear all</Button>
            </div>
          )}

          <div className={`mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isFetching && !isLoading ? "opacity-60" : ""}`}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)
              : results.map((p) => <ProfileCard key={p.id} p={p} onOpen={rememberResults} linkSearch={{ nav: true }} />)}
          </div>

          {isError && (
            <Card className="mt-3"><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-destructive">Search failed to load.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </CardContent></Card>
          )}

          {!isLoading && !isError && total === 0 && (
            <Card className="mt-3"><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-semibold">No professionals match these filters</p>
              <p className="text-sm text-muted-foreground">Try removing a filter or broadening your search.</p>
              {chips.length > 0 && <Button variant="outline" size="sm" onClick={clearAll}>Clear all filters</Button>}
            </CardContent></Card>
          )}

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                <ChevronLeft className="size-4" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {Math.min(page, pages)} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>
                Next<ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
