-- AlterTable
ALTER TABLE "ngo_portfolio_entries" ADD COLUMN     "post_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ngo_portfolio_entries_post_id_key" ON "ngo_portfolio_entries"("post_id");

-- AddForeignKey
ALTER TABLE "ngo_portfolio_entries" ADD CONSTRAINT "ngo_portfolio_entries_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

