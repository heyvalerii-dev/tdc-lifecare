import { formatClinicDate } from "@/lib/datetime";

export function formatClientSinceDate(
  createdAt: string | undefined
): string | undefined {
  if (!createdAt) return undefined;
  return `Client since ${formatClinicDate(createdAt, "MMM yyyy")}`;
}
