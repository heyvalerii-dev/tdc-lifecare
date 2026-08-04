import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/page-container";
import { ServicesSettingsSection } from "@/components/admin/services-settings-section";
import { SettingsForm } from "@/components/admin/settings-form";
import type { ClinicSetting, Service } from "@/types/database";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: services }] = await Promise.all([
    supabase.from("clinic_settings").select("*").order("key"),
    supabase.from("services").select("*").order("name"),
  ]);

  const clinicSettings = (settings ?? []) as ClinicSetting[];

  return (
    <PageContainer
      title="Clinic Settings"
      description="Configure booking rules, services, and payment preferences."
    >
      <div className="space-y-6">
        <SettingsForm settings={clinicSettings} groupIds={["booking"]} />
        <ServicesSettingsSection services={(services ?? []) as Service[]} />
        <SettingsForm
          settings={clinicSettings}
          groupIds={["payment-configuration"]}
        />
      </div>
    </PageContainer>
  );
}
