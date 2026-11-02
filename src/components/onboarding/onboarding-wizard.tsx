"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeOnboarding } from "@/actions/events";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { toastResult } from "@/lib/action-toast";

type Draft = {
  designation: string;
  department: string;
  personnelNo: string;
  payLevel: string;
  basicPay: string;
};

const emptyDraft: Draft = {
  designation: "",
  department: "",
  personnelNo: "",
  payLevel: "",
  basicPay: "",
};

export function OnboardingWizard({
  userName,
  userImage,
}: {
  userName: string;
  userImage?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const router = useRouter();

  const steps = ["Welcome", "Profile", "Pay", "Leave balances"];

  const finish = async (formData: FormData) => {
    const merged = new FormData();
    merged.set("name", userName);
    for (const [key, value] of Object.entries(draft)) merged.set(key, value);
    for (const key of ["clBalance", "lapBalance", "lhapBalance"]) {
      merged.set(key, formData.get(key)?.toString() ?? "0");
    }
    if (toastResult(await completeOnboarding(merged), "Setup complete!")) {
      router.push("/home");
    }
  };

  const saveStep = (form: HTMLFormElement, next: number) => {
    const fd = new FormData(form);
    setDraft((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(prev) as (keyof Draft)[]) {
        const value = fd.get(key);
        if (value != null) updated[key] = String(value);
      }
      return updated;
    });
    setStep(next);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{steps[step]}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
        <div className="flex gap-1" aria-hidden>
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
            <p>
              Welcome, {userName}! Let&apos;s set up your personal notebook for
              leave, CR, night duty and travel claims.
            </p>
            <Button onClick={() => setStep(1)}>Get Started</Button>
          </div>
        )}

        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveStep(e.currentTarget, 2);
            }}
          >
            <div>
              <Label htmlFor="ob-designation">Designation</Label>
              <Input
                id="ob-designation"
                name="designation"
                placeholder="e.g. Technician-I"
                defaultValue={draft.designation}
              />
            </div>
            <div>
              <Label htmlFor="ob-department">Department</Label>
              <Input
                id="ob-department"
                name="department"
                placeholder="e.g. Electrical"
                defaultValue={draft.department}
              />
            </div>
            <div>
              <Label htmlFor="ob-personnel">Employee No. (HRMS)</Label>
              <Input
                id="ob-personnel"
                name="personnelNo"
                defaultValue={draft.personnelNo}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveStep(e.currentTarget, 3);
            }}
          >
            <p className="text-sm text-muted-foreground">
              Used to work out night duty allowance and daily allowance on tour.
              You can change these later in Settings.
            </p>
            <div>
              <Label htmlFor="ob-level">Pay level (7th CPC)</Label>
              <Input
                id="ob-level"
                name="payLevel"
                type="number"
                inputMode="numeric"
                min={1}
                max={18}
                placeholder="e.g. 6"
                defaultValue={draft.payLevel}
              />
            </div>
            <div>
              <Label htmlFor="ob-basic">Basic pay (₹ / month)</Label>
              <Input
                id="ob-basic"
                name="basicPay"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="As on your latest pay slip"
                defaultValue={draft.basicPay}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form action={finish} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your balances as on today from HRMS / your leave account.
              New credits are added automatically each 1 Jan and 1 Jul.
            </p>
            <div>
              <Label htmlFor="ob-cl">CL balance (days)</Label>
              <Input id="ob-cl" name="clBalance" type="number" min={0} step={0.5} defaultValue={8} required />
            </div>
            <div>
              <Label htmlFor="ob-lap">LAP balance (days)</Label>
              <Input id="ob-lap" name="lapBalance" type="number" min={0} max={315} step={0.5} required />
            </div>
            <div>
              <Label htmlFor="ob-lhap">LHAP balance (days)</Label>
              <Input id="ob-lhap" name="lhapBalance" type="number" min={0} step={0.5} required />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <SubmitButton pendingLabel="Finishing…">Complete Setup</SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
