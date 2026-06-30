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
} from "@/lib/domain-styles";
import { formatCurrency, cn } from "@/lib/utils";
import { Award, Moon, Palmtree, Sun, Train } from "lucide-react";
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
  statusBadge?: ReactNode;
  amount?: number;
  purpose?: string;
};

export function EventCardShell({
  id,
  domain,
  headline,
  subtitle,
  statusBadge,
  amount,
  purpose,
}: EventCardShellProps) {
  const Icon = domainIcons[domain];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", domainCardClass(domain))}>
      <CardContent className="flex items-center gap-2 p-4">
        <Link href={`/timeline/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              domainIconClass(domain),
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-medium", domainLabelClass(domain))}>
              {DOMAIN_LABELS[domain]}
            </p>
            <p className="truncate font-medium">{headline}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
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
        <DeleteEventButton eventId={id} compact />
      </CardContent>
    </Card>
  );
}
