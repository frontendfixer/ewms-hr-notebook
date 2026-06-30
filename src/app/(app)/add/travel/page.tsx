import { requireUserId } from "@/lib/auth-server";
import { getTaBaseAmount } from "@/lib/pay-settings";
import { TravelForm } from "@/components/flows/travel-form";

export default async function AddTravelPage() {
  const userId = await requireUserId();
  const taBaseAmount = await getTaBaseAmount(userId);
  return <TravelForm taBaseAmount={taBaseAmount} />;
}
