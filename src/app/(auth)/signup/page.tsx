"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && phone) {
      await supabase.from("profiles").update({ phone, full_name: fullName }).eq("id", data.user.id);
    }

    if (data.session) {
      router.push("/client/dashboard");
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  if (success) {
    return (
      <AuthPageShell title="" subtitle="" suppressHeader>
        <AuthSuccessMessage
          title="Confirm your email"
          message="We've sent a secure confirmation link to:"
          email={email.trim()}
          onResend={handleResendConfirmation}
          resendLoading={loading}
        >
          {error && <AuthAlert message={error} />}
          <AuthSuccessBackLink href="/login">← Back to sign in</AuthSuccessBackLink>
        </AuthSuccessMessage>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="We'll securely save your appointments, receipts, and intake forms."
    >
      <div className="space-y-6">
        {error && <AuthAlert message={error} />}

        <form onSubmit={handleSignup} className="space-y-5">
          <Input
            id="fullName"
            label="Full name"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            id="phone"
            type="tel"
            label="Phone (optional)"
            placeholder="+63 912 345 6789"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <AuthDivider />

        <Button
          variant="outline"
          onClick={handleGoogleSignup}
          disabled={loading}
          className={authGoogleBtn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className={cn(type.bodyMuted, "pt-1 text-center text-base")}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
