-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('C', 'F');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "preferredTemperatureUnit" "TemperatureUnit" NOT NULL DEFAULT 'C',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locationKey" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "country" CHAR(2) NOT NULL,
    "state" VARCHAR(160),
    "latitude" DECIMAL(7,4) NOT NULL,
    "longitude" DECIMAL(7,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locationKey" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "country" CHAR(2) NOT NULL,
    "state" VARCHAR(160),
    "latitude" DECIMAL(7,4) NOT NULL,
    "longitude" DECIMAL(7,4) NOT NULL,
    "searchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_id_idx" ON "Favorite"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_locationKey_key" ON "Favorite"("userId", "locationKey");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_searchedAt_id_idx" ON "SearchHistory"("userId", "searchedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SearchHistory_userId_locationKey_key" ON "SearchHistory"("userId", "locationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense in depth: Prisma does not express these CHECK constraints.
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_coordinates_check" CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180), ADD CONSTRAINT "Favorite_country_check" CHECK (country ~ '^[A-Z]{2}$');
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_coordinates_check" CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180), ADD CONSTRAINT "SearchHistory_country_check" CHECK (country ~ '^[A-Z]{2}$');
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized_check" CHECK (email = lower(btrim(email))), ADD CONSTRAINT "User_displayName_check" CHECK (length(btrim("displayName")) > 0);
ALTER TABLE "Session" ADD CONSTRAINT "Session_expiry_check" CHECK ("expiresAt" > "createdAt");
