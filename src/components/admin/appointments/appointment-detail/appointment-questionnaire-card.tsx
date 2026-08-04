import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailLabelClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { QuestionnaireResponse } from "@/types/database";

interface AppointmentQuestionnaireCardProps {
  questionnaireResponse: QuestionnaireResponse | null;
}

function formatAnswer(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function AppointmentQuestionnaireCard({
  questionnaireResponse,
}: AppointmentQuestionnaireCardProps) {
  const entries = questionnaireResponse
    ? Object.entries(questionnaireResponse.responses)
    : [];
  const isComplete = entries.length > 0;

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Questionnaire</h2>
      </div>
      <div className={detailCardBodyClass}>
        {!isComplete || !questionnaireResponse ? (
          <p className={detailMutedClass}>
            Client has not submitted the intake form yet.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="divide-y divide-[var(--brand-purple)]/[0.06]">
              {entries.map(([key, value]) => (
                <div key={key} className="space-y-1.5 py-4 first:pt-0 last:pb-0">
                  <p className={detailLabelClass}>{key.replace(/_/g, " ")}</p>
                  <p className={cn(detailValueClass, "leading-relaxed")}>
                    {formatAnswer(value)}
                  </p>
                </div>
              ))}
            </div>

            {questionnaireResponse.submitted_at && (
              <p className="border-t border-[var(--brand-purple)]/[0.06] pt-4 text-xs text-[var(--brand-text-muted)]">
                Submitted{" "}
                {formatClinicDate(
                  questionnaireResponse.submitted_at,
                  "MMM d, yyyy"
                )}{" "}
                • {formatClinicTime(questionnaireResponse.submitted_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
