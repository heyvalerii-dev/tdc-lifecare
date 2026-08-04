"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

interface NavItem {
  href: string;
  label: string;
}

interface HeaderProps {
  navItems: NavItem[];
  userName?: string;
}

export function Header({ navItems, userName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <BrandLogo href={navItems[0]?.href ?? "/"} variant="dark" />

        <nav className="hidden min-w-0 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                type.nav,
                "rounded-lg px-3 py-2 transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-white/80 text-[var(--brand-purple)]"
                  : "text-[var(--brand-text-muted)] hover:bg-white/60 hover:text-[var(--brand-purple-dark)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {userName && (
            <span className={type.smallMuted}>{userName}</span>
          )}
          <button
            onClick={handleSignOut}
            className={cn(type.nav, "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[var(--brand-text-muted)] hover:bg-white/60 hover:text-[var(--brand-purple-dark)]")}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <button
          className="rounded-lg p-2 text-[var(--brand-text-muted)] hover:bg-white/60 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--brand-purple)]/10 bg-[var(--brand-purple-light)] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname === item.href
                    ? "bg-white/80 text-[var(--brand-purple)]"
                    : "text-[var(--brand-text-muted)]"
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className={cn(type.nav, "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[var(--brand-text-muted)]")}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
      <PayMongoSandboxBanner />
    </>
  );
}
