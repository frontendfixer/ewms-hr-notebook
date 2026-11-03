"use client";

import Link from "next/link";
import type { EventDomain } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteEventButton } from "@/components/timeline/delete-event-button";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import {
  domainCardClass,
  domainIconClass,
  domainLabelClass,
  usedCrCardClass,
} from "@/lib/domain-styles";
import { formatCurrency, cn } from "@/lib/utils";
import { Award, Moon, Palmtree, Pencil, Sun, Train } from "lucide-react";
import type { ReactNode } from "react";

const domainIcons: Record<EventDomain, typeof Sun> = {
  CR: Award,
  LEAVE: Palmtree,
  NIGHT_DUTY: Moon,
  TRAVEL: Train,
  META: Sun,
};

type EventCardShellProps = {
  id: string;
  domain: EventDomain;
  headline: string;
  subtitle?: string;
  details?: string[];
  isUsedCr?: boolean;
  statusBadge?: ReactNode;
  amount?: number;
  purpose?: string;
  /** Show the edit shortcut; the edit page re-checks before saving. */
  editable?: boolean;
};

export function EventCardShell({
  id,
  domain,
  headline,
  subtitle,
  details,
  isUsedCr = false,
  statusBadge,
  amount,
  purpose,
  editable = false,
}: EventCardShellProps) {
  const Icon = domainIcons[domain];
  const cardClass =
    domain === "CR" && isUsedCr
      ? usedCrCardClass()
      : domainCardClass(domain);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", cardClass)}>
      <CardContent className="flex items-center gap-2 p-4">
        <Link href={`/timeline/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              domainIconClass(domain, isUsedCr),
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-medium", domainLabelClass(domain, isUsedCr))}>
              {DOMAIN_LABELS[domain]}
            </p>
            <p className={cn("truncate font-medium", isUsedCr && "text-muted-foreground")}>
              {headline}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {details && details.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {details.map((detail) => (
                  <p key={detail} className="text-xs text-muted-foreground">
                    {detail}
                  </p>
                ))}
              </div>
            )}
            {(statusBadge || amount != null || purpose) && (
              <div className="mt-1 flex items-center gap-2">
                {statusBadge}
                {amount != null && (
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(amount)}
                  </span>
                )}
                {purpose && (
                  <span className="truncate text-xs text-muted-foreground">
                    {purpose}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
        {editable && (
          <Link
            href={`/timeline/${id}/edit`}
            aria-label="Edit entry"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        )}
        <DeleteEventButton eventId={id} compact />
      </CardContent>
    </Card>
  );
}
