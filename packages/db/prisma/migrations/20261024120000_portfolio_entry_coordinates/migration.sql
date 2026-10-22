-- AlterTable "ngo_portfolio_entries": coordinates so past work can be pinned on the map.
ALTER TABLE "ngo_portfolio_entries"
  ADD COLUMN "lat" DECIMAL(9,6),
  ADD COLUMN "lng" DECIMAL(9,6);
