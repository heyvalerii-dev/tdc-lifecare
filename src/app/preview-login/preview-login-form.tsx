"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthAlert } from "@/components/auth/auth-alert";
import { authCardClass, authPageWidth } from "@/components/auth/auth-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function PreviewLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/preview-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, redirect }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      router.replace(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white py-12 sm:py-16">
      <div className={authPageWidth}>
        <div className="flex justify-center">
          <BrandLogo href={null} variant="dark" />
        </div>

        <div className="mt-10 space-y-3 text-center sm:mt-12">
          <h1 className={type.pageTitle}>Private Preview</h1>
          <p className={cn(type.bodyMuted, "mx-auto max-w-md text-base sm:text-lg")}>
            Enter the password to continue.
          </p>
        </div>

        <div className={cn(authCardClass, "mt-8 sm:mt-10")}>
          <div className="space-y-6">
            {error && <AuthAlert message={error} />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="site-password"
                type="password"
                label="Password"
                name="password"
                required
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
                disabled={!password.trim()}
              >
                Continue
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
