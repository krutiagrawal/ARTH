-- CreateIndex: NGO donations list (campaign + status, newest first).
CREATE INDEX "donations_campaign_id_status_created_at_idx" ON "donations"("campaign_id", "status", "created_at" DESC);
