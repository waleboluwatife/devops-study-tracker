-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'LATE', 'CANT');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "meetingMinutes" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "meetingTime" TEXT NOT NULL DEFAULT '19:00';

-- AlterTable
ALTER TABLE "WeeklyScore" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "roundMemberId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRsvp" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roundMemberId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "recordingUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nudge" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cert" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "week" INTEGER,
    "examDate" DATE,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Cert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockScore" (
    "id" TEXT NOT NULL,
    "certId" TEXT NOT NULL,
    "roundMemberId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_roundMemberId_endedAt_idx" ON "FocusSession"("roundMemberId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRsvp_roundMemberId_week_key" ON "MeetingRsvp"("roundMemberId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_roundId_week_key" ON "Meeting"("roundId", "week");

-- CreateIndex
CREATE INDEX "Nudge_toId_createdAt_idx" ON "Nudge"("toId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_roundId_createdAt_idx" ON "Activity"("roundId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cert_groupId_name_key" ON "Cert"("groupId", "name");

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_roundMemberId_fkey" FOREIGN KEY ("roundMemberId") REFERENCES "RoundMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRsvp" ADD CONSTRAINT "MeetingRsvp_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRsvp" ADD CONSTRAINT "MeetingRsvp_roundMemberId_fkey" FOREIGN KEY ("roundMemberId") REFERENCES "RoundMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "RoundMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "RoundMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cert" ADD CONSTRAINT "Cert_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockScore" ADD CONSTRAINT "MockScore_certId_fkey" FOREIGN KEY ("certId") REFERENCES "Cert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockScore" ADD CONSTRAINT "MockScore_roundMemberId_fkey" FOREIGN KEY ("roundMemberId") REFERENCES "RoundMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
