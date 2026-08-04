import { afterEach, describe, expect, it, vi } from "vitest";

describe("payments config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('treats only the string "true" as PayMongo enabled', async () => {
    vi.stubEnv("PAYMONGO_ENABLED", "true");
    const { isPayMongoEnabled } = await import("@/lib/payments/config");
    expect(isPayMongoEnabled()).toBe(true);
  });

  it("treats false / unset / other values as Demo Mode", async () => {
    for (const value of ["false", "TRUE", "1", "", undefined]) {
      vi.resetModules();
      if (value === undefined) {
        vi.stubEnv("PAYMONGO_ENABLED", "");
        delete process.env.PAYMONGO_ENABLED;
      } else {
        vi.stubEnv("PAYMONGO_ENABLED", value);
      }
      const { isPayMongoEnabled } = await import("@/lib/payments/config");
      expect(isPayMongoEnabled()).toBe(false);
    }
  });

  it("detects sandbox keys without exposing the secret", async () => {
    vi.stubEnv("PAYMONGO_ENABLED", "true");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_abc123");
    const { getPublicPaymentsConfig, isPayMongoSandbox } = await import(
      "@/lib/payments/config"
    );
    expect(isPayMongoSandbox()).toBe(true);
    expect(getPublicPaymentsConfig()).toEqual({
      paymongoEnabled: true,
      paymongoSandbox: true,
    });
    expect(JSON.stringify(getPublicPaymentsConfig())).not.toContain("sk_test");
  });

  it("does not treat live keys as sandbox", async () => {
    vi.stubEnv("PAYMONGO_ENABLED", "true");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_live_abc123");
    const { getPublicPaymentsConfig, isPayMongoSandbox } = await import(
      "@/lib/payments/config"
    );
    expect(isPayMongoSandbox()).toBe(false);
    expect(getPublicPaymentsConfig()).toEqual({
      paymongoEnabled: true,
      paymongoSandbox: false,
    });
  });
});
