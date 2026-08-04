"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import {
  detailCardBodyClass,
  detailCardClass,
  detailLabelClass,
  detailMutedClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Avatar } from "@/components/ui/avatar";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import {
  ImageOptimizeError,
  OPTIMIZE_IMAGE_ACCEPT,
  optimizeAvatarImage,
} from "@/lib/images";
import { cn } from "@/lib/utils";

export interface AdminProfileFormProps {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
}

export function AdminProfileForm({ profile }: AdminProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const initialName = profile.full_name?.trim() || "";
  const [displayName, setDisplayName] = useState(initialName);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = displayName.trim() !== initialName;
  const canSave = dirty && displayName.trim().length > 0 && !saving;
  const hasPhoto = Boolean(avatarSrc);

  useEffect(() => {
    setDisplayName(profile.full_name?.trim() || "");
    setAvatarSrc(profile.avatar_url);
  }, [profile.full_name, profile.avatar_url]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function clearPreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function handleCancel() {
    setDisplayName(initialName);
    setError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: displayName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't save profile"
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(file: File) {
    if (uploading) return;
    setPhotoError(null);
    setUploadSuccess(false);
    setUploading(true);

    try {
      const optimized = await optimizeAvatarImage(file);
      clearPreviewUrl();
      const objectUrl = URL.createObjectURL(optimized);
      previewUrlRef.current = objectUrl;
      setAvatarSrc(objectUrl);

      const formData = new FormData();
      formData.append("file", optimized);

      const res = await fetch("/api/admin/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed"
        );
      }

      if (typeof data.avatar_url === "string") {
        clearPreviewUrl();
        setAvatarSrc(data.avatar_url);
      }

      setUploadSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setUploadSuccess(false), 1400);
      router.refresh();
    } catch (err) {
      clearPreviewUrl();
      setAvatarSrc(profile.avatar_url);
      if (err instanceof ImageOptimizeError) {
        setPhotoError(err.message);
      } else {
        setPhotoError(
          err instanceof Error ? err.message : "Couldn't update photo"
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className={detailCardClass}>
        <div
          className={cn(
            detailCardBodyClass,
            "grid gap-8 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-10"
          )}
        >
          {/* Left: photo management */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!uploading) setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handlePhotoChange(file);
              }}
              aria-label="Upload photo"
              aria-busy={uploading}
              className={cn(
                "group relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center outline-none transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2",
                dragOver
                  ? "border-[var(--brand-purple)]/45 bg-[var(--brand-purple-light)]/40"
                  : "border-[var(--brand-purple)]/20 bg-[var(--brand-purple-light)]/15 hover:border-[var(--brand-purple)]/35 hover:bg-[var(--brand-purple-light)]/30",
                uploading && "cursor-wait opacity-80"
              )}
            >
              <div className="relative">
                {hasPhoto ? (
                  <Avatar
                    name={displayName || profile.email}
                    email={profile.email}
                    src={avatarSrc}
                    size="xl"
                  />
                ) : (
                  <span className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full bg-white text-[var(--brand-purple)]/55 ring-1 ring-[var(--brand-purple)]/10">
                    <ImagePlus className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                  </span>
                )}

                {(uploading || uploadSuccess) && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--brand-text)]/40 text-white backdrop-blur-[1px]">
                    {uploading ? (
                      <Loader2
                        className="h-6 w-6 animate-spin"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <Check className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-medium text-[var(--brand-text)]">
                  Upload Photo
                </p>
                <p className={cn(detailMutedClass, "text-[12px] leading-relaxed")}>
                  JPG or PNG
                  <br />
                  Maximum 5 MB
                </p>
              </div>
            </button>

            {photoError ? (
              <p className="text-sm leading-snug text-[#8C5C68]">{photoError}</p>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept={OPTIMIZE_IMAGE_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePhotoChange(file);
              }}
            />
          </div>

          {/* Right: account information */}
          <div className="min-w-0 space-y-6 sm:pt-1">
            <label className="block space-y-1.5">
              <span className={detailLabelClass}>Display Name *</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                disabled={saving}
                autoComplete="name"
                placeholder="Your name"
                className={cn(adminControlInputClass, "w-full px-3")}
              />
            </label>

            <div className="space-y-1.5">
              <span className={detailLabelClass}>Email</span>
              <p className={cn(detailValueClass, "text-[15px]")}>
                {profile.email}
              </p>
              <p className={cn(detailMutedClass, "text-[13px] leading-relaxed")}>
                This email is managed through your login provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {dirty ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {error ? (
            <p
              role="alert"
              className="min-w-0 flex-1 text-sm text-[#8C5C68] sm:mr-auto"
            >
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className={cn(adminSecondaryButtonClass, "w-full sm:w-auto")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className={cn(
              adminPrimaryButtonClass,
              "w-full sm:w-auto",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--brand-purple)]"
            )}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-[#8C5C68]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
