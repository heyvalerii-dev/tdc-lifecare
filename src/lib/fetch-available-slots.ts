export const SLOTS_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

export interface SlotOption {
  start: string;
  label: string;
}

export class SlotsFetchError extends Error {
  constructor(message = "Couldn't load available times") {
    super(message);
    this.name = "SlotsFetchError";
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function abortableSleep(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface FetchAvailableSlotsOptions {
  psychologistId: string;
  serviceId: string;
  date: string;
  bypassRules?: boolean;
  signal?: AbortSignal;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Loads appointment slots for a date.
 * An empty list is a successful result and is not retried.
 * Only network / HTTP / malformed responses are retried.
 */
export async function fetchAvailableSlots(
  options: FetchAvailableSlotsOptions
): Promise<SlotOption[]> {
  const maxAttempts = options.maxAttempts ?? SLOTS_MAX_ATTEMPTS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? abortableSleep;
  const params = new URLSearchParams({
    psychologist_id: options.psychologistId,
    service_id: options.serviceId,
    date: options.date,
    ...(options.bypassRules ? { bypass: "true" } : {}),
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const res = await fetchImpl(`/api/slots?${params}`, {
        signal: options.signal,
      });

      if (!res.ok) {
        throw new SlotsFetchError("Couldn't load available times");
      }

      const result: unknown = await res.json();
      if (!Array.isArray(result)) {
        throw new SlotsFetchError("Invalid slots response");
      }

      return result as SlotOption[];
    } catch (error) {
      if (isAbortError(error)) throw error;
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(RETRY_DELAY_MS * attempt, options.signal);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SlotsFetchError();
}
