-- Nursery scale-readiness: composite indexes for the hot nursery list/aggregate queries.

CREATE INDEX "sapling_stock_nursery_id_archived_at_idx" ON "sapling_stock"("nursery_id", "archived_at");
CREATE INDEX "sapling_stock_nursery_id_created_at_idx" ON "sapling_stock"("nursery_id", "created_at" DESC);
CREATE INDEX "sapling_stock_nursery_id_species_id_idx" ON "sapling_stock"("nursery_id", "species_id");

CREATE INDEX "sapling_reservations_nursery_id_status_created_at_idx" ON "sapling_reservations"("nursery_id", "status", "created_at" DESC);

CREATE INDEX "sapling_stock_ledger_nursery_id_reason_created_at_idx" ON "sapling_stock_ledger"("nursery_id", "reason", "created_at" DESC);

CREATE INDEX "orders_nursery_id_status_out_for_delivery_at_idx" ON "orders"("nursery_id", "status", "out_for_delivery_at");
CREATE INDEX "orders_nursery_id_status_delivered_at_idx" ON "orders"("nursery_id", "status", "delivered_at");
CREATE INDEX "orders_nursery_id_user_id_idx" ON "orders"("nursery_id", "user_id");
CREATE INDEX "orders_nursery_id_scheduled_for_idx" ON "orders"("nursery_id", "scheduled_for");

CREATE INDEX "order_reviews_nursery_id_created_at_idx" ON "order_reviews"("nursery_id", "created_at" DESC);

CREATE INDEX "arth_sapling_units_nursery_id_status_idx" ON "arth_sapling_units"("nursery_id", "status");
CREATE INDEX "arth_sapling_units_nursery_id_supply_date_idx" ON "arth_sapling_units"("nursery_id", "supply_date");

CREATE INDEX "trees_nursery_id_ai_verification_status_idx" ON "trees"("nursery_id", "ai_verification_status");

CREATE INDEX "bulk_requirements_status_needed_by_date_idx" ON "bulk_requirements"("status", "needed_by_date");
CREATE INDEX "bulk_requirements_status_created_at_idx" ON "bulk_requirements"("status", "created_at" DESC);

CREATE INDEX "bulk_requirement_responses_nursery_id_created_at_idx" ON "bulk_requirement_responses"("nursery_id", "created_at" DESC);

CREATE INDEX "notifications_user_id_type_created_at_idx" ON "notifications"("user_id", "type", "created_at" DESC);

CREATE INDEX "activity_feed_user_id_created_at_idx" ON "activity_feed"("user_id", "created_at" DESC);

-- Trigram indexes so the case-insensitive `contains` searches (orders / stock / followers) stop
-- sequentially scanning. Prisma's @@index can't express these, so they live only in SQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "sapling_stock_species_trgm_idx" ON "sapling_stock" USING gin ("species" gin_trgm_ops);
CREATE INDEX "order_items_species_trgm_idx" ON "order_items" USING gin ("species" gin_trgm_ops);
CREATE INDEX "users_name_trgm_idx" ON "users" USING gin ("name" gin_trgm_ops);
CREATE INDEX "users_handle_trgm_idx" ON "users" USING gin ("handle" gin_trgm_ops);
