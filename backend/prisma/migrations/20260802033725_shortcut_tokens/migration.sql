-- CreateTable
CREATE TABLE "shortcut_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortcut_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortcut_tokens_tokenHash_key" ON "shortcut_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "shortcut_tokens_userId_idx" ON "shortcut_tokens"("userId");

-- AddForeignKey
ALTER TABLE "shortcut_tokens" ADD CONSTRAINT "shortcut_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortcut_tokens" ADD CONSTRAINT "shortcut_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
