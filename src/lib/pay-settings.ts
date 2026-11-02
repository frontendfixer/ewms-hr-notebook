import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/design-tokens";
import { DEFAULT_CL_ENTITLEMENT } from "@/lib/calculations/leave";
import {
  daPercentOn,
  officialDaPercentOn,
  taRateFor,
} from "@/lib/calculations/allowances";

export type PaySettings = {
  basicPay: number;
  payLevel: number | null;
  /** User override; null = official rate by date. */
  daPercentOverride: number | null;
  /** User override for the full daily allowance; null = derived from pay level. */
  taRateOverride: number | null;
  /** DA % in force today (override or official). */
  currentDaPercent: number;
  officialDaPercentToday: number | null;
  /** Full daily allowance in force today. */
  currentTaRate: number;
  clEntitlement: number;
  autoLeaveCredits: boolean;
  configured: boolean;
};

function parseOptionalNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function getSettingsMap(userId: string): Promise<Record<string, string>> {
  const rows = await prisma.userSetting.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function taRateOn(pay: PaySettings, date: Date): number {
  return taRateFor(pay, date);
}

export async function getPaySettings(userId: string): Promise<PaySettings> {
  const map = await getSettingsMap(userId);
  const basicPay = parseOptionalNumber(map[SETTING_KEYS.BASIC_PAY]) ?? 0;
  const payLevel = parseOptionalNumber(map[SETTING_KEYS.PAY_LEVEL]);
  const daPercentOverride = parseOptionalNumber(map[SETTING_KEYS.DA_PERCENT_OVERRIDE]);
  const taRateOverride = parseOptionalNumber(map[SETTING_KEYS.TA_RATE_OVERRIDE]);
  const clEntitlement =
    parseOptionalNumber(map[SETTING_KEYS.CL_ENTITLEMENT]) ?? DEFAULT_CL_ENTITLEMENT;
  const today = new Date();

  const pay: PaySettings = {
    basicPay: Math.max(0, basicPay),
    payLevel: payLevel != null ? Math.round(payLevel) : null,
    daPercentOverride,
    taRateOverride,
    currentDaPercent: daPercentOn(today, daPercentOverride),
    officialDaPercentToday: officialDaPercentOn(today),
    currentTaRate: 0,
    clEntitlement,
    autoLeaveCredits: map[SETTING_KEYS.AUTO_LEAVE_CREDITS] !== "false",
    configured: basicPay > 0,
  };
  pay.currentTaRate = taRateOn(pay, today);
  return pay;
}

export async function requirePaySettings(userId: string): Promise<PaySettings> {
  const pay = await getPaySettings(userId);
  if (!pay.configured) {
    throw new Error("Set your Basic Pay and Pay Level in Settings first");
  }
  return pay;
}

/** Empty string values delete the setting so the default applies again. */
export async function upsertUserSettings(
  userId: string,
  entries: Record<string, string>,
) {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      value === ""
        ? prisma.userSetting.deleteMany({ where: { userId, key } })
        : prisma.userSetting.upsert({
            where: { userId_key: { userId, key } },
            create: { userId, key, value },
            update: { value },
          }),
    ),
  );
}
