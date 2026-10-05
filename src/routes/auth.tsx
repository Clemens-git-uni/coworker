import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or join — CoWorker" },
      {
        name: "description",
        content:
          "Sign in to CoWorker or create your free professional profile.",
      },
      { property: "og:title", content: "Sign in or join — CoWorker" },
      {
        property: "og:description",
        content:
          "Sign in to CoWorker or create your free professional profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const navigate = useNavigate();

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session === null) {
          setConfirmationSent(true);
        } else {
          navigate({ to: "/" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        {confirmationSent ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="size-6 text-primary" />
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We sent a confirmation link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Click it to activate your CoWorker account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setConfirmationSent(false);
                  setIsSignup(false);
                }}
              >
                Back to sign in
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md bg-primary">
                <Star className="size-5 fill-primary-foreground text-primary-foreground" />
              </div>
              <CardTitle>
                {isSignup ? "Create your CoWorker profile" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {isSignup
                  ? "Join CoWorker to build your professional reputation."
                  : "Sign in to your CoWorker account."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {isSignup ? "Join CoWorker" : "Sign in"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {isSignup ? "Already have an account?" : "New to CoWorker?"}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setIsSignup(!isSignup)}
                >
                  {isSignup ? "Sign in" : "Join now"}
                </button>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
