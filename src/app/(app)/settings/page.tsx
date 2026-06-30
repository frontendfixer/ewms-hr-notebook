import { requireUserId } from "@/lib/auth-server";
import { getPaySettings } from "@/lib/pay-settings";
import { getUserSetting } from "@/lib/user-settings";
import { DEFAULT_CR_EXPIRY_DAYS, SETTING_KEYS } from "@/lib/design-tokens";
import { PaySettingsForm } from "@/components/settings/pay-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const pay = await getPaySettings(userId);
  const crExpiry = parseInt(
    await getUserSetting(
      userId,
      SETTING_KEYS.CR_EXPIRY_DAYS,
      String(DEFAULT_CR_EXPIRY_DAYS),
    ),
    10,
  );

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Follows your device by default. Choose Light or Dark to override.
          </p>
          <ThemeToggle />
        </CardContent>
      </Card>
      <PaySettingsForm
        basicPay={pay.basicPay}
        daPercent={pay.daPercent}
        taBaseAmount={pay.taBaseAmount}
        crExpiryDays={crExpiry || DEFAULT_CR_EXPIRY_DAYS}
      />
    </div>
  );
}
