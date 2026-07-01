-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkEventType" AS ENUM ('HOLIDAY_WORK_RECORDED', 'CR_CREDIT_ISSUED', 'CR_CONSUMED', 'CR_EXPIRED', 'LEAVE_RECORDED', 'LEAVE_LEDGER_ADJUSTMENT', 'LEAVE_CONVERSION', 'NIGHT_DUTY_RECORDED', 'TRAVEL_RECORDED', 'BILL_SUBMITTED', 'CLAIM_PASSED', 'PAYMENT_RECEIVED', 'STATUS_CHANGED', 'ATTACHMENT_LINKED', 'NOTE_AMENDED', 'EVENT_VOIDED');

-- CreateEnum
CREATE TYPE "EventDomain" AS ENUM ('CR', 'LEAVE', 'NIGHT_DUTY', 'TRAVEL', 'META');

-- CreateEnum
CREATE TYPE "LedgerAccount" AS ENUM ('CR_CREDIT', 'LEAVE_CL', 'LEAVE_LAP', 'LEAVE_LHAP', 'LEAVE_COMMUTED', 'LEAVE_SPECIAL_CL');

-- CreateEnum
CREATE TYPE "EmployeeCategory" AS ENUM ('GROUP_C', 'GROUP_D', 'SUPERVISORY', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CR_EXPIRY', 'PENDING_BILL', 'PENDING_PAYMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'BILL_SUBMITTED', 'PASSED', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('LAP', 'LHAP', 'COMMUTED', 'LND', 'EOL', 'STUDY', 'WRIIL', 'PATERNITY', 'MATERNITY', 'CCL', 'CHILD_ADOPTION', 'CL', 'SPECIAL_CL', 'JOINING_TIME');

-- CreateEnum
CREATE TYPE "LeaveDuration" AS ENUM ('FULL', 'FIRST_HALF', 'SECOND_HALF');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personnelNo" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "category" "EmployeeCategory" NOT NULL DEFAULT 'GROUP_C',
    "joinDate" TIMESTAMP(3),
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holiday" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "WorkEventType" NOT NULL,
    "domain" "EventDomain" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "remarks" TEXT,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT,
    "parentEventId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidingEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "account" "LedgerAccount" NOT NULL,
    "subAccountKey" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_setting_userId_key_key" ON "user_setting"("userId", "key");

-- CreateIndex
CREATE INDEX "public_holiday_userId_date_idx" ON "public_holiday"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "public_holiday_userId_date_key" ON "public_holiday"("userId", "date");

-- CreateIndex
CREATE INDEX "work_event_userId_occurredAt_idx" ON "work_event"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "work_event_userId_domain_occurredAt_idx" ON "work_event"("userId", "domain", "occurredAt");

-- CreateIndex
CREATE INDEX "work_event_userId_eventType_idx" ON "work_event"("userId", "eventType");

-- CreateIndex
CREATE INDEX "work_event_userId_correlationId_idx" ON "work_event"("userId", "correlationId");

-- CreateIndex
CREATE INDEX "ledger_entry_userId_account_occurredAt_idx" ON "ledger_entry"("userId", "account", "occurredAt");

-- CreateIndex
CREATE INDEX "ledger_entry_userId_account_subAccountKey_idx" ON "ledger_entry"("userId", "account", "subAccountKey");

-- CreateIndex
CREATE INDEX "ledger_entry_userId_expiresAt_idx" ON "ledger_entry"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "attachment_userId_eventId_idx" ON "attachment"("userId", "eventId");

-- CreateIndex
CREATE INDEX "notification_userId_read_idx" ON "notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_holiday" ADD CONSTRAINT "public_holiday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_event" ADD CONSTRAINT "work_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_event" ADD CONSTRAINT "work_event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "work_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "work_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "work_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
