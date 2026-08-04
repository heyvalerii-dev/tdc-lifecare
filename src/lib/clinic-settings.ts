import { createClient } from "@/lib/supabase/server";
import type { ClinicSettingsMap } from "@/types/database";
import { DEFAULT_CLINIC_WORKING_DAYS } from "@/lib/clinic-working-days";

const DEFAULTS: ClinicSettingsMap = {
  minimum_advance_booking_hours: 24,
  payment_hold_hours: 24,
  allow_same_day_booking: false,
  allow_admin_booking_without_payment: true,
  default_timezone: "Asia/Manila",
  working_days: [...DEFAULT_CLINIC_WORKING_DAYS],
};

export async function getClinicSettings(): Promise<ClinicSettingsMap> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_settings").select("key, value");

  const settings: ClinicSettingsMap = { ...DEFAULTS };
  if (data) {
    for (const row of data) {
      switch (row.key) {
        case "minimum_advance_booking_hours":
          settings.minimum_advance_booking_hours = parseInt(row.value, 10);
          break;
        case "payment_hold_hours":
          settings.payment_hold_hours = parseInt(row.value, 10);
          break;
        case "allow_same_day_booking":
          settings.allow_same_day_booking = row.value === "true";
          break;
        case "allow_admin_booking_without_payment":
          settings.allow_admin_booking_without_payment = row.value === "true";
          break;
        case "default_timezone":
          settings.default_timezone = row.value;
          break;
        case "working_days":
          try {
            const parsed = JSON.parse(row.value) as number[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              settings.working_days = parsed;
            }
          } catch {
            // keep default
          }
          break;
      }
    }
  }
  return settings;
}

export async function updateClinicSetting(key: string, value: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}
