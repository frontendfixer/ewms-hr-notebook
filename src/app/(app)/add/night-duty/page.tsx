import { requireUserId } from "@/lib/auth-server";
import { getPaySettings } from "@/lib/pay-settings";
import { NightDutyForm } from "@/components/flows/night-duty-form";

export default async function AddNightDutyPage() {
  const userId = await requireUserId();
  const pay = await getPaySettings(userId);
  return (
    <NightDutyForm basicPay={pay.basicPay} daPercent={pay.daPercent} />
  );
}
