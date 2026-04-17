-- CreateTable (schema já previa DismissedAlert; faltava migration)
CREATE TABLE "dismissed_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_alerts_userId_alertId_key" ON "dismissed_alerts"("userId", "alertId");

-- CreateIndex
CREATE INDEX "dismissed_alerts_userId_idx" ON "dismissed_alerts"("userId");

-- AddForeignKey
ALTER TABLE "dismissed_alerts" ADD CONSTRAINT "dismissed_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
