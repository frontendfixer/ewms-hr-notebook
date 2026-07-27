import type { EventDomain } from "@/generated/prisma/client";
import { DOMAIN_STYLES, USED_CR_STYLES } from "@/lib/design-tokens";
import type { RecordType } from "@/lib/record-routes";
import { cn } from "@/lib/utils";

export function domainCardClass(domain: EventDomain, className?: string) {
  const styles = DOMAIN_STYLES[domain];
  return cn("border", styles.card, styles.border, className);
}

export function usedCrCardClass(className?: string) {
  return cn("border", USED_CR_STYLES.card, USED_CR_STYLES.border, className);
}

export function domainIconClass(domain: EventDomain, isUsedCr = false) {
  if (domain === "CR" && isUsedCr) return USED_CR_STYLES.icon;
  return DOMAIN_STYLES[domain].icon;
}

export function domainLabelClass(domain: EventDomain, isUsedCr = false) {
  if (domain === "CR" && isUsedCr) return USED_CR_STYLES.label;
  return DOMAIN_STYLES[domain].label;
}

export function domainDotClass(domain: EventDomain) {
  return DOMAIN_STYLES[domain].dot;
}

export function domainBarClass(domain: EventDomain) {
  return DOMAIN_STYLES[domain].bar;
}

export function domainChipActiveClass(domain: EventDomain) {
  const styles = DOMAIN_STYLES[domain];
  return cn(styles.chipActive, styles.border);
}

const RECORD_TYPE_DOMAIN: Partial<Record<RecordType, EventDomain>> = {
  cr: "CR",
  leave: "LEAVE",
  night: "NIGHT_DUTY",
  ta: "TRAVEL",
};

export function recordTypeDomain(type: RecordType): EventDomain | undefined {
  return RECORD_TYPE_DOMAIN[type];
}
