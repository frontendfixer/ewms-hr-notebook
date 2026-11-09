import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Layouts and pages both check the session; cache() keeps it to one lookup per request.
export const getSession = cache(async () => {
  // Page loads only read the session. Renewing it (database expiry AND cookie)
  // is the keep-alive route's job: a Server Component can't write the cookie, so
  // refreshing here would move the database expiry without the cookie and leave
  // the browser holding a cookie that dies on the old date.
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableRefresh: true },
  });
  return session;
});

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}

export async function ensureProfile(userId: string) {
  // upsert, not find-then-create: the layout and page can both run this on a
  // user's first visit, and the second create would hit the userId unique key.
  return prisma.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
