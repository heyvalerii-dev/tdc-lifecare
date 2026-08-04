"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { Avatar, type AvatarSize } from "@/components/ui/avatar";
import {
  ImageOptimizeError,
  OPTIMIZE_IMAGE_ACCEPT,
  optimizeAvatarImage,
} from "@/lib/images";
import { cn } from "@/lib/utils";

interface LocalAvatarPickerProps {
  name: string;
  file: File | null;
  onChange: (file: File | null) => void;
  size?: AvatarSize;
  disabled?: boolean;
  className?: string;
}

type PickerPhase = "idle" | "working" | "success";

export function LocalAvatarPicker({
  name,
  file,
  onChange,
  size = "xl",
  disabled,
  className,
}: LocalAvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PickerPhase>("idle");

  const busy = phase === "working";

  useEffect(() => {
    if (!file) {
      setPreviewSrc(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  async function acceptFile(next: File | undefined) {
    if (!next || disabled || busy) return;

    setError(null);
    setPhase("working");

    try {
      const optimized = await optimizeAvatarImage(next);
      onChange(optimized);
      setPhase("success");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setPhase("idle"), 1200);
    } catch (err) {
      setPhase("idle");
      if (err instanceof ImageOptimizeError) {
        setError(err.message);
      } else {
        setError("We couldn’t prepare that photo. Try another image.");
      }
    }
  }

  const showOverlay = dragOver || phase !== "idle";
  const iconSize = size === "2xl" ? "h-7 w-7" : "h-5 w-5";

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
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void acceptFile(e.dataTransfer.files?.[0]);
        }}
        aria-label="Upload photo"
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
        <Avatar name={name} src={previewSrc} size={size} />
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
            <Loader2 className={cn(iconSize, "animate-spin")} strokeWidth={1.75} />
          ) : phase === "success" ? (
            <Check
              className={iconSize}
              strokeWidth={2.25}
              aria-hidden
            />
          ) : (
            <Camera className={iconSize} strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={OPTIMIZE_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        tabIndex={-1}
        disabled={disabled || busy}
      />
      <p className="text-center text-xs font-normal leading-snug text-[var(--brand-text-muted)]">
        Drag & drop or click
      </p>
      {error && (
        <p className="max-w-[10rem] text-center text-[11px] leading-snug text-[#8C5C68]">
          {error}
        </p>
      )}
    </div>
  );
}
