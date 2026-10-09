import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";

export interface AppNotification {
  id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase.from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function open(n: AppNotification) {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.link) navigate({ href: n.link });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="link" size="sm" className="h-auto p-0" disabled={!unread} onClick={markAll}>Mark all as read</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {q.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : q.isError ? (
            <p className="p-4 text-center text-sm text-destructive">Couldn't load notifications.</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => open(n)}
              className="flex w-full gap-2 border-b px-3 py-2 text-left last:border-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                <span className="block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
