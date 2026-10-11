import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Star, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { FeaturedReviews, RecentlyReviewed, StatsStrip } from "@/components/LandingSections";
import { useFormat } from "@/lib/format";

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

function LandingPage() {
  const { t } = useTranslation("landing");
  const { number } = useFormat();
  const [signedIn, setSignedIn] = useState(false);

  const features = [
    {
      icon: Star,
      title: t("features.honest.title"),
      text: t("features.honest.text"),
    },
    {
      icon: ShieldCheck,
      title: t("features.professionals.title"),
      text: t("features.professionals.text"),
    },
    {
      icon: Search,
      title: t("features.search.title"),
      text: t("features.search.text"),
    },
  ];

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
              {t("hero.badge")}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("hero.cta.create")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {signedIn ? (
                <Button size="lg" variant="outline" disabled className="disabled:opacity-100">
                  <CheckCircle2 className="size-4 text-success" />
                  {t("hero.cta.signedIn")}
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">{t("hero.cta.signIn")}</Link>
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
              <span className="text-sm font-semibold text-foreground">{number(4.0, { minimumFractionDigits: 1 })}</span>
              <span className="text-sm text-muted-foreground">· {t("preview.reviews", { count: 128 })}</span>
            </div>
            <div className="mt-5 rounded-lg bg-muted p-4">
              <p className="text-sm text-foreground">
                “Sarah turned a vague brief into a product our users love.
                Communicative, fast, and genuinely caring about the details.”
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                — {t("preview.verifiedColleague")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <StatsStrip />
      <RecentlyReviewed />
      <FeaturedReviews />

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t("features.sectionTitle")}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
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
            {t("ctaSection.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("ctaSection.subtitle")}
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              {t("ctaSection.button")}
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
            <Link to="/guidelines" className="hover:text-foreground">{t("footer.reviewGuidelines")}</Link>
            <Link to="/terms" className="hover:text-foreground">{t("footer.termsOfUse")}</Link>
            <span>{t("footer.copyright", { year: 2026 })}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
