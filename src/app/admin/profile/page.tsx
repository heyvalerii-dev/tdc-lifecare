import { redirect } from "next/navigation";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { PageContainer } from "@/components/layout/page-container";
import { resolveAvatarSrc } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/client/dashboard");

  const avatarUrl =
    resolveAvatarSrc(profile.avatar_url, user.user_metadata) ??
    profile.avatar_url;

  return (
    <PageContainer
      title="My Profile"
      description="Manage your personal account settings."
    >
      <AdminProfileForm
        profile={{
          id: profile.id,
          email: profile.email || user.email || "",
          full_name: profile.full_name,
          avatar_url: avatarUrl,
          role: profile.role,
        }}
      />
    </PageContainer>
  );
}
