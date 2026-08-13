"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  adminControlInputClass,
  adminIconButtonClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import {
  staffDisplayName,
  type StaffProfile,
} from "@/lib/admin-staff";
import { cn } from "@/lib/utils";

interface StaffAccessSectionProps {
  currentUserId: string;
  administrators: StaffProfile[];
}

type PendingAction =
  | { type: "promote"; user: StaffProfile }
  | { type: "demote"; user: StaffProfile }
  | null;

export function StaffAccessSection({
  currentUserId,
  administrators,
}: StaffAccessSectionProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StaffProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function resetSearch() {
    setQuery("");
    setResults([]);
    setSearchError(null);
    setSearching(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/admin/staff/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const data = (await res.json().catch(() => ({}))) as {
          users?: StaffProfile[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Couldn't search users.");
        }
        setResults(data.users ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(
          err instanceof Error ? err.message : "Couldn't search users."
        );
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [drawerOpen, query]);

  async function submitRoleChange(user: StaffProfile, role: "admin" | "client") {
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/staff/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't update admin access.");
      }
      setPending(null);
      if (role === "admin") {
        setDrawerOpen(false);
        resetSearch();
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Couldn't update admin access."
      );
    } finally {
      setSaving(false);
    }
  }

  const confirmOpen = pending !== null;
  const confirmTitle =
    pending?.type === "promote" ? "Give admin access?" : "Remove admin access?";
  const confirmDescription =
    pending?.type === "promote"
      ? "This will allow this user to access the clinic administration area."
      : "This user will no longer be able to access the clinic administration area.";

  return (
    <>
      <section id="staff-access" className={detailCardClass}>
        <div className={detailCardHeaderClass}>
          <div className="space-y-1">
            <h2 className={detailSectionTitleClass}>Staff & Access</h2>
            <p className={cn(detailMutedClass, "text-[13px] leading-relaxed")}>
              Manage who can access the clinic administration area.
            </p>
          </div>
        </div>

        <div className={cn(detailCardBodyClass, "space-y-5")}>
          <h3 className="font-sans text-sm font-semibold text-[var(--brand-text)]">
            Administrators
          </h3>

          {administrators.length === 0 ? (
            <p className={detailMutedClass}>No administrators yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--brand-purple)]/[0.08]">
              {administrators.map((admin) => (
                <AdministratorRow
                  key={admin.id}
                  admin={admin}
                  isSelf={admin.id === currentUserId}
                  onRemove={() => {
                    setActionError(null);
                    setPending({ type: "demote", user: admin });
                  }}
                />
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              resetSearch();
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-purple)] transition-colors hover:text-[var(--brand-purple-dark)]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Add administrator
          </button>
        </div>
      </section>

      <AppDrawer
        open={drawerOpen}
        onClose={() => {
          if (saving) return;
          setDrawerOpen(false);
          resetSearch();
        }}
        title="Add Administrator"
        subtitle="Give an existing clinic user access to the administration area."
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                resetSearch();
              }}
              disabled={saving}
              className={adminSecondaryButtonClass}
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-muted)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                if (next.trim().length < 2) {
                  setResults([]);
                  setSearchError(null);
                  setSearching(false);
                }
              }}
              placeholder="Search by name or email..."
              aria-label="Search by name or email"
              autoFocus
              className={cn(adminControlInputClass, "h-11 w-full pl-9 pr-3")}
            />
          </label>

          {query.trim().length > 0 && query.trim().length < 2 ? (
            <p className={detailMutedClass}>Enter at least 2 characters to search.</p>
          ) : null}

          {searching ? (
            <p className={detailMutedClass}>Searching…</p>
          ) : null}

          {searchError ? (
            <p className="text-sm text-red-600">{searchError}</p>
          ) : null}

          {!searching &&
          !searchError &&
          query.trim().length >= 2 &&
          results.length === 0 ? (
            <p className={detailMutedClass}>
              No matching users. They need an existing account first.
            </p>
          ) : null}

          <ul className="divide-y divide-[var(--brand-purple)]/[0.08]">
            {results.map((user) => {
              const name = staffDisplayName(user);
              return (
                <li
                  key={user.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar name={name} email={user.email} src={user.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-medium text-[var(--brand-text)]">
                      {name}
                    </p>
                    <p className="truncate font-sans text-sm text-[var(--brand-text-muted)]">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setPending({ type: "promote", user });
                    }}
                    className={cn(adminPrimaryButtonClass, "shrink-0")}
                  >
                    Make Admin
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </AppDrawer>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setPending(null);
            setActionError(null);
          }
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={pending?.type === "promote" ? "Make Admin" : "Remove Access"}
        variant={pending?.type === "demote" ? "destructive" : "default"}
        loading={saving}
        onConfirm={async () => {
          if (!pending) return;
          await submitRoleChange(
            pending.user,
            pending.type === "promote" ? "admin" : "client"
          );
        }}
      >
        {actionError ? (
          <p className="text-sm text-red-600">{actionError}</p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

function AdministratorRow({
  admin,
  isSelf,
  onRemove,
}: {
  admin: StaffProfile;
  isSelf: boolean;
  onRemove: () => void;
}) {
  const name = staffDisplayName(admin);

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar name={name} email={admin.email} src={admin.avatar_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-[var(--brand-text)]">
          {name}
        </p>
        <p className="truncate font-sans text-sm text-[var(--brand-text-muted)]">
          {admin.email}
        </p>
        <p className="mt-0.5 font-sans text-xs font-medium text-[var(--brand-purple)]">
          Admin
        </p>
        {isSelf ? (
          <p className="mt-1 font-sans text-xs text-[var(--brand-text-muted)]">
            You can&apos;t remove your own admin access.
          </p>
        ) : null}
      </div>

      <Menu>
        <MenuButton
          aria-label={`Actions for ${name}`}
          disabled={isSelf}
          title={isSelf ? "You can't remove your own admin access." : undefined}
          className={adminIconButtonClass}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="z-[80] min-w-[14rem] rounded-xl border border-[#E8E2F2] bg-white p-1.5 shadow-[0_14px_40px_rgba(93,80,122,0.14)]"
        >
          <MenuItem>
            <button
              type="button"
              onClick={onRemove}
              className="flex w-full rounded-lg px-3 py-2 text-left font-sans text-sm font-medium text-[var(--brand-text)] data-[focus]:bg-[var(--brand-purple-light)]/60"
            >
              Remove admin access
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </li>
  );
}
