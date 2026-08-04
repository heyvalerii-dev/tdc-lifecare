"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  CalendarPlus,
  ChevronRight,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  UserCircle,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useManualBooking } from "@/components/admin/manual-booking/manual-booking-context";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { adminWideContainer } from "@/lib/admin-layout";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/clients", label: "Clients", icon: User },
  { href: "/admin/psychologists", label: "Psychologists", icon: HeartHandshake },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
] as const;

const MANUAL_BOOKING_LABEL = "New Appointment";
/** Short mobile-grid label; aria-label keeps the full desktop term. */
const MANUAL_BOOKING_MOBILE_LABEL = "Book";

const navIconClass =
  "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-[14px] bg-transparent text-white/80 transition-all duration-[190ms] ease-out hover:-translate-y-px hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

const navIconActiveClass =
  "bg-white text-[var(--brand-purple)] shadow-[0_4px_12px_rgba(0,0,0,0.14)] hover:-translate-y-0 hover:bg-white hover:text-[var(--brand-purple)]";

const avatarButtonClass =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/15 transition-all duration-[190ms] ease-out hover:-translate-y-px hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-purple)]";

const accountMenuItemClass =
  "grid min-h-12 w-full grid-cols-[20px_1fr] items-center gap-x-4 rounded-xl px-4 py-2.5 text-left font-sans text-sm font-medium text-[var(--brand-text)] outline-none transition-colors duration-200 hover:bg-[var(--brand-purple-light)]/60 focus-visible:bg-[var(--brand-purple-light)]/60";

/** Shared mobile drawer tile chrome — active only swaps fill/color. */
const mobileTileBase =
  "flex aspect-[10/9] w-full min-h-11 flex-col items-center justify-center gap-2 rounded-[1.15rem] px-2 py-3.5 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98]";

const mobilePrimaryIdle =
  "bg-white/[0.07] text-white/85 hover:bg-white/12 hover:text-white";

const mobilePrimaryActive =
  "bg-white text-[var(--brand-purple)] shadow-[0_6px_16px_rgba(0,0,0,0.14)] hover:bg-white hover:text-[var(--brand-purple)]";

/** Top-grid labels — 13px, optically centered in each tile. */
const mobileNavLabel =
  "text-center font-sans text-[13px] font-medium leading-snug tracking-[-0.01em]";

const mobileNavLabelWrap = "flex w-full min-w-0 justify-center";

const mobileAccountRow =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-sans text-sm font-medium leading-snug text-white/70 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35";

const mobileAccountRowActive = "bg-white/10 text-white hover:bg-white/10 hover:text-white";

const mobileNavIconClass = "h-8 w-8 shrink-0";

