-- Observations can now hang off an adoptable-tree listing directly, so every listing (including
-- standalone ones with no PlantedTree behind them) can carry status updates and check-ins without
-- creating PlantedTree rows that would change NGO survival stats, counts and reputation.
ALTER TABLE "tree_observations" ADD COLUMN "adoptable_tree_id" TEXT;

CREATE INDEX "tree_observations_adoptable_tree_id_created_at_idx" ON "tree_observations"("adoptable_tree_id", "created_at" DESC);

ALTER TABLE "tree_observations" ADD CONSTRAINT "tree_observations_adoptable_tree_id_fkey" FOREIGN KEY ("adoptable_tree_id") REFERENCES "adoptable_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
