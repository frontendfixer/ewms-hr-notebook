import { requireUserId } from "@/lib/auth-server";
import { getPaySettings } from "@/lib/pay-settings";
import { AddCrForm } from "@/components/flows/add-cr-form";

export default async function AddCrPage() {
  await requireUserId();
  return <AddCrForm />;
}
