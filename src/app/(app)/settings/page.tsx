import { requireUserId } from "@/lib/auth-server";
import { getPaySettings } from "@/lib/pay-settings";
import { getCrExpiryDays } from "@/lib/services/event-service";
import { PaySettingsForm } from "@/components/settings/pay-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [pay, crExpiryDays] = await Promise.all([
    getPaySettings(userId),
    getCrExpiryDays(userId),
  ]);

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <PaySettingsForm
        basicPay={pay.basicPay}
        payLevel={pay.payLevel}
        daPercentOverride={pay.daPercentOverride}
        officialDaPercent={pay.officialDaPercentToday}
        taRateOverride={pay.taRateOverride}
        crExpiryDays={crExpiryDays}
        clEntitlement={pay.clEntitlement}
        autoLeaveCredits={pay.autoLeaveCredits}
      />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Sign out of your account on this device.
          </p>
          <SignOutButton fullWidth />
        </CardContent>
      </Card>
    </div>
  );
}
