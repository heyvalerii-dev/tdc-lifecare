import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientHeader } from "@/components/layout/client-header";
import { resolveAvatarSrc } from "@/lib/avatar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin/dashboard");

  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, user.user_metadata);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ClientHeader
        userName={profile?.full_name}
        userEmail={user.email}
        avatarSrc={avatarSrc}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
