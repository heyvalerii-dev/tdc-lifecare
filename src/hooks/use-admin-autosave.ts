"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminSaveStatus = "idle" | "editing" | "saving" | "saved" | "error";

const DEFAULT_DEBOUNCE_MS = 700;
const SAVED_VISIBLE_MS = 2000;

function recordsEqual<T extends object>(a: T, b: T): boolean {
  const keys = new Set([
    ...Object.keys(a as object),
    ...Object.keys(b as object),
  ]);
  for (const key of keys) {
    if (
      (a as Record<string, unknown>)[key] !==
      (b as Record<string, unknown>)[key]
    ) {
      return false;
    }
  }
  return true;
}

interface UseAdminAutosaveOptions<T extends object> {
  initialValues: T;
  debounceMs?: number;
  enabled?: boolean;
  /** Return updated values (e.g. remapped ids) to replace local + last-saved state. */
  onSave: (values: T) => Promise<T | void>;
  onSaved?: (values: T) => void;
  equals?: (a: T, b: T) => boolean;
  /**
   * When the user edits during an in-flight save, merge server-normalized
   * `saved` values (from `sent`) into the newer `current` draft.
   */
  reconcile?: (sent: T, saved: T, current: T) => T;
}

export function useAdminAutosave<T extends object>({
  initialValues,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
  onSave,
  onSaved,
  equals = recordsEqual,
  reconcile,
}: UseAdminAutosaveOptions<T>) {
  const router = useRouter();
  const [values, setValues] = useState<T>(initialValues);
  const [status, setStatus] = useState<AdminSaveStatus>("idle");

  const valuesRef = useRef(values);
  const lastSavedRef = useRef(initialValues);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const savingRef = useRef(false);
  const queuedValuesRef = useRef<T | null>(null);

  valuesRef.current = values;
  enabledRef.current = enabled;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedHideRef.current) clearTimeout(savedHideRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setValues(initialValues);
      lastSavedRef.current = initialValues;
      setStatus("idle");
      queuedValuesRef.current = null;
    }
  }, [initialValues, enabled]);

  const persist = useCallback(
    async (nextValues: T) => {
      if (!enabledRef.current) return;

      if (savingRef.current) {
        queuedValuesRef.current = nextValues;
        return;
      }

      if (equals(nextValues, lastSavedRef.current)) {
        if (isMountedRef.current) setStatus("idle");
        return;
      }

      savingRef.current = true;
      const requestId = ++requestIdRef.current;
      if (isMountedRef.current) setStatus("saving");

      try {
        const result = await onSave(nextValues);
        if (requestId !== requestIdRef.current || !enabledRef.current) return;

        const savedValues = result ?? nextValues;
        lastSavedRef.current = savedValues;

        if (!isMountedRef.current) return;

        const queued = queuedValuesRef.current;
        if (queued) {
          const merged = reconcile
            ? reconcile(nextValues, savedValues, queued)
            : queued;
          queuedValuesRef.current = null;
          valuesRef.current = merged;
          setValues(merged);
          onSaved?.(savedValues);
          // Continue with latest edits; don't refresh yet.
        } else if (equals(valuesRef.current, nextValues)) {
          valuesRef.current = savedValues;
          setValues(savedValues);
          setStatus("saved");
          onSaved?.(savedValues);
          router.refresh();

          if (savedHideRef.current) clearTimeout(savedHideRef.current);
          savedHideRef.current = setTimeout(() => {
            if (isMountedRef.current && requestId === requestIdRef.current) {
              setStatus((current) => (current === "saved" ? "idle" : current));
            }
          }, SAVED_VISIBLE_MS);
        } else {
          const merged = reconcile
            ? reconcile(nextValues, savedValues, valuesRef.current)
            : valuesRef.current;
          valuesRef.current = merged;
          setValues(merged);
          onSaved?.(savedValues);
        }
      } catch (error) {
        if (requestId !== requestIdRef.current || !isMountedRef.current) return;

        const message =
          error instanceof Error ? error.message : "Couldn't save changes";

        if (process.env.NODE_ENV === "development") {
          console.error("[useAdminAutosave] Save failed:", message, error);
        }

        setStatus("error");
      } finally {
        savingRef.current = false;

        const queued = queuedValuesRef.current;
        if (
          queued &&
          enabledRef.current &&
          !equals(queued, lastSavedRef.current)
        ) {
          queuedValuesRef.current = null;
          void persist(queued);
        } else if (
          enabledRef.current &&
          !equals(valuesRef.current, lastSavedRef.current)
        ) {
          void persist(valuesRef.current);
        }
      }
    },
    [equals, onSave, onSaved, reconcile, router]
  );

  const scheduleSave = useCallback(
    (nextValues: T) => {
      if (!enabledRef.current) return;

      if (savedHideRef.current) {
        clearTimeout(savedHideRef.current);
        savedHideRef.current = null;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (equals(nextValues, lastSavedRef.current)) {
        setStatus((current) => (current === "error" ? current : "idle"));
        return;
      }

      setStatus("editing");

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void persist(valuesRef.current);
      }, debounceMs);
    },
    [debounceMs, equals, persist]
  );

  function updateValues(updater: T | ((prev: T) => T)) {
    setValues((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: T) => T)(prev)
          : updater;
      scheduleSave(next);
      return next;
    });
  }

  const flush = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (
      enabledRef.current &&
      !equals(valuesRef.current, lastSavedRef.current)
    ) {
      await persist(valuesRef.current);
    }
  }, [equals, persist]);

  function resetToSaved() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedHideRef.current) clearTimeout(savedHideRef.current);
    queuedValuesRef.current = null;
    setValues(lastSavedRef.current);
    setStatus("idle");
  }

  function resetToInitial() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedHideRef.current) clearTimeout(savedHideRef.current);
    queuedValuesRef.current = null;
    lastSavedRef.current = initialValues;
    setValues(initialValues);
    setStatus("idle");
  }

  return {
    values,
    setValues: updateValues,
    status,
    flush,
    resetToSaved,
    resetToInitial,
    lastSaved: lastSavedRef.current,
  };
}
