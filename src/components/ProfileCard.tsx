import { Link } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { BookmarkButton } from "@/components/BookmarkButton";
import { AttributePills, LanguageBadges, StatusBadge } from "@/components/ProfileBadges";
import type { ProfileAttribute, ProfileLanguage } from "@/lib/profile-meta";

export interface ProfileSummary {
  id: string; full_name: string; headline: string; company: string; location: string;
  avatar_url: string | null; avg_rating: number | string; review_count: number | string;
  status?: string; status_return_date?: string | null;
  languages?: unknown; top_attributes?: unknown;
}

export function initials(name: string) {
  return (name.trim() || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ProfileCard({ p, action, snippet, onOpen, linkSearch }: {
  p: ProfileSummary; action?: React.ReactNode; snippet?: string | null;
  onOpen?: () => void; linkSearch?: { nav?: boolean };
}) {
  const count = Number(p.review_count);
  const langs = (Array.isArray(p.languages) ? p.languages : []) as ProfileLanguage[];
  const attrs = (Array.isArray(p.top_attributes) ? p.top_attributes : []) as ProfileAttribute[];
  return (
    <Card className="relative h-full transition-shadow hover:shadow-md">
      <CardContent className="flex gap-4 pt-6">
        <Avatar className="size-14">
          <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(p.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <Link to="/profile/$id" params={{ id: p.id }} search={linkSearch ?? {}} onClick={onOpen}
            className="block truncate font-semibold after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {p.full_name || "Unnamed professional"}
          </Link>
          {p.status && <StatusBadge status={p.status} returnDate={p.status_return_date} />}
          {p.headline && <p className="line-clamp-2 text-sm text-foreground/80">{p.headline}</p>}
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {p.company && <span className="flex items-center gap-1"><Building2 className="size-3" />{p.company}</span>}
            {p.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{p.location}</span>}
          </div>
          <div className="flex items-center gap-2 pt-1 text-sm">
            <StarRating value={Number(p.avg_rating)} />
            <span className="font-semibold">{count ? Number(p.avg_rating).toFixed(1) : "–"}</span>
            <span className="text-muted-foreground">({count} {count === 1 ? "review" : "reviews"})</span>
          </div>
          {snippet && <p className="line-clamp-2 pt-1 text-sm italic text-muted-foreground">“{snippet}”</p>}
          <LanguageBadges languages={langs} max={3} className="pt-1" />
          <AttributePills attributes={attrs} className="pt-1" />
        </div>
        <div className="relative z-10 flex flex-col items-end gap-1">
          {action ?? <BookmarkButton profileId={p.id} name={p.full_name} />}
        </div>
      </CardContent>
    </Card>
  );
}
