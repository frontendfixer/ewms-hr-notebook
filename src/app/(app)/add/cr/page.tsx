import { requireUserId } from "@/lib/auth-server";
import { AddCrForm } from "@/components/flows/add-cr-form";

export default async function AddCrPage() {
  await requireUserId();
  return <AddCrForm />;
}
