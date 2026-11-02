import { requireUserId } from "@/lib/auth-server";
import { getPaySettings } from "@/lib/pay-settings";
import { TravelForm } from "@/components/flows/travel-form";

export default async function AddTravelPage() {
  const userId = await requireUserId();
  const pay = await getPaySettings(userId);
  return (
    <TravelForm
      payLevel={pay.payLevel}
      daPercentOverride={pay.daPercentOverride}
      taRateOverride={pay.taRateOverride}
    />
  );
}
