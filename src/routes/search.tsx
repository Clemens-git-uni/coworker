import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/StarRating";

const PAGE_SIZE = 12;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  location: fallback(z.string(), "").default(""),
  minRating: fallback(z.number(), 0).default(0),
  sort: fallback(z.string(), "rating").default("rating"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Find professionals — CoWorker" },
      { name: "description", content: "Search professionals by name, company or job title, and filter by rating and location." },
      { property: "og:title", content: "Find professionals — CoWorker" },
      { property: "og:description", content: "Search and compare rated professionals on CoWorker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function initials(name: string) {
  return (name.trim() || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function SearchPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const sort = ["rating", "reviews", "newest"].includes(s.sort) ? s.sort : "rating";
  const minRating = Math.max(0, Math.min(5, s.minRating));
  const page = Math.max(1, s.page);

  const [q, setQ] = useState(s.q);
  const [loc, setLoc] = useState(s.location);
  useEffect(() => { setQ(s.q); setLoc(s.location); }, [s.q, s.location]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", s.q, s.location, minRating, sort, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles", {
        _q: s.q.slice(0, 100),
        _location: s.location.slice(0, 100),
        _min_rating: minRating,
        _sort: sort,
        _limit: PAGE_SIZE,
        _offset: (page - 1) * PAGE_SIZE,
      });
      if (error) throw error;
      return data;
    },
  });

  const results = data ?? [];
  const total = Number(results[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(patch: Partial<z.infer<typeof searchSchema>>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Find professionals</h1>

      <form
        className="mt-4 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[2fr_1.3fr_1fr_1fr_auto] md:items-end"
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
          <Label>Minimum rating</Label>
          <Select value={String(minRating)} onValueChange={(v) => update({ minRating: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              {[4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n}+ stars</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sort by</Label>
          <Select value={sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest rated</SelectItem>
              <SelectItem value="reviews">Most reviewed</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Search</Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isLoading ? "Searching…" : `${total} ${total === 1 ? "professional" : "professionals"} found`}
      </p>

      <div className={`mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          : results.map((p) => (
              <Link key={p.id} to="/profile/$id" params={{ id: p.id }}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex gap-4 pt-6">
                    <Avatar className="size-14">
                      <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(p.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-semibold">{p.full_name || "Unnamed professional"}</p>
                      {p.headline && <p className="line-clamp-2 text-sm text-foreground/80">{p.headline}</p>}
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {p.company && <span className="flex items-center gap-1"><Building2 className="size-3" />{p.company}</span>}
                        {p.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{p.location}</span>}
                      </div>
                      <div className="flex items-center gap-2 pt-1 text-sm">
                        <StarRating value={Number(p.avg_rating)} />
                        <span className="font-semibold">{Number(p.review_count) ? Number(p.avg_rating).toFixed(1) : "–"}</span>
                        <span className="text-muted-foreground">({p.review_count} {Number(p.review_count) === 1 ? "review" : "reviews"})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {!isLoading && total === 0 && (
        <Card className="mt-3"><CardContent className="py-12 text-center text-muted-foreground">No professionals match your search.</CardContent></Card>
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
  );
}
