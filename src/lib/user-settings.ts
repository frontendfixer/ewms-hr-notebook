import { prisma } from "@/lib/db";

export async function getUserSetting(
  userId: string,
  key: string,
  defaultValue: string,
): Promise<string> {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key } },
  });
  return setting?.value ?? defaultValue;
}
