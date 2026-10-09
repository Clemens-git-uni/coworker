import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn } from "@/lib/utils";

export function BookmarkButton({ profileId, name, withLabel = false, className }: {
  profileId: string; name?: string; withLabel?: boolean; className?: string;
}) {
  const { user, ids, toggle } = useBookmarks();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const saved = ids.has(profileId);
  if (user && user.id === profileId) return null;

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Sign in to save professionals");
      navigate({ to: "/auth", search: { redirect: href } });
      return;
    }
    toggle.mutate({ profileId, saved });
  }

  const label = saved ? `Remove ${name ?? "profile"} from Saved` : `Save ${name ?? "profile"}`;
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "default" : "icon"}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(!withLabel && "size-8 shrink-0", className)}
    >
      <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
      {withLabel && (saved ? "Saved" : "Save")}
    </Button>
  );
}
