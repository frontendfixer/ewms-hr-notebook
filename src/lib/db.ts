import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  neonConfig.webSocketConstructor = ws;
  return new PrismaNeon({ connectionString: url });
}

/** Remote serverless Postgres often needs more headroom than the default 5s interactive tx timeout. */
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
