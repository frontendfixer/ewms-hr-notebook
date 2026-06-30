import { prisma } from "@/lib/db";
import { SETTING_KEYS, DEFAULT_TA_BASE_AMOUNT } from "@/lib/design-tokens";
import { dearnessAllowanceFromPercent } from "@/lib/calculations/allowances";
import { getUserSetting } from "@/lib/user-settings";

export type PaySettings = {
  basicPay: number;
  daPercent: number;
  dearnessAllowance: number;
  taBaseAmount: number;
  configured: boolean;
};

export async function getTaBaseAmount(userId: string): Promise<number> {
  const val = parseFloat(
    await getUserSetting(
      userId,
      SETTING_KEYS.TA_BASE_AMOUNT,
      String(DEFAULT_TA_BASE_AMOUNT),
    ),
  );
  return Number.isFinite(val) && val > 0 ? val : DEFAULT_TA_BASE_AMOUNT;
}

export async function getPaySettings(userId: string): Promise<PaySettings> {
  const basicPay = parseFloat(
    await getUserSetting(userId, SETTING_KEYS.BASIC_PAY, "0"),
  );
  const daPercent = parseFloat(
    await getUserSetting(userId, SETTING_KEYS.DA_PERCENT, "0"),
  );
  const safeBasicPay = Number.isFinite(basicPay) ? basicPay : 0;
  const safeDaPercent = Number.isFinite(daPercent) ? daPercent : 0;
  const taBaseAmount = await getTaBaseAmount(userId);
  return {
    basicPay: safeBasicPay,
    daPercent: safeDaPercent,
    dearnessAllowance: dearnessAllowanceFromPercent(safeBasicPay, safeDaPercent),
    taBaseAmount,
    configured: safeBasicPay > 0,
  };
}

export async function requirePaySettings(userId: string): Promise<PaySettings> {
  const pay = await getPaySettings(userId);
  if (!pay.configured) {
    throw new Error("Set your Basic Pay and DA % in Settings first");
  }
  return pay;
}

export async function upsertUserSettings(
  userId: string,
  entries: Record<string, string>,
) {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.userSetting.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value },
        update: { value },
      }),
    ),
  );
}
