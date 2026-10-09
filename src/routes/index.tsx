import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoWorker — Trusted reviews of professionals" },
      {
        name: "description",
        content:
          "CoWorker is the professional reputation platform. Discover, rate, and review the people you work with.",
      },
      { property: "og:title", content: "CoWorker — Trusted reviews of professionals" },
      {
        property: "og:description",
        content:
          "Discover, rate, and review the professionals you work with on CoWorker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Star,
    title: "Honest ratings",
    text: "1–5 star ratings and short, focused reviews keep feedback clear and useful.",
  },
  {
    icon: ShieldCheck,
    title: "Real professionals",
    text: "Every review is tied to a verified account, so reputations are built on trust.",
  },
  {
    icon: Search,
    title: "Find the right people",
    text: "Browse profiles by name, headline, and company to find who you want to work with.",
  },
];

function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Users className="size-3.5" />
              The professional reputation platform
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              Great work deserves a great reputation
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              CoWorker lets you rate and review the professionals you work with —
              and build a reputation that speaks for itself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your profile
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {signedIn ? (
                <Button size="lg" variant="outline" disabled className="disabled:opacity-100">
                  <CheckCircle2 className="size-4 text-success" />
                  Signed in
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Sign in</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Profile preview card */}
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                SM
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Sarah Mayer</p>
                <p className="text-sm text-muted-foreground">
                  Senior Product Designer
                </p>
                <p className="text-sm text-muted-foreground">Northwind Studio</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={
                      star <= 4
                        ? "size-5 fill-amber-400 text-amber-400"
                        : "size-5 text-border"
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">4.0</span>
              <span className="text-sm text-muted-foreground">· 128 reviews</span>
            </div>
            <div className="mt-5 rounded-lg bg-muted p-4">
              <p className="text-sm text-foreground">
                “Sarah turned a vague brief into a product our users love.
                Communicative, fast, and genuinely caring about the details.”
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                — Verified colleague
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Reputation, built on real work
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Ready to build your professional reputation?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join CoWorker today — it takes less than a minute.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Join now
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded bg-primary">
              <Star className="size-3 fill-primary-foreground text-primary-foreground" />
            </span>
            CoWorker
          </span>
          <span className="flex items-center gap-4">
            <Link to="/guidelines" className="hover:text-foreground">Review Guidelines</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Use</Link>
            <span>© 2026 CoWorker</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
