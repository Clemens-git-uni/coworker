import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareQuote, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "@/components/ProfileCard";
import { StarRating } from "@/components/StarRating";
import { relationshipLabel } from "@/lib/profile-meta";

function CountUp({ value, decimals = 0, start }: { value: number; decimals?: number; start: boolean }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!start || done.current) return;
    done.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1200);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value]);
  return <>{n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const q = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_stats");
      if (error) throw error;
      return data[0];
    },
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (q.isError) return null;
  const s = q.data;
  const items = [
    { label: "Professionals", value: Number(s?.professionals ?? 0), decimals: 0 },
    { label: "Reviews", value: Number(s?.reviews ?? 0), decimals: 0 },
    { label: "Average rating", value: Number(s?.avg_rating ?? 0), decimals: 1, star: true },
  ];
  return (
    <section ref={ref} aria-label="Platform statistics" className="border-b bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x px-4 py-6">
        {items.map((it) => (
          <div key={it.label} className="px-2 text-center">
            {q.isLoading ? <Skeleton className="mx-auto h-8 w-16" /> : (
              <p className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground md:text-3xl">
                <CountUp value={it.value} decimals={it.decimals} start={seen} />
                {it.star && <Star className="size-5 fill-chart-4 text-chart-4" aria-hidden />}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentlyReviewed() {
  const q = useQuery({
    queryKey: ["recently-reviewed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recently_reviewed", { _limit: 12 });
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) {
    return <section className="mx-auto max-w-6xl px-4 py-12"><Skeleton className="mb-4 h-7 w-48" /><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div></section>;
  }
  const items = q.data ?? [];
  if (q.isError || items.length < 3) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="recent-h">
      <h2 id="recent-h" className="text-2xl font-bold tracking-tight">Recently reviewed</h2>
      <Carousel opts={{ align: "start" }} className="mt-6" aria-label="Recently reviewed professionals">
        <CarouselContent>
          {items.map((p) => (
            <CarouselItem key={p.id} className="basis-[88%] sm:basis-1/2 lg:basis-1/3">
              <ProfileCard p={p} snippet={p.last_review} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-3 hidden md:flex" />
        <CarouselNext className="-right-3 hidden md:flex" />
      </Carousel>
    </section>
  );
}

export function FeaturedReviews() {
  const q = useQuery({
    queryKey: ["featured-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("featured_reviews", { _limit: 3 });
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) {
    return <section className="mx-auto max-w-6xl px-4 py-12"><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div></section>;
  }
  const items = q.data ?? [];
  if (q.isError || items.length < 3) return null;
  return (
    <section className="border-y bg-card" aria-labelledby="featured-h">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 id="featured-h" className="text-2xl font-bold tracking-tight">Featured reviews</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="h-full bg-background">
              <CardContent className="flex h-full flex-col gap-3 pt-6">
                <MessageSquareQuote className="size-5 text-primary" aria-hidden />
                <StarRating value={r.rating} />
                <p className="line-clamp-4 flex-1 text-sm text-foreground/90">“{r.body.length > 180 ? r.body.slice(0, 177) + "…" : r.body}”</p>
                <div className="text-xs text-muted-foreground">
                  <p>
                    {r.reviewer_name || "A colleague"}
                    {relationshipLabel(r.relationship) ? ` · ${relationshipLabel(r.relationship)}` : ""}
                  </p>
                  <p>about <Link to="/profile/$id" params={{ id: r.profile_id }} className="font-semibold text-primary hover:underline">{r.profile_name || "this professional"}</Link></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
