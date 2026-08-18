"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthSuccessMessage, AuthSuccessBackLink } from "@/components/auth/auth-success-message";
import { Mail } from "lucide-react";
import { FacebookIcon, GoogleIcon } from "@/components/icons/oauth-icons";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const authBtn = "h-auto w-full justify-center gap-3 py-3.5";

/** Set to true when Facebook OAuth is configured in Supabase Auth. */
const FACEBOOK_SIGN_IN_ENABLED = false;

interface BookingAuthStepProps {
  onAuthenticated: () => void;
}

export function BookingAuthStep({ onAuthenticated }: BookingAuthStepProps) {
  const supabase = createClient();
  const redirectPath = "/book?resume=1";

  const [mode, setMode] = useState<"options" | "email-signin" | "email-signup">("options");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleFacebook() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    onAuthenticated();
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      onAuthenticated();
    } else {
      setSignupSuccess(true);
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  if (signupSuccess) {
    return (
      <AuthSuccessMessage
        title="Confirm your email"
        message="We've sent a secure confirmation link to:"
        email={email.trim()}
        onResend={handleResendConfirmation}
        resendLoading={loading}
      >
        {error && <AuthAlert message={error} />}
        <AuthSuccessBackLink
          onClick={() => {
            setSignupSuccess(false);
            setMode("email-signin");
          }}
        >
          ← Back to sign in
        </AuthSuccessBackLink>
      </AuthSuccessMessage>
    );
  }

  return (
    <div className="space-y-6">
      {error && <AuthAlert message={error} />}

      {mode === "options" && (
        <div className="space-y-3">
          <Button
            onClick={handleGoogle}
            disabled={loading}
            variant="outline"
            className={authBtn}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          {FACEBOOK_SIGN_IN_ENABLED && (
            <Button
              onClick={handleFacebook}
              disabled={loading}
              variant="outline"
              className={authBtn}
            >
              <FacebookIcon />
              Continue with Facebook
            </Button>
          )}
          <Button
            onClick={() => setMode("email-signin")}
            disabled={loading}
            className={authBtn}
          >
            <Mail className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            Continue with Email
          </Button>
        </div>
      )}

      {mode === "email-signin" && (
        <form onSubmit={handleEmailSignIn} className="space-y-5">
          <Input
            id="auth-email"
            type="email"
            label="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="auth-password"
            type="password"
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className={cn(authBtn, "sm:max-w-none")}>
            Sign in
          </Button>
          <p className={type.bodyMuted}>
            New here?{" "}
            <button
              type="button"
              onClick={() => setMode("email-signup")}
              className="font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)]"
            >
              Create an account
            </button>
          </p>
          <Button type="button" variant="ghost" onClick={() => setMode("options")} className="px-0 text-[var(--brand-purple)] hover:bg-transparent hover:text-[var(--brand-purple-dark)]">
            ← Back to sign-in options
          </Button>
        </form>
      )}

      {mode === "email-signup" && (
        <form onSubmit={handleEmailSignup} className="space-y-5">
          <Input
            id="signup-name"
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            id="signup-email"
            type="email"
            label="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="signup-password"
            type="password"
            label="Password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className={cn(authBtn, "sm:max-w-none")}>
            Create account
          </Button>
          <p className={type.bodyMuted}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("email-signin")}
              className="font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)]"
            >
              Sign in
            </button>
          </p>
          <Button type="button" variant="ghost" onClick={() => setMode("options")} className="px-0 text-[var(--brand-purple)] hover:bg-transparent hover:text-[var(--brand-purple-dark)]">
            ← Back to sign-in options
          </Button>
        </form>
      )}

      <p className={type.smallMuted}>
        By continuing, you agree to our clinic policies.{" "}
        <Link href="/" className="text-[var(--brand-purple)] hover:underline">
          Learn more
        </Link>
      </p>
    </div>
  );
}
