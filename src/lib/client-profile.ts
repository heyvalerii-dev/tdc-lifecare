import type { ClientSex } from "@/types/database";

export const CLIENT_SEX_OPTIONS: { value: ClientSex | ""; label: string }[] = [
  { value: "", label: "Select…" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const CLIENT_SEX_LABELS: Record<ClientSex, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export function formatClientSex(sex: ClientSex | null | undefined): string {
  if (!sex) return "—";
  return CLIENT_SEX_LABELS[sex] ?? sex;
}

export function formatClientBirthdate(
  birthdate: string | null | undefined
): string {
  if (!birthdate) return "—";
  const date = new Date(`${birthdate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return birthdate;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
