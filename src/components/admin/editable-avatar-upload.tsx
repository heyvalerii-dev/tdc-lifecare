"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2 } from "lucide-react";
import { Avatar, type AvatarSize } from "@/components/ui/avatar";
import {
  ImageOptimizeError,
  OPTIMIZE_IMAGE_ACCEPT,
  optimizeAvatarImage,
} from "@/lib/images";
import { cn } from "@/lib/utils";

interface EditableAvatarUploadProps {
  /** POST endpoint that accepts FormData with `file`. */
  uploadUrl: string;
  name: string;
  src?: string | null;
  size?: AvatarSize;
  disabled?: boolean;
  className?: string;
  /** Extra classes applied to the avatar face (e.g. responsive size overrides). */
  avatarClassName?: string;
}

type UploadPhase = "idle" | "working" | "success";

export function EditableAvatarUpload({
  uploadUrl,
  name,
  src,
  size = "xl",
  disabled,
  className,
  avatarClassName,
}: EditableAvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displaySrc = previewSrc ?? src;
  const busy = phase === "working";

  function clearPreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  useEffect(() => {
    clearPreviewUrl();
    setPreviewSrc(null);
  }, [src]);

  useEffect(() => {
    return () => {
      clearPreviewUrl();
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled || busy) return;

      setError(null);
      setPhase("working");

      try {
        const optimized = await optimizeAvatarImage(file);

        clearPreviewUrl();
        const objectUrl = URL.createObjectURL(optimized);
        previewUrlRef.current = objectUrl;
        setPreviewSrc(objectUrl);

        const formData = new FormData();
        formData.append("file", optimized);

        const res = await fetch(uploadUrl, { method: "POST", body: formData });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed. Please try again.");
        }

        setPhase("success");
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setPhase("idle"), 1400);
        router.refresh();
      } catch (err) {
        clearPreviewUrl();
        setPreviewSrc(null);
        setPhase("idle");
        if (err instanceof ImageOptimizeError) {
          setError(err.message);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again."
          );
        }
      }
    },
    [busy, disabled, router, uploadUrl]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const showOverlay = dragOver || phase !== "idle";

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center gap-1.5",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        aria-label="Change photo"
        aria-busy={busy}
        className={cn(
          "group relative rounded-full outline-none",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/30 focus-visible:ring-offset-2",
          !disabled && !busy && "cursor-pointer hover:scale-[1.02]",
          dragOver &&
            "scale-[1.02] ring-2 ring-[var(--brand-purple)]/35 ring-offset-2"
        )}
      >
        <Avatar
          name={name}
          src={displaySrc}
          size={size}
          className={avatarClassName}
        />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            "bg-[var(--brand-text)]/40 text-white backdrop-blur-[1px]",
            "transition-opacity duration-200 ease-out",
            showOverlay
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          {phase === "working" ? (
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
          ) : phase === "success" ? (
            <Check className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          ) : (
            <Camera className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={OPTIMIZE_IMAGE_ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
        tabIndex={-1}
        disabled={disabled || busy}
      />
      {error && (
        <p className="max-w-[10rem] text-center text-[11px] leading-snug text-[#8C5C68]">
          {error}
        </p>
      )}
    </div>
  );
}
