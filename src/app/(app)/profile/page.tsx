import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <UserAvatar name={user.name} image={user.image} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name}
            personnelNo={user.profile?.personnelNo ?? ""}
            designation={user.profile?.designation ?? ""}
            department={user.profile?.department ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
