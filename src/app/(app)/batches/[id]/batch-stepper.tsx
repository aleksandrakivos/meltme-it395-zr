import { BatchStatus } from "@prisma/client";
import { CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "upcoming" | "cancelled";

type Step = {
  key: string;
  label: string;
  state: StepState;
  at: Date | null;
  by: string | null;
};

type BatchStepperProps = {
  status: BatchStatus;
  plannedAt: Date;
  plannedBy: string;
  startedAt: Date | null;
  startedBy: string | null;
  completedAt: Date | null;
  completedBy: string | null;
};

/**
 * Vizuelni tok serije: Planirana → Započeta → U toku → Završena (ili Otkazana).
 * Zamenjuje tabelu „Tok serije" i ponovljeni status.
 */
export function BatchStepper({
  status,
  plannedAt,
  plannedBy,
  startedAt,
  startedBy,
  completedAt,
  completedBy,
}: BatchStepperProps) {
  const cancelled = status === BatchStatus.OTKAZANA;
  const terminal =
    status === BatchStatus.ZAVRSENA ||
    status === BatchStatus.DELIMICNO_USPESNA ||
    cancelled;
  const reachedStarted = status !== BatchStatus.PLANIRANA && startedAt !== null;
  const reachedInProgress =
    status === BatchStatus.U_TOKU || (terminal && reachedStarted && !cancelled);

  const steps: Step[] = [
    {
      key: "planned",
      label: "Planirana",
      state: status === BatchStatus.PLANIRANA ? "current" : "done",
      at: plannedAt,
      by: plannedBy,
    },
    {
      key: "started",
      label: "Započeta",
      state: reachedStarted
        ? status === BatchStatus.ZAPOCETA
          ? "current"
          : "done"
        : cancelled
          ? "cancelled"
          : "upcoming",
      at: startedAt,
      by: startedBy,
    },
    {
      key: "in-progress",
      label: "U toku",
      state: reachedInProgress
        ? status === BatchStatus.U_TOKU
          ? "current"
          : "done"
        : cancelled
          ? "cancelled"
          : "upcoming",
      at: null,
      by: null,
    },
    {
      key: "completed",
      label: cancelled
        ? "Otkazana"
        : status === BatchStatus.DELIMICNO_USPESNA
          ? "Delimično uspešna"
          : "Završena",
      state: cancelled ? "cancelled" : terminal ? "done" : "upcoming",
      at: completedAt,
      by: completedBy,
    },
  ];

  return (
    <ol className="grid gap-4 sm:grid-cols-4" aria-label="Tok serije">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center border font-mono text-xs",
                  step.state === "done" &&
                    "border-foreground bg-foreground text-background",
                  step.state === "current" &&
                    "border-foreground bg-wax-rose text-foreground",
                  step.state === "upcoming" &&
                    "border-border text-muted-foreground",
                  step.state === "cancelled" &&
                    (isLast
                      ? "border-destructive bg-destructive text-white"
                      : "border-dashed border-border text-muted-foreground"),
                )}
              >
                {step.state === "done" ? (
                  <CheckIcon weight="bold" aria-hidden="true" className="size-3.5" />
                ) : step.state === "cancelled" && isLast ? (
                  <XIcon weight="bold" aria-hidden="true" className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden h-px flex-1 sm:block",
                    step.state === "done" ? "bg-foreground" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" && "text-muted-foreground",
                  step.state === "cancelled" && !isLast && "text-muted-foreground line-through",
                  step.state === "cancelled" && isLast && "text-destructive",
                )}
              >
                {step.label}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {step.at ? formatDate(step.at) : "—"}
              </p>
              {step.by ? (
                <p className="text-xs text-muted-foreground">{step.by}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
