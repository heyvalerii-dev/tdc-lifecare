import { createClient } from "@/lib/supabase/server";
import { ManualBookingDeepLink } from "@/components/admin/manual-booking/manual-booking-deep-link";

export default async function AdminBookPage({
  searchParams,
}: {
  searchParams: Promise<{
    psychologist_id?: string;
    date?: string;
    time?: string;
  }>;
}) {
  const params = await searchParams;
  let psychologistName: string | undefined;

  if (params.psychologist_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("psychologists")
      .select("name")
      .eq("id", params.psychologist_id)
      .maybeSingle();
    psychologistName = data?.name;
  }

  return (
    <ManualBookingDeepLink
      psychologistId={params.psychologist_id}
      psychologistName={psychologistName}
      date={params.date}
      time={params.time}
    />
  );
}
