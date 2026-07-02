import Link from "next/link";
import type { ClaimStatus } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { claimStatusBadge } from "@/components/ui/badge";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import {
  domainCardClass,
  domainIconClass,
  domainLabelClass,
} from "@/lib/domain-styles";
import type { ClaimSettlementDomain } from "@/lib/services/monthly-claim-utils";
import { formatCurrency, cn } from "@/lib/utils";
import { Moon, Train } from "lucide-react";

const domainIcons: Record<ClaimSettlementDomain, typeof Moon> = {
  NIGHT_DUTY: Moon,
  TRAVEL: Train,
};

type MonthlyClaimCardProps = {
  id: string;
  domain: ClaimSettlementDomain;
  title: string;
  childCount: number;
  total: number;
  status: ClaimStatus;
};

function entryLabel(domain: ClaimSettlementDomain, count: number) {
  const unit = domain === "TRAVEL" ? "journey" : "night";
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function MonthlyClaimCard({
  id,
  domain,
  title,
  childCount,
  total,
  status,
}: MonthlyClaimCardProps) {
  const Icon = domainIcons[domain];

  return (
    <Card
      className={cn("transition-shadow hover:shadow-md", domainCardClass(domain))}
    >
      <CardContent className="p-4">
        <Link href={`/claims/${id}`} className="flex items-center gap-3">
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
            <p className="truncate font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              {entryLabel(domain, childCount)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {claimStatusBadge(status)}
              <span className="text-sm text-muted-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
