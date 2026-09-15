-- AlterTable
ALTER TABLE "ngo_portfolio_entries" ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ngo_portfolio_likes" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngo_portfolio_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ngo_portfolio_likes_entry_id_idx" ON "ngo_portfolio_likes"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "ngo_portfolio_likes_entry_id_user_id_key" ON "ngo_portfolio_likes"("entry_id", "user_id");

-- AddForeignKey
ALTER TABLE "ngo_portfolio_likes" ADD CONSTRAINT "ngo_portfolio_likes_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "ngo_portfolio_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngo_portfolio_likes" ADD CONSTRAINT "ngo_portfolio_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
