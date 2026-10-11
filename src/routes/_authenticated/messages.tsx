import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation, Trans } from "react-i18next";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/components/ProfileCard";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: zodValidator(z.object({ c: fallback(z.string().uuid().optional(), undefined) })),
  head: () => ({
    meta: [
      { title: "Messages — CoWorker" },
      { name: "description", content: "Private conversations with professionals on CoWorker." },
      { property: "og:title", content: "Messages — CoWorker" },
      { property: "og:description", content: "Private messaging on CoWorker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

interface Person { id: string; full_name: string; avatar_url: string | null }
interface ConversationSummary {
  id: string; last_message_at: string; other: Person | null;
  last: { body: string; sender_id: string; created_at: string } | null; unread: number;
}
interface Message { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }

function MessagesPage() {
  const { t } = useTranslation("messages");
  const format = useFormat();
  const { user } = Route.useRouteContext();
  const { c } = Route.useSearch();
  const me = user.id;

  const convQ = useQuery({
    queryKey: ["conversations", me],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data, error } = await supabase.from("conversations")
        .select("id, last_message_at, participants:conversation_participants(user:profiles(id, full_name, avatar_url))")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const ids = data.map((d) => d.id);
      const { data: msgs, error: e2 } = ids.length
        ? await supabase.from("messages").select("conversation_id, body, sender_id, created_at, read_at")
            .in("conversation_id", ids).order("created_at", { ascending: false }).limit(500)
        : { data: [], error: null };
      if (e2) throw e2;
      return data.map((d) => {
        const mine = (msgs ?? []).filter((m) => m.conversation_id === d.id);
        const other = d.participants.map((p) => p.user).find((u) => u && u.id !== me) ?? null;
        return {
          id: d.id, last_message_at: d.last_message_at, other,
          last: mine[0] ?? null,
          unread: mine.filter((m) => m.sender_id !== me && !m.read_at).length,
        };
      });
    },
  });

  const convs = convQ.data ?? [];
  const active = convs.find((x) => x.id === c);

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-4 sm:py-6">
      <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden border-y bg-card sm:h-[calc(100dvh-6.5rem)] sm:rounded-xl sm:border">
        <aside className={cn("w-full flex-col border-r md:flex md:w-80", c ? "hidden" : "flex")}>
          <h1 className="border-b px-4 py-3 text-lg font-bold">{t("conversations_title")}</h1>
          <div className="flex-1 overflow-y-auto">
            {convQ.isLoading ? (
              <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : convQ.isError ? (
              <p className="p-6 text-center text-sm text-destructive">{t("conversations_error")}</p>
            ) : convs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 size-8 text-primary" /><Trans t={t} i18nKey="no_conversations">No conversations yet. Open a profile and press <span className="font-semibold">Message</span> to start one.</Trans></div>
            ) : convs.map((cv) => (
              <Link key={cv.id} to="/messages" search={{ c: cv.id }}
                className={cn("flex items-center gap-3 border-b px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none", cv.id === c && "bg-accent")}>
                <Avatar className="size-10">
                  <AvatarImage src={cv.other?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials(cv.other?.full_name ?? "")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn("truncate text-sm", cv.unread ? "font-bold" : "font-semibold")}>{cv.other?.full_name || t("member")}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{format.relative(cv.last?.created_at ?? cv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {cv.last ? `${cv.last.sender_id === me ? t("you") : ""}${cv.last.body}` : t("no_messages")}
                    </p>
                    {cv.unread > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground" aria-label={t("unread", { count: cv.unread })}>{cv.unread}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
        <section className={cn("min-w-0 flex-1 flex-col md:flex", c ? "flex" : "hidden")}>
          {c ? (
            <Thread key={c} conversationId={c} me={me} other={active?.other ?? null} loadingMeta={convQ.isLoading} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("select_conversation")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thread({ conversationId, me, other, loadingMeta }: { conversationId: string; me: string; other: Person | null; loadingMeta: boolean }) {
  const { t } = useTranslation("messages");
  const format = useFormat();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const key = ["messages", conversationId];

  const q = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase.from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_at")
        .eq("conversation_id", conversationId).order("created_at").limit(500);
      if (error) throw error;
      return data;
    },
  });

  async function markRead() {
    await supabase.rpc("mark_conversation_read", { _conv: conversationId });
    qc.invalidateQueries({ queryKey: ["unread-messages"] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  useEffect(() => {
    markRead();
    const channel = supabase.channel(`thread-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message;
        qc.setQueryData<Message[]>(key, (old = []) => old.some((x) => x.id === m.id) ? old : [...old, m]);
        if (m.sender_id !== me) markRead();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [q.data?.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender_id: me, body })
      .select("id, conversation_id, sender_id, body, created_at, read_at").single();
    setSending(false);
    if (error) { toast.error(error.message.includes("characters") ? error.message : t("error_toast")); return; }
    setText("");
    qc.setQueryData<Message[]>(key, (old = []) => old.some((x) => x.id === data.id) ? old : [...old, data]);
    qc.invalidateQueries({ queryKey: ["conversations"] });
    toast.success(t("sent_toast"), { duration: 2000 });
  }

  const msgs = q.data ?? [];
  return (
    <>
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("back_to_conversations")} onClick={() => navigate({ to: "/messages", search: {} })}>
          <ArrowLeft className="size-4" />
        </Button>
        {loadingMeta ? <Skeleton className="h-8 w-40" /> : other ? (
          <Link to="/profile/$id" params={{ id: other.id }} className="flex items-center gap-2 hover:underline">
            <Avatar className="size-8">
              <AvatarImage src={other.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(other.full_name)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{other.full_name || t("member")}</span>
          </Link>
        ) : <span className="text-sm text-muted-foreground">{t("conversation_header")}</span>}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-background/60 p-4" aria-live="polite">
        {q.isLoading ? (
          <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /></div>
        ) : q.isError ? (
          <p className="text-center text-sm text-destructive">{t("messages_error")}</p>
        ) : msgs.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">{t("say_hello")}</p>
        ) : msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card text-card-foreground")}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
                  new Intl.DateTimeFormat(format.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(m.created_at)){mine && m.read_at ? " · Seen" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t("write_placeholder")}
          aria-label={t("message_aria")}
          maxLength={2000}
          rows={1}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sending} aria-label={t("send_aria")}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </>
  );
}
