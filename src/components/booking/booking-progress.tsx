import { cn } from "@/lib/utils";
import { Fragment } from "react";
import { BookingStepHeader } from "@/components/ui/typography";

export const BOOKING_PROGRESS_STEPS = [
  "Psychologist",
  "Service",
  "Schedule",
  "Sign in",
  "Intake",
  "Payment",
  "Confirmation",
] as const;

interface BookingProgressProps {
  /** 1-based step index */
  currentStep: number;
  className?: string;
}

type StepStatus = "complete" | "current" | "upcoming";

const CIRCLE_SIZE = "h-10 w-10"; // 40px

function getStepStatus(stepNumber: number, currentStep: number): StepStatus {
  if (stepNumber < currentStep) return "complete";
  if (stepNumber === currentStep) return "current";
  return "upcoming";
}

function StepCircle({ number, status }: { number: number; status: StepStatus }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ease-out",
        CIRCLE_SIZE,
        status === "complete" && "bg-[var(--brand-purple)] text-white",
        status === "current" &&
          "border-2 border-[var(--brand-purple)] bg-white text-[var(--brand-purple)] shadow-[0_0_0_4px_rgba(93,80,122,0.08)]",
        status === "upcoming" &&
          "border border-[var(--brand-border)] bg-white text-[var(--brand-text-muted)]/45"
      )}
      aria-current={status === "current" ? "step" : undefined}
    >
      {number}
    </div>
  );
}

function StepConnector({ filled }: { filled: boolean }) {
  return (
    <div className={cn("flex flex-1 items-center px-1.5 sm:px-2.5", CIRCLE_SIZE)}>
      <div
        className={cn(
          "h-[2px] w-full rounded-full transition-colors duration-300 ease-out",
          filled ? "bg-[var(--brand-purple)]" : "bg-[var(--brand-border)]"
        )}
      />
    </div>
  );
}

export function BookingProgress({ currentStep, className }: BookingProgressProps) {
  return (
    <nav
      className={cn(className)}
      aria-label={`Booking progress, step ${currentStep} of ${BOOKING_PROGRESS_STEPS.length}`}
    >
      <ol className="flex w-full items-center">
        {BOOKING_PROGRESS_STEPS.map((_, index) => {
          const stepNumber = index + 1;
          const status = getStepStatus(stepNumber, currentStep);

          return (
            <Fragment key={stepNumber}>
              {index > 0 && <StepConnector filled={stepNumber <= currentStep} />}
              <li className="list-none">
                <StepCircle number={stepNumber} status={status} />
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

interface BookingStepIntroProps {
  title: string;
  description?: string;
  currentStep: number;
  className?: string;
}

/** Page title, description, and progress — progress sits below the intro copy */
export function BookingStepIntro({
  title,
  description,
  currentStep,
  className,
}: BookingStepIntroProps) {
  return (
    <div className={cn("mx-auto max-w-2xl space-y-6", className)}>
      <BookingStepHeader title={title} description={description} />
      <BookingProgress currentStep={currentStep} />
    </div>
  );
}
