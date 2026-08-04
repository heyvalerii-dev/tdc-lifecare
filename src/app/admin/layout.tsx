import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManualBookingProvider } from "@/components/admin/manual-booking/manual-booking-context";
import { AdminHeader } from "@/components/layout/admin-header";
import { resolveAvatarSrc } from "@/lib/avatar";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/client/dashboard");

  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, user.user_metadata);
  const workingDays = getClinicWorkingDays(await getClinicSettings());

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBFF]">
      <ManualBookingProvider workingDays={workingDays}>
        <AdminHeader
          userName={profile?.full_name}
          userEmail={user.email}
          avatarSrc={avatarSrc}
        />
        <main className="flex-1">{children}</main>
      </ManualBookingProvider>
    </div>
  );
}
