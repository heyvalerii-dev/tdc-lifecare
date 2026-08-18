import { describe, expect, it, vi } from "vitest";
import {
  SLOTS_MAX_ATTEMPTS,
  fetchAvailableSlots,
  isAbortError,
} from "@/lib/fetch-available-slots";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchAvailableSlots", () => {
  it("treats an empty list as a successful result and does not retry", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));

    const slots = await fetchAvailableSlots({
      psychologistId: "p1",
      serviceId: "s1",
      date: "2026-07-20",
      fetchImpl,
      sleep: vi.fn(),
    });

    expect(slots).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns available times from a successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse([{ start: "2026-07-21T01:00:00.000Z", label: "9:00 AM" }])
    );

    const slots = await fetchAvailableSlots({
      psychologistId: "p1",
      serviceId: "s1",
      date: "2026-07-21",
      fetchImpl,
      sleep: vi.fn(),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.label).toBe("9:00 AM");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries transient HTTP failures up to the maximum, then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "fail" }, 500))
      .mockResolvedValueOnce(jsonResponse([]));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const slots = await fetchAvailableSlots({
      psychologistId: "p1",
      serviceId: "s1",
      date: "2026-07-21",
      fetchImpl,
      sleep,
    });

    expect(slots).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("stops after the maximum retry attempts on persistent failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "fail" }, 500));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchAvailableSlots({
        psychologistId: "p1",
        serviceId: "s1",
        date: "2026-07-21",
        fetchImpl,
        sleep,
      })
    ).rejects.toThrow("Couldn't load available times");

    expect(fetchImpl).toHaveBeenCalledTimes(SLOTS_MAX_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(SLOTS_MAX_ATTEMPTS - 1);
  });

  it("retries network errors but does not retry aborted requests", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchAvailableSlots({
        psychologistId: "p1",
        serviceId: "s1",
        date: "2026-07-21",
        fetchImpl,
        sleep,
      })
    ).rejects.toThrow("Failed to fetch");

    expect(fetchImpl).toHaveBeenCalledTimes(SLOTS_MAX_ATTEMPTS);

    const abortFetch = vi
      .fn()
      .mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(
      fetchAvailableSlots({
        psychologistId: "p1",
        serviceId: "s1",
        date: "2026-07-21",
        fetchImpl: abortFetch,
        sleep,
      })
    ).rejects.toSatisfy(isAbortError);

    expect(abortFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores in-flight work when the caller aborts for a newer date", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const pending = fetchAvailableSlots({
      psychologistId: "p1",
      serviceId: "s1",
      date: "2026-07-20",
      fetchImpl,
      signal: controller.signal,
      sleep: vi.fn(),
    });

    controller.abort();

    await expect(pending).rejects.toSatisfy(isAbortError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
