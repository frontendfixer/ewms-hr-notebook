import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/design-tokens";
import { CLAIM_STATUS_LABELS, claimStatusVariant } from "@/lib/design-tokens";

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
  return <Badge variant={claimStatusVariant(status)}>{label}</Badge>;
}
