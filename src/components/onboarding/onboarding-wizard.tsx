"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { completeOnboarding, updateProfile } from "@/actions/events";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";

type ProfileDraft = {
  designation: string;
  department: string;
  personnelNo: string;
};

const emptyProfileDraft: ProfileDraft = {
  designation: "",
  department: "",
  personnelNo: "",
};

export function OnboardingWizard({
  userName,
  userImage,
}: {
  userName: string;
  userImage?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const router = useRouter();

  const steps = ["Welcome", "Profile", "Leave Balances", "Done"];

  const finish = async (formData: FormData) => {
    try {
      const merged = new FormData();
      merged.set("name", userName);
      merged.set("designation", profileDraft.designation);
      merged.set("department", profileDraft.department);
      merged.set("personnelNo", profileDraft.personnelNo);
      merged.set("clBalance", formData.get("clBalance")?.toString() ?? "8");
      merged.set("lapBalance", formData.get("lapBalance")?.toString() ?? "30");
      merged.set("lhapBalance", formData.get("lhapBalance")?.toString() ?? "20");

      await updateProfile(merged);
      await completeOnboarding(merged);
      toast.success("Setup complete!");
      router.push("/home");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    }
  };

  const saveProfileDraft = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    setProfileDraft({
      designation: String(fd.get("designation") ?? ""),
      department: String(fd.get("department") ?? ""),
      personnelNo: String(fd.get("personnelNo") ?? ""),
    });
    setStep(2);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{steps[step]}</CardTitle>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === 0 && (
          <div className="flex flex-col items-center gap-4 text-center">
            <UserAvatar name={userName} image={userImage} size="xl" />
            <p>Welcome, {userName}! Let&apos;s set up your personal HR notebook.</p>
            <Button onClick={() => setStep(1)}>Get Started</Button>
          </div>
        )}

        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfileDraft(e.currentTarget);
            }}
          >
            <div>
              <Label>Designation</Label>
              <Input
                name="designation"
                placeholder="e.g. Technician"
                defaultValue={profileDraft.designation}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                name="department"
                placeholder="e.g. Electrical"
                defaultValue={profileDraft.department}
              />
            </div>
            <div>
              <Label>Employment No.</Label>
              <Input
                name="personnelNo"
                defaultValue={profileDraft.personnelNo}
              />
            </div>
            <Button type="submit">Next</Button>
          </form>
        )}

        {step === 2 && (
          <form action={finish} className="space-y-4">
            <div>
              <Label>CL balance (days)</Label>
              <Input name="clBalance" type="number" defaultValue={8} />
            </div>
            <div>
              <Label>LAP balance (days)</Label>
              <Input name="lapBalance" type="number" defaultValue={30} />
            </div>
            <div>
              <Label>LHAP balance (days)</Label>
              <Input name="lhapBalance" type="number" defaultValue={20} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit">Complete Setup</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
