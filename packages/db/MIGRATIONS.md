# Database migrations

Prisma migrations live in `prisma/migrations/` (one folder per migration, applied in name order) and are tracked in git. `prisma/migration_lock.toml` pins the provider (PostgreSQL). Never edit or rename a migration that has already been pushed — add a new one instead.

## Setting up on another laptop / a fresh database

1. Install dependencies from the repo root: `npm install` (this also runs `prisma generate`).
2. Copy `packages/db/.env.example` to `packages/db/.env` and set `DATABASE_URL` to the new Postgres database (create the empty database first).
3. Apply every migration below, in order, to that database:

   ```
   cd packages/db
   npm run prisma:migrate:deploy
   ```

   Use `prisma:migrate:deploy` on a new/other database. Use `prisma:migrate` (`migrate dev`) only on your own dev database when you are creating a new migration.
4. Optional starter data: `npm run prisma:seed`.
5. Check state any time with `npx prisma migrate status`.

## Adding a new migration

1. Edit `prisma/schema.prisma`.
2. `cd packages/db && npm run prisma:migrate -- --name short_description`.
3. Add a row to the table below, then commit the new migration folder, `schema.prisma` and this file together and push to master.

## Applied migrations (oldest first)

| # | Migration folder |
|---|---|
| 1 | `20260702072417_init` |
| 2 | `20260702174534_add_analytics_enabled_and_device_info_usage` |
| 3 | `20260702181035_add_forest_decorations` |
| 4 | `20260703072054_add_dev_password_plain` |
| 5 | `20260703140416_decoration_scale_rotation_and_stories` |
| 6 | `20260704070812_add_decoration_categories` |
| 7 | `20260704084327_decoration_stretch` |
| 8 | `20260704144759_decoration_path_drop_stretch` |
| 9 | `20260816184339_add_ngo_drives_adoptions_donations` |
| 10 | `20260819162443_ngo_suspend_and_audit_log` |
| 11 | `20260821133842_ngo_follow_updates_staff_survival` |
| 12 | `20260821171913_drive_location_transport_plants` |
| 13 | `20260823145556_add_ngo_streak_achievements` |
| 14 | `20260824120000_social_layer_posts_follows_moderation` |
| 15 | `20260825110631_unify_schema_roles_competitions_content` |
| 16 | `20260825110939_competition_entries_count` |
| 17 | `20260825112241_add_legacy_tree_content` |
| 18 | `20260825112323_add_leaderboard_entry_content` |
| 19 | `20260825182721_add_group_role_and_models` |
| 20 | `20260826072655_add_nursery_corporate_group_gamification` |
| 21 | `20260826072855_add_nursery_corporate_approval_fields` |
| 22 | `20260826095442_group_profile_parity` |
| 23 | `20260826171057_nursery_pages` |
| 24 | `20260827124726_add_marketplace_cart_orders_delivery_reviews_wishlist` |
| 25 | `20260827124956_add_order_notification_types` |
| 26 | `20260827125440_add_order_stock_ledger_reasons` |
| 27 | `20260827134147_batch1_nursery_review_stock_delivery_fields` |
| 28 | `20260827134515_add_wishlist_back_in_stock_notification` |
| 29 | `20260827140350_notification_actor_nursery` |
| 30 | `20260827192805_nursery_social_layer_posts_stories_follow` |
| 31 | `20260904174556_add_forest_state` |
| 32 | `20260905185334_add_approved_planting_location` |
| 33 | `20260907120611_add_account_blocking_and_review_fields` |
| 34 | `20260908091456_add_user_bio_and_story_likes` |
| 35 | `20260910102206_add_pinned_time_theme` |
| 36 | `20260910115422_add_scheduled_notification_types` |
| 37 | `20260910181505_add_friend_request_notification_types` |
| 38 | `20260911112321_add_city_model` |
| 39 | `20260911185855_nursery_module_extension_phase1` |
| 40 | `20260911214252_add_order_platform_fee` |
| 41 | `20260913162737_add_delivery_partner_role_and_tracking` |
| 42 | `20260913192922_add_delivery_tracking_started_at` |
| 43 | `20260913210815_add_nursery_profile_line1` |
| 44 | `20260915091211_add_portfolio_likes` |
| 45 | `20260915100240_nursery_signup_details` |
| 46 | `20260915104143_user_phone_unique` |
| 47 | `20260915144800_add_bulk_requirement_fulfilled_ledger_reason` |
| 48 | `20260915170014_nursery_reputation_streaks` |
| 49 | `20260916045824_add_ngo_verification_kyc_fields` |
| 50 | `20260917123016_drive_rsvp_attendance_hours` |
| 51 | `20260917124301_ngo_reputation` |
| 52 | `20260917125543_ngo_notification_types` |
| 53 | `20260917130109_donation_receipt_number` |
| 54 | `20260922050524_portfolio_entry_linked_post` |
| 55 | `20260922102011_plantation_zones` |
| 56 | `20260923101804_nullable_donation_sponsorship_payment_intent` |
| 57 | `20260926120000_fix_real_world_workflow_discrepancies` |
| 58 | `20260928051126_add_bulk_requirement_deadline_passed_notification` |
| 59 | `20260929121910_add_follow_declined_and_adoptable_tree_removed_notifications` |
| 60 | `20261001043329_add_user_personalization_fields` |
| 61 | `20261001060840_planting_space_multi_select` |
| 62 | `20261005150000_tree_identity_and_observations` |
| 63 | `20261005150100_tree_identity_backfill_constraints` |
| 64 | `20261006100000_community_update_review` |
| 65 | `20261007100000_pagination_indexes` |
| 66 | `20261009100000_daily_games` |
| 67 | `20261009150000_more_daily_games` |
| 68 | `20261009200000_daily_lessons` |
| 69 | `20261010100000_lesson_hero_image` |
| 70 | `20261012100000_user_private_species` |
| 71 | `20261012200000_adoptable_tree_observations` |
| 72 | `20261012210000_adoption_release_cleanup` |
| 73 | `20261013100000_drive_rsvp_details` |
| 74 | `20261013110000_drive_rsvp_cancel_reason` |
| 75 | `20261013120000_drive_cancel_reason` |
| 76 | `20261013130000_campaign_category_deadline` |
| 77 | `20261013140000_donation_anonymous_message_pan` |
| 78 | `20261014100000_profile_photo_privacy` |
| 79 | `20261014110000_ambient_mode_default_on` |
| 80 | `20261014120000_block_nursery` |
| 81 | `20261015120000_order_customer_note` |
| 82 | `20261015130000_order_cancellation_fee` |
