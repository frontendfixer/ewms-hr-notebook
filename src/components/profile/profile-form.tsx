"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";

type ProfileFormProps = {
  name: string;
  personnelNo: string;
  designation: string;
  department: string;
};

export function ProfileForm({
  name,
  personnelNo,
  designation,
  department,
}: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          if (toastResult(await updateProfile(formData), "Profile saved")) {
            router.refresh();
          }
        });
      }}
    >
      <div>
        <Label htmlFor="profile-name">Name</Label>
        <Input id="profile-name" name="name" defaultValue={name} required />
      </div>
      <div>
        <Label htmlFor="profile-employment-no">Employment No.</Label>
        <Input
          id="profile-employment-no"
          name="personnelNo"
          defaultValue={personnelNo}
        />
      </div>
      <div>
        <Label htmlFor="profile-designation">Designation</Label>
        <Input
          id="profile-designation"
          name="designation"
          defaultValue={designation}
        />
      </div>
      <div>
        <Label htmlFor="profile-department">Department</Label>
        <Input
          id="profile-department"
          name="department"
          defaultValue={department}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
