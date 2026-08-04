"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CalendarPlus, LogOut, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ClientHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarSrc?: string | null;
}

export function ClientHeader({ userName, userEmail, avatarSrc }: ClientHeaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const clinicContactUrl = "https://www.facebook.com/tdclifecare";

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (!open) {
      setAnimateIn(false);
      return;
    }
    const id = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  function onMenuKeyDown(event: React.KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []
    );
    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        currentIndex < 0
          ? items.length - 1
          : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--brand-border)] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-8">
          <BrandLogo href="/" variant="dark" />

          <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/book"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-border)] text-[var(--brand-purple)] transition-colors hover:border-[var(--brand-purple)]/25 hover:bg-[var(--brand-purple-light)]/50"
            aria-label="Book appointment"
          >
            <CalendarPlus className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/80 transition-all duration-200 hover:scale-[1.03] hover:border-[var(--brand-purple)]/22 hover:bg-[var(--brand-purple-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Account menu"
              title="Account"
              onClick={() => setOpen((v) => !v)}
            >
              <Avatar
                name={userName}
                email={userEmail}
                src={avatarSrc}
                size="sm"
                className="h-full w-full border-0"
              />
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                aria-label="Account"
                onKeyDown={onMenuKeyDown}
                className={cn(
                  "absolute right-0 mt-3 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#E8E2F2] bg-white shadow-[0_14px_40px_rgba(93,80,122,0.14)]",
                  "transition duration-200 ease-out will-change-transform",
                  animateIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                )}
              >
                <div className="rounded-t-2xl bg-[#F2EBFD] px-4 py-3.5">
                  <div className="grid grid-cols-[48px_1fr] items-center gap-x-4">
                    <Avatar
                      name={userName}
                      email={userEmail}
                      src={avatarSrc}
                      size="lg"
                      tone="solid"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-sans text-lg font-semibold text-[var(--brand-text)]">
                        {userName?.trim() || "Account"}
                      </p>
                      {userEmail && (
                        <p className="mt-1.5 truncate font-sans text-sm text-[var(--brand-text-muted)]">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-2 pb-2 pt-2">
                  <Link
                    ref={firstItemRef as React.RefObject<HTMLAnchorElement>}
                    href="/client/dashboard"
                    role="menuitem"
                    data-menu-item
                    onClick={() => setOpen(false)}
                    className="grid min-h-12 grid-cols-[20px_1fr] items-center gap-x-4 rounded-xl px-4 py-2.5 font-sans text-sm font-medium text-[var(--brand-text)] outline-none transition-colors duration-200 hover:bg-[var(--brand-purple-light)]/60 focus-visible:bg-[var(--brand-purple-light)]/60"
                  >
                    <Calendar
                      className="h-4 w-4 text-[var(--brand-purple)]/70"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    My Appointments
                  </Link>
                  <Link
                    href="/book"
                    role="menuitem"
                    data-menu-item
                    onClick={() => setOpen(false)}
                    className="grid min-h-12 grid-cols-[20px_1fr] items-center gap-x-4 rounded-xl px-4 py-2.5 font-sans text-sm font-medium text-[var(--brand-text)] outline-none transition-colors duration-200 hover:bg-[var(--brand-purple-light)]/60 focus-visible:bg-[var(--brand-purple-light)]/60"
                  >
                    <CalendarPlus
                      className="h-4 w-4 text-[var(--brand-purple)]/70"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Book Appointment
                  </Link>
                  <a
                    href={clinicContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    data-menu-item
                    onClick={() => setOpen(false)}
                    className="grid min-h-12 grid-cols-[20px_1fr] items-center gap-x-4 rounded-xl px-4 py-2.5 font-sans text-sm font-medium text-[var(--brand-text)] outline-none transition-colors duration-200 hover:bg-[var(--brand-purple-light)]/60 focus-visible:bg-[var(--brand-purple-light)]/60"
                  >
                    <MessageCircle
                      className="h-4 w-4 text-[var(--brand-purple)]/70"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Contact Clinic
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    data-menu-item
                    onClick={handleSignOut}
                    className="grid min-h-12 w-full grid-cols-[20px_1fr] items-center gap-x-4 rounded-xl px-4 py-2.5 text-left font-sans text-sm font-medium text-[var(--brand-text)] outline-none transition-colors duration-200 hover:bg-[var(--brand-purple-light)]/60 focus-visible:bg-[var(--brand-purple-light)]/60"
                  >
                    <LogOut
                      className="h-4 w-4 text-[var(--brand-text-muted)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
      <PayMongoSandboxBanner />
    </>
  );
}
