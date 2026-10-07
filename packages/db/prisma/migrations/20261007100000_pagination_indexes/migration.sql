-- Composite indexes matching the ORDER BY of the paginated list endpoints, so a page is an
-- index range scan instead of a filter + sort over every row the owner has.

-- CreateIndex
CREATE INDEX "orders_nursery_id_created_at_idx" ON "orders"("nursery_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_reviews_user_id_created_at_idx" ON "order_reviews"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "donations_user_id_created_at_idx" ON "donations"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "follows_ngo_id_status_created_at_idx" ON "follows"("ngo_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "follows_nursery_id_status_created_at_idx" ON "follows"("nursery_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "planted_trees_ngo_id_planted_at_idx" ON "planted_trees"("ngo_id", "planted_at" DESC);
