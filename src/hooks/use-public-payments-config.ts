"use client";

import { useEffect, useState } from "react";
import type { PublicPaymentsConfig } from "@/lib/payments/config";

const DEFAULT_CONFIG: PublicPaymentsConfig = {
  paymongoEnabled: false,
  paymongoSandbox: false,
};

/**
 * Loads safe payment UI flags from the server.
 * Never receives secret keys.
 */
export function usePublicPaymentsConfig() {
  const [config, setConfig] = useState<PublicPaymentsConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/payments/config", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<PublicPaymentsConfig>;
        if (cancelled) return;
        setConfig({
          paymongoEnabled: Boolean(data.paymongoEnabled),
          paymongoSandbox: Boolean(data.paymongoSandbox),
        });
      } catch {
        // Soft-fail: hide sandbox indicators if config cannot load.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...config,
    loaded,
    /** Show sandbox UI only when enabled + test keys. */
    showSandbox: config.paymongoEnabled && config.paymongoSandbox,
  };
}
