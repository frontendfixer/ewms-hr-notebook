import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const parsed = new URL(url);
  const allowPublicKeyRetrieval =
    parsed.searchParams.get("allowPublicKeyRetrieval") !== "false";
  return new PrismaMariaDb({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    allowPublicKeyRetrieval,
  });
}

/** Default interactive tx timeout is 5s; remote MariaDB often needs more headroom. */
export const INTERACTIVE_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    transactionOptions: INTERACTIVE_TX_OPTIONS,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