function isActive(pathname: string, href: string) {
  if (href === "/admin/calendar") {
    return (
      pathname === "/admin/calendar" ||
      pathname.startsWith("/admin/calendar/") ||
      pathname.startsWith("/admin/appointments/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIconTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function NavIconLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <NavIconTooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(navIconClass, active && navIconActiveClass)}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </Link>
    </NavIconTooltip>
  );
}

function ManualBookingIcon() {
  const { open, openNewAppointment } = useManualBooking();

  return (
    <NavIconTooltip label={MANUAL_BOOKING_LABEL}>
      <button
        type="button"
        onClick={() => openNewAppointment()}
        aria-label={MANUAL_BOOKING_LABEL}
        aria-pressed={open}
        className={cn(
          "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-[14px] transition-all duration-[190ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]",
          open
            ? navIconActiveClass
            : "bg-[#C9A84C] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:bg-[#D9B85A] hover:shadow-[0_4px_12px_rgba(0,0,0,0.16)]"
        )}
      >
        <CalendarPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>
    </NavIconTooltip>
  );
}

interface AdminHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarSrc?: string | null;
}

export function AdminHeader({
  userName,
  userEmail,
  avatarSrc,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { openNewAppointment } = useManualBooking();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountAnimateIn, setAccountAnimateIn] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAccountOpen(false);
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (!accountOpen) return;

    setAccountAnimateIn(false);
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (accountRef.current?.contains(target)) return;
      if (accountButtonRef.current?.contains(target)) return;
      setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => setAccountAnimateIn(true), 0);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  return (
    <>
    <header className="sticky top-0 z-50 bg-[var(--brand-purple)]">
      <div
        className={cn(
          adminWideContainer,
          "flex h-12 items-center justify-between gap-4 sm:h-14 lg:h-16"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-14 sm:gap-[4.5rem] lg:flex-none">
          <BrandLogo href="/admin/dashboard" variant="light" />

          <nav
            className="hidden min-w-0 shrink items-center gap-1.5 lg:flex"
            aria-label="Admin navigation"
          >
            {PRIMARY_NAV.map((item) => (
              <NavIconLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:flex sm:gap-3">
            <ManualBookingIcon />

            <div className="relative">
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Account menu"
                className={avatarButtonClass}
              >
                <Avatar
                  name={userName}
                  email={userEmail}
                  src={avatarSrc}
                  size="sm"
                  tone="solid"
                  className="h-full w-full border-0 bg-transparent text-sm text-white"
                />
              </button>

              {accountOpen && (
                <div
                  ref={accountRef}
                  role="menu"
                  aria-label="Account"
                  className={cn(
                    "absolute right-0 mt-3 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#E8E2F2] bg-white shadow-[0_14px_40px_rgba(93,80,122,0.14)]",
                    "transition duration-200 ease-out",
                    accountAnimateIn
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
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
                          {userName?.trim() || "Admin"}
                        </p>
                        {userEmail && (
                          <p className="mt-1 truncate font-sans text-sm text-[var(--brand-text-muted)]">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 pb-2 pt-2">
                    <Link
                      href="/admin/profile"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className={accountMenuItemClass}
                    >
                      <UserCircle
                        className="h-4 w-4 text-[var(--brand-text-muted)]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      My Profile
                    </Link>
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className={accountMenuItemClass}
                    >
                      <Settings
                        className="h-4 w-4 text-[var(--brand-text-muted)]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Clinic Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className={accountMenuItemClass}
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

          <button
            type="button"
            className={cn(navIconClass, "lg:hidden")}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[var(--brand-purple-dark)] px-4 py-3.5 sm:px-6 lg:hidden">
          <nav aria-label="Admin navigation" className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      mobileTileBase,
                      active ? mobilePrimaryActive : mobilePrimaryIdle
                    )}
                  >
                    <Icon
                      className={mobileNavIconClass}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className={mobileNavLabelWrap}>
                      <span className={mobileNavLabel}>{item.label}</span>
                    </span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openNewAppointment();
                }}
                aria-label={MANUAL_BOOKING_LABEL}
                className={cn(mobileTileBase, mobilePrimaryIdle)}
              >
                <CalendarPlus
                  className={mobileNavIconClass}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className={mobileNavLabelWrap}>
                  <span className={mobileNavLabel}>
                    {MANUAL_BOOKING_MOBILE_LABEL}
                  </span>
                </span>
              </button>
            </div>

            <div className="h-px bg-white/10" role="separator" aria-hidden />

            <div className="flex flex-col gap-0.5">
              <Link
                href="/admin/profile"
                onClick={() => setMobileOpen(false)}
                aria-current={
                  isActive(pathname, "/admin/profile") ? "page" : undefined
                }
                className={cn(
                  mobileAccountRow,
                  isActive(pathname, "/admin/profile") && mobileAccountRowActive
                )}
              >
                <UserCircle
                  className="h-4 w-4 shrink-0 opacity-80"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">Profile</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-white/25"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setMobileOpen(false)}
                aria-current={
                  isActive(pathname, "/admin/settings") ? "page" : undefined
                }
                className={cn(
                  mobileAccountRow,
                  isActive(pathname, "/admin/settings") &&
                    mobileAccountRowActive
                )}
              >
                <Settings
                  className="h-4 w-4 shrink-0 opacity-80"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">Settings</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-white/25"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className={mobileAccountRow}
              >
                <LogOut
                  className="h-4 w-4 shrink-0 opacity-80"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
      <PayMongoSandboxBanner />
    </>
  );
}
