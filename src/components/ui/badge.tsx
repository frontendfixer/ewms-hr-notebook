import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/design-tokens";
import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";

type StatusVariant = keyof typeof STATUS_COLORS;

export function Badge({
  className,
  variant = "muted",
  children,
}: {
  className?: string;
  variant?: StatusVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function claimStatusBadge(status: string) {
  const label = CLAIM_STATUS_LABELS[status] ?? status;
  const variant: StatusVariant =
    status === "PAID"
      ? "success"
      : status === "PASSED"
        ? "info"
        : status === "BILL_SUBMITTED"
          ? "warning"
          : "muted";
  return <Badge variant={variant}>{label}</Badge>;
}
