import { redirect } from "next/navigation";

/** Services now live under Clinic Settings. */
export default function AdminServicesRedirectPage() {
  redirect("/admin/settings#services");
}
