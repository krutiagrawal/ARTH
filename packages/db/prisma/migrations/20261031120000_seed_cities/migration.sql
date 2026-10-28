-- The deploy runs migrations but never the seed script, so production had an empty "cities" table and the
-- city picker showed no options. Insert the city list here so every environment gets it. Idempotent: existing
-- rows keep their id and only have launch status and ordering refreshed (matches seedCities in prisma/seed.ts).
INSERT INTO "cities" ("id", "name", "is_launched", "sort_order", "updated_at")
VALUES
  (md5(random()::text || 'Pune')::uuid::text, 'Pune', true, 0, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Mumbai')::uuid::text, 'Mumbai', false, 1, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Delhi')::uuid::text, 'Delhi', false, 2, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Bangalore')::uuid::text, 'Bangalore', false, 3, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Hyderabad')::uuid::text, 'Hyderabad', false, 4, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Chennai')::uuid::text, 'Chennai', false, 5, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Kolkata')::uuid::text, 'Kolkata', false, 6, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Ahmedabad')::uuid::text, 'Ahmedabad', false, 7, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Jaipur')::uuid::text, 'Jaipur', false, 8, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Surat')::uuid::text, 'Surat', false, 9, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Lucknow')::uuid::text, 'Lucknow', false, 10, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Nagpur')::uuid::text, 'Nagpur', false, 11, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Indore')::uuid::text, 'Indore', false, 12, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Thane')::uuid::text, 'Thane', false, 13, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Bhopal')::uuid::text, 'Bhopal', false, 14, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Visakhapatnam')::uuid::text, 'Visakhapatnam', false, 15, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Vadodara')::uuid::text, 'Vadodara', false, 16, CURRENT_TIMESTAMP),
  (md5(random()::text || 'Nashik')::uuid::text, 'Nashik', false, 17, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
  SET "is_launched" = EXCLUDED."is_launched",
      "sort_order" = EXCLUDED."sort_order",
      "updated_at" = CURRENT_TIMESTAMP;
