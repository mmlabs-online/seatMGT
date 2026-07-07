"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Icon, Button, FilledInput } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Couldn't sign in with those credentials.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-10 bg-background">
      <div className="blob w-96 h-96 -top-10 -left-10" style={{ background: "var(--accent-orange)", opacity: 0.07 }} aria-hidden />
      <div className="blob w-96 h-96 bottom-0 right-0" style={{ background: "var(--accent-orange)", opacity: 0.05 }} aria-hidden />

      <div className="relative w-full max-w-[440px] bg-surface border border-outline-variant rounded-md3-xl p-8 shadow-[var(--card-shadow-hover)]">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-md3 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(251,87,41,0.3)]"
            style={{ background: "var(--accent-orange)" }}
          >
            <Icon name="grid_view" filled size={24} />
          </div>
          <div>
            <div className="font-heading text-[20px] font-extrabold tracking-[-0.01em] text-on-surface leading-tight">SeatMap</div>
            <div className="text-xs font-semibold text-on-surface-variant">Sign in to continue</div>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <FilledInput
            icon="mail"
            type="email"
            name="email"
            placeholder="Email"
            aria-label="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FilledInput
            icon="lock"
            type="password"
            name="password"
            placeholder="Password"
            aria-label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-status-alert bg-error-container/40 border border-error/30 rounded-md3-sm px-3 py-2.5">
              <Icon name="error" size={16} />
              {error}
            </div>
          )}

          <Button type="submit" icon="arrow_forward" disabled={pending} fullWidth className="mt-1.5">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
