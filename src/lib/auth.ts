import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { SESSION_LIFETIME_SECONDS, SESSION_REFRESH_SECONDS } from "@/lib/session-policy";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Ask Google for a refresh token, so the server can re-check later that the
      // user still allows this app (see src/lib/session-health-server.ts). No
      // `prompt` override: returning users are signed back in without a screen.
      accessType: "offline",
    },
  },
  account: {
    // Google's tokens sit in the database; encrypt them with the auth secret.
    encryptOAuthTokens: true,
  },
  user: {
    additionalFields: {},
  },
  session: {
    // Long, sliding sessions: every refresh (at most daily) pushes the expiry out
    // again, and the cookie with it, so someone who uses the app is never signed
    // out. The refresh runs from the keep-alive call (src/components/auth/
    // session-keep-alive.tsx); server-rendered pages can't update cookies.
    expiresIn: SESSION_LIFETIME_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
  },
  advanced: {
    // Production runs behind Cloudflare → Railway. Without these the client
    // IP is unknown and every visitor shares one rate-limit bucket.
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
    },
  },
  // Failed OAuth callbacks (expired state, cancelled sign-in) land on our login
  // screen, not Better Auth's built-in error page, which is a dead end in an
  // installed app.
  onAPIError: { errorURL: "/login" },
  // Must stay last: lets server actions and route handlers set the auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
