"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthSuccessMessage, AuthSuccessBackLink } from "@/components/auth/auth-success-message";
import { authGoogleBtn } from "@/components/auth/auth-styles";
import { GoogleIcon } from "@/components/icons/oauth-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/client/dashboard";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSent(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);

    if (!email.trim()) {
      setError("Enter your email above, then try again.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/login")}`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setResetSent(true);
  }

  if (resetSent) {
    return (
      <AuthPageShell title="" subtitle="" suppressHeader>
        <AuthSuccessMessage
          title="Password reset email sent"
          message="We've sent a secure password reset link to:"
          email={email.trim()}
          onResend={handleForgotPassword}
          resendLoading={loading}
        >
          {error && <AuthAlert message={error} className="w-full max-w-sm" />}
          <AuthSuccessBackLink onClick={() => setResetSent(false)}>
            ← Back to sign in
          </AuthSuccessBackLink>
        </AuthSuccessMessage>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Continue where you left off."
    >
      <div className="space-y-6">
        {error && <AuthAlert message={error} />}

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <Input
            id="email"
            type="email"
            label="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <AuthDivider />

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={authGoogleBtn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="space-y-4 pt-1 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className={cn(
              type.small,
              "text-[var(--brand-purple)]/80 transition-colors hover:text-[var(--brand-purple)] disabled:opacity-50"
            )}
          >
            Forgot password?
          </button>

          <p className={cn(type.bodyMuted, "text-base")}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)]"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
}
