import { redirect } from "next/navigation";

/**
 * Unavailable blocks are being folded into the Appointments/Calendar experience.
 * Weekly recurring availability stays on psychologist profiles; calendar exceptions
 * (vacations, holidays, leave, clinic closures) will be managed as Blocked Time
 * alongside appointments — not as a standalone admin page.
 */
export default function AdminUnavailableBlocksRedirectPage() {
  redirect("/admin/calendar");
}
