import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/page-container";
import { ServicesSettingsSection } from "@/components/admin/services-settings-section";
import { SettingsForm } from "@/components/admin/settings-form";
import { StaffAccessSection } from "@/components/admin/staff-access-section";
import type { StaffProfile } from "@/lib/admin-staff";
import type { ClinicSetting, Service } from "@/types/database";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: services }, { data: administrators }] =
    await Promise.all([
      supabase.from("clinic_settings").select("*").order("key"),
      supabase.from("services").select("*").order("name"),
      supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name, avatar_url, role")
        .eq("role", "admin")
        .order("full_name", { ascending: true, nullsFirst: false }),
    ]);

  const clinicSettings = (settings ?? []) as ClinicSetting[];

  return (
    <PageContainer
      title="Clinic Settings"
      description="Configure booking rules, services, payment preferences, and administrator access."
    >
      <div className="space-y-6">
        <SettingsForm settings={clinicSettings} groupIds={["booking"]} />
        <ServicesSettingsSection services={(services ?? []) as Service[]} />
        <SettingsForm
          settings={clinicSettings}
          groupIds={["payment-configuration"]}
        />
        <StaffAccessSection
          currentUserId={user?.id ?? ""}
          administrators={(administrators ?? []) as StaffProfile[]}
        />
      </div>
    </PageContainer>
  );
}
