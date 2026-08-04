import { redirect } from "next/navigation";

/** Legacy route — questionnaires live on Client and Appointment detail pages. */
export default function AdminQuestionnaireResponsesRedirectPage() {
  redirect("/admin/clients");
}
