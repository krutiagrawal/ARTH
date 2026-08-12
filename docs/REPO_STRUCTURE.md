# ARTH repository structure (post-monorepo migration)

Generated after moving the mobile app, backend, and website into `apps/mobile`, `services/api`, and `apps/web` — see `docs/MIGRATION.md` for what moved from where and `docs/ARCHITECTURE.md` for the rules going forward. Use this to sanity-check the reorg: every real source file is listed; dependency/build/scaffold folders are collapsed to a single annotated line (file count in parens) since listing them adds noise, not information.

Collapsed on sight, wherever they appear: `node_modules/`, `dist/`, `.next/`, `.expo/`, `.cache/`, `.claude/`, `.git/` — plus two path-specific asset dumps: `apps/web/public/assets/homepage/` (864 homepage images) and `apps/web/.emergent/` (scaffold tool state from the site's original generator).

```
PLANT/
├── .claude/  (0 files — omitted)
├── .git/  (80 files — omitted)
├── apps/
│   ├── mobile/
│   │   ├── .expo/  (4 files — omitted)
│   │   ├── assets/
│   │   │   ├── characters/
│   │   │   │   ├── New Folder/
│   │   │   │   ├── night_sleepy_mascots.png
│   │   │   │   ├── ollie.png
│   │   │   │   ├── ollie_arm_left.png
│   │   │   │   ├── ollie_arm_right.png
│   │   │   │   ├── ollie_body.png
│   │   │   │   ├── ollie_head.png
│   │   │   │   ├── ollie_leg.png
│   │   │   │   ├── ollie_mouth_open.png
│   │   │   │   ├── Roots.png
│   │   │   │   ├── roots_body.png
│   │   │   │   ├── roots_head.png
│   │   │   │   ├── roots_legs.png
│   │   │   │   ├── roots_mouth_open.png
│   │   │   │   ├── roots_sheet.png
│   │   │   │   ├── roots_tail.png
│   │   │   │   ├── sit_to_type.glb
│   │   │   │   └── winding_up_mascots.png
│   │   │   ├── illustrations/
│   │   │   │   ├── afternoon.png
│   │   │   │   ├── blue_hour.png
│   │   │   │   ├── dawn.png
│   │   │   │   ├── evening.png
│   │   │   │   ├── golden_hour.png
│   │   │   │   ├── late_night.png
│   │   │   │   ├── morning.png
│   │   │   │   └── night.png
│   │   │   ├── sounds/
│   │   │   │   ├── birds_ambient.mp3
│   │   │   │   ├── light_rain.mp3
│   │   │   │   ├── piano_ambient.mp3
│   │   │   │   └── woof_bark.mp3
│   │   │   ├── adaptive-icon.png
│   │   │   ├── favicon.png
│   │   │   ├── icon.png
│   │   │   ├── ollie and roots.json
│   │   │   ├── opening_image.png
│   │   │   └── splash.png
│   │   ├── dist/  (23 files — omitted)
│   │   ├── node_modules/  (39,746 files — omitted)
│   │   ├── references/
│   │   │   ├── daytimes/
│   │   │   │   ├── how_afternoon_should_look.png
│   │   │   │   ├── how_bluehour_should_look.png
│   │   │   │   ├── how_dawn_should_look.png
│   │   │   │   ├── how_evening_should_look.png
│   │   │   │   ├── how_goldenhour_should_look.png
│   │   │   │   ├── how_latenight_should_look.png
│   │   │   │   ├── how_morning_should_look.png
│   │   │   │   ├── how_night_should_look.png
│   │   │   │   ├── moods_afternoon.png
│   │   │   │   ├── moods_evening.png
│   │   │   │   ├── moods_morning.png
│   │   │   │   └── moods_night.png
│   │   │   ├── forest_references/
│   │   │   │   ├── WhatsApp Image 2026-07-04 at 1.01.50 PM (1).jpeg
│   │   │   │   ├── WhatsApp Image 2026-07-04 at 1.01.50 PM.jpeg
│   │   │   │   └── WhatsApp Image 2026-07-04 at 1.01.51 PM.jpeg
│   │   │   ├── logo.png
│   │   │   └── Screenshot 2026-07-02 131958.png
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── achievements.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── challenges.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── decorations.ts
│   │   │   │   ├── ecoFacts.ts
│   │   │   │   ├── feed.ts
│   │   │   │   ├── friends.ts
│   │   │   │   ├── leaderboard.ts
│   │   │   │   ├── missions.ts
│   │   │   │   ├── settings.ts
│   │   │   │   ├── species.ts
│   │   │   │   ├── stories.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── themes.ts
│   │   │   │   ├── tokenStorage.ts
│   │   │   │   ├── trees.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── weather.ts
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   │   ├── decorations/
│   │   │   │   │   │   ├── AnimalShapes.tsx
│   │   │   │   │   │   ├── BirdShapes.tsx
│   │   │   │   │   │   ├── CanopyShapes.tsx
│   │   │   │   │   │   ├── ForestFloorShapes.tsx
│   │   │   │   │   │   ├── FruitShapes.tsx
│   │   │   │   │   │   ├── MeadowShapes.tsx
│   │   │   │   │   │   ├── SkyShapes.tsx
│   │   │   │   │   │   ├── UnderstoryShapes.tsx
│   │   │   │   │   │   └── WaterShapes.tsx
│   │   │   │   │   ├── AmbientCreatures.tsx
│   │   │   │   │   ├── AnimatedButton.tsx
│   │   │   │   │   ├── EcoWidget.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   ├── FloatingParticles.tsx
│   │   │   │   │   ├── ForestHeroCanvas.tsx
│   │   │   │   │   ├── GlassCard.tsx
│   │   │   │   │   ├── Mascot.tsx
│   │   │   │   │   ├── MascotInteraction.tsx
│   │   │   │   │   ├── MuteButton.tsx
│   │   │   │   │   ├── PasswordInput.tsx
│   │   │   │   │   ├── ProgressRing.tsx
│   │   │   │   │   ├── Sheet.tsx
│   │   │   │   │   ├── StatDisplay.tsx
│   │   │   │   │   └── TreeCard.tsx
│   │   │   │   ├── forest/
│   │   │   │   │   ├── DecorationOverlay.tsx
│   │   │   │   │   ├── DecorationPickerSheet.tsx
│   │   │   │   │   └── StoryPreviewModal.tsx
│   │   │   │   ├── navigation/
│   │   │   │   │   └── BottomNav.tsx
│   │   │   │   └── stories/
│   │   │   │       ├── ForestGallery.tsx
│   │   │   │       ├── StoriesTray.tsx
│   │   │   │       └── StoryViewer.tsx
│   │   │   ├── constants/
│   │   │   │   ├── colors.ts
│   │   │   │   ├── decorationCatalog.ts
│   │   │   │   ├── forestLevels.ts
│   │   │   │   ├── forestThemePalettes.ts
│   │   │   │   ├── legalContent.ts
│   │   │   │   ├── theme.ts
│   │   │   │   └── typography.ts
│   │   │   ├── context/
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   ├── ReduceMotionContext.tsx
│   │   │   │   └── SoundContext.tsx
│   │   │   ├── data/
│   │   │   │   └── dummyData.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAnimations.ts
│   │   │   │   ├── useApiQueries.ts
│   │   │   │   ├── useDeviceWeather.ts
│   │   │   │   ├── useHaptics.ts
│   │   │   │   ├── useParticles.ts
│   │   │   │   ├── useReduceMotion.ts
│   │   │   │   ├── useSoundSystem.ts
│   │   │   │   └── useTimeTheme.ts
│   │   │   ├── navigation/
│   │   │   │   └── AppNavigator.tsx
│   │   │   ├── screens/
│   │   │   │   ├── ChangePasswordScreen.tsx
│   │   │   │   ├── CommunityScreen.tsx
│   │   │   │   ├── EditProfileScreen.tsx
│   │   │   │   ├── ForestScreen.tsx
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── MapScreen.tsx
│   │   │   │   ├── OnboardingScreen.tsx
│   │   │   │   ├── PlantTreeScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   ├── SessionsScreen.tsx
│   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   ├── SplashScreen.tsx
│   │   │   │   ├── StaticContentScreen.tsx
│   │   │   │   └── StreakProtectionScreen.tsx
│   │   │   ├── services/
│   │   │   │   └── weatherService.ts
│   │   │   └── utils/
│   │   │       ├── color.ts
│   │   │       ├── skiaTrees.ts
│   │   │       └── smoothPath.ts
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── app.json
│   │   ├── App.tsx
│   │   ├── babel.config.js
│   │   ├── eas.json
│   │   ├── global.css
│   │   ├── metro.config.js
│   │   ├── nativewind-env.d.ts
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── web/
│       ├── .claude/  (0 files — omitted)
│       ├── .emergent/  (9 files — omitted)
│       ├── .next/  (2,379 files — omitted)
│       ├── app/
│       │   ├── about/
│       │   │   ├── AboutClient.jsx
│       │   │   └── page.js
│       │   ├── adopt/
│       │   │   ├── AdoptClient.jsx
│       │   │   └── page.js
│       │   ├── api/
│       │   │   ├── adoptions/
│       │   │   │   └── route.js
│       │   │   ├── auth/
│       │   │   │   ├── login/
│       │   │   │   │   └── route.js
│       │   │   │   ├── logout/
│       │   │   │   │   └── route.js
│       │   │   │   ├── me/
│       │   │   │   │   └── route.js
│       │   │   │   └── register/
│       │   │   │       └── route.js
│       │   │   ├── planted-trees/
│       │   │   │   └── route.js
│       │   │   ├── pledges/
│       │   │   │   └── route.js
│       │   │   └── rsvps/
│       │   │       └── route.js
│       │   ├── blogs/
│       │   │   ├── [id]/
│       │   │   │   ├── BlogDetailClient.jsx
│       │   │   │   └── page.js
│       │   │   ├── BlogsClient.jsx
│       │   │   └── page.js
│       │   ├── competitions/
│       │   │   ├── [id]/
│       │   │   │   ├── CompetitionDetailClient.jsx
│       │   │   │   └── page.js
│       │   │   ├── CompetitionsClient.jsx
│       │   │   └── page.js
│       │   ├── contact/
│       │   │   └── page.js
│       │   ├── dashboard/
│       │   │   └── [type]/
│       │   │       ├── DashboardClient.jsx
│       │   │       └── page.js
│       │   ├── donate/
│       │   │   ├── DonateClient.jsx
│       │   │   └── page.js
│       │   ├── drives/
│       │   │   ├── DrivesClient.jsx
│       │   │   └── page.js
│       │   ├── ecosystem/
│       │   │   └── [id]/
│       │   │       └── page.js
│       │   ├── explore/
│       │   │   ├── ExploreClient.jsx
│       │   │   └── page.js
│       │   ├── forests/
│       │   │   ├── [id]/
│       │   │   │   └── page.js
│       │   │   ├── ForestsClient.jsx
│       │   │   └── page.js
│       │   ├── how-it-works/
│       │   │   └── page.js
│       │   ├── leaderboards/
│       │   │   ├── LeaderboardsClient.jsx
│       │   │   └── page.js
│       │   ├── login/
│       │   │   └── page.js
│       │   ├── mission/
│       │   │   └── page.js
│       │   ├── partners/
│       │   │   └── page.js
│       │   ├── plant/
│       │   │   ├── page.js
│       │   │   └── PlantClient.jsx
│       │   ├── register/
│       │   │   └── page.js
│       │   ├── trees/
│       │   │   └── [id]/
│       │   │       └── page.js
│       │   ├── globals.css
│       │   ├── HomeClient.jsx
│       │   ├── layout.js
│       │   ├── not-found.js
│       │   ├── page.js
│       │   └── providers.js
│       ├── assets/
│       │   └── Arth_Hero_Video_ORIGINAL_182MB_BACKUP.mp4
│       ├── components/
│       │   ├── site/
│       │   │   ├── AnimatedCounter.jsx
│       │   │   ├── AuthProvider.jsx
│       │   │   ├── BackgroundAmbience.jsx
│       │   │   ├── CustomCursor.jsx
│       │   │   ├── Footer.jsx
│       │   │   ├── ForestCard.jsx
│       │   │   ├── HorizontalRail.jsx
│       │   │   ├── LegacyTreeCard.jsx
│       │   │   ├── Marquee.jsx
│       │   │   ├── Navbar.jsx
│       │   │   └── SectionWrapper.jsx
│       │   └── ui/
│       │       ├── accordion.jsx
│       │       ├── alert-dialog.jsx
│       │       ├── alert.jsx
│       │       ├── aspect-ratio.jsx
│       │       ├── avatar.jsx
│       │       ├── badge.jsx
│       │       ├── breadcrumb.jsx
│       │       ├── button.jsx
│       │       ├── calendar.jsx
│       │       ├── card.jsx
│       │       ├── carousel.jsx
│       │       ├── chart.jsx
│       │       ├── checkbox.jsx
│       │       ├── collapsible.jsx
│       │       ├── command.jsx
│       │       ├── context-menu.jsx
│       │       ├── dialog.jsx
│       │       ├── drawer.jsx
│       │       ├── dropdown-menu.jsx
│       │       ├── form.jsx
│       │       ├── hover-card.jsx
│       │       ├── input-otp.jsx
│       │       ├── input.jsx
│       │       ├── label.jsx
│       │       ├── menubar.jsx
│       │       ├── navigation-menu.jsx
│       │       ├── pagination.jsx
│       │       ├── popover.jsx
│       │       ├── progress.jsx
│       │       ├── radio-group.jsx
│       │       ├── resizable.jsx
│       │       ├── scroll-area.jsx
│       │       ├── select.jsx
│       │       ├── separator.jsx
│       │       ├── sheet.jsx
│       │       ├── sidebar.jsx
│       │       ├── skeleton.jsx
│       │       ├── slider.jsx
│       │       ├── sonner.jsx
│       │       ├── switch.jsx
│       │       ├── table.jsx
│       │       ├── tabs.jsx
│       │       ├── textarea.jsx
│       │       ├── toast.jsx
│       │       ├── toaster.jsx
│       │       ├── toggle-group.jsx
│       │       ├── toggle.jsx
│       │       └── tooltip.jsx
│       ├── hooks/
│       │   ├── use-mobile.jsx
│       │   └── use-toast.js
│       ├── lib/
│       │   ├── constants/
│       │   │   └── testIds/
│       │   │       ├── auth.js
│       │   │       ├── home.js
│       │   │       └── index.js
│       │   ├── workers/
│       │   │   └── hero-frame-worker.js
│       │   ├── auth.js
│       │   ├── prisma.js
│       │   ├── session.js
│       │   ├── siteImages.js
│       │   └── utils.js
│       ├── memory/
│       │   └── .gitkeep
│       ├── node_modules/  (32,034 files — omitted)
│       ├── prisma/
│       │   ├── migrations/
│       │   │   ├── 20260802171628_init/
│       │   │   │   └── migration.sql
│       │   │   └── migration_lock.toml
│       │   ├── schema.prisma
│       │   └── seed.js
│       ├── public/
│       │   └── assets/
│       │       └── homepage/  (864 files — omitted)
│       ├── references/
│       │   ├── ChatGPT Image Aug 1, 2026, 08_58_29 PM.png
│       │   ├── Screenshot 2026-08-01 231659.png
│       │   ├── Screenshot 2026-08-01 231717.png
│       │   ├── Screenshot 2026-08-01 231732.png
│       │   ├── Screenshot 2026-08-01 231748.png
│       │   ├── Screenshot 2026-08-01 231756.png
│       │   ├── Screenshot 2026-08-01 231812.png
│       │   ├── Screenshot 2026-08-01 231819.png
│       │   ├── Screenshot 2026-08-01 231833.png
│       │   └── Screenshot 2026-08-01 231840.png
│       ├── test_reports/
│       │   ├── pytest/
│       │   │   └── .gitkeep
│       │   └── .gitkeep
│       ├── tests/
│       │   └── __init__.py
│       ├── .env
│       ├── .env.example
│       ├── .gitconfig
│       ├── components.json
│       ├── jsconfig.json
│       ├── middleware.js
│       ├── next.config.js
│       ├── package-lock.json
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       └── test_result.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MIGRATION.md
│   └── REPO_STRUCTURE.md
├── node_modules/  (83,934 files — omitted)
├── services/
│   └── api/
│       ├── dist/  (94 files — omitted)
│       ├── node_modules/  (8,400 files — omitted)
│       ├── prisma/
│       │   ├── migrations/
│       │   │   ├── 20260702072417_init/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260702174534_add_analytics_enabled_and_device_info_usage/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260702181035_add_forest_decorations/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260703072054_add_dev_password_plain/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260703140416_decoration_scale_rotation_and_stories/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260704070812_add_decoration_categories/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260704084327_decoration_stretch/
│       │   │   │   └── migration.sql
│       │   │   ├── 20260704144759_decoration_path_drop_stretch/
│       │   │   │   └── migration.sql
│       │   │   └── migration_lock.toml
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       │   ├── config/
│       │   │   └── env.ts
│       │   ├── plugins/
│       │   │   ├── auth.ts
│       │   │   ├── cors.ts
│       │   │   ├── multipart.ts
│       │   │   ├── prisma.ts
│       │   │   └── static.ts
│       │   ├── routes/
│       │   │   ├── achievements.routes.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── challenges.public.routes.ts
│       │   │   ├── challenges.routes.ts
│       │   │   ├── community.routes.ts
│       │   │   ├── decorations.routes.ts
│       │   │   ├── ecoFacts.routes.ts
│       │   │   ├── feed.routes.ts
│       │   │   ├── friends.routes.ts
│       │   │   ├── health.routes.ts
│       │   │   ├── leaderboard.routes.ts
│       │   │   ├── missions.routes.ts
│       │   │   ├── settings.routes.ts
│       │   │   ├── species.routes.ts
│       │   │   ├── stories.routes.ts
│       │   │   ├── streaks.routes.ts
│       │   │   ├── themes.routes.ts
│       │   │   ├── trees.routes.ts
│       │   │   ├── users.public.routes.ts
│       │   │   ├── users.routes.ts
│       │   │   ├── weather.routes.ts
│       │   │   └── xp.routes.ts
│       │   ├── schemas/
│       │   │   ├── auth.schema.ts
│       │   │   ├── decorations.schema.ts
│       │   │   ├── friends.schema.ts
│       │   │   ├── streaks.schema.ts
│       │   │   ├── trees.schema.ts
│       │   │   └── users.schema.ts
│       │   ├── services/
│       │   │   ├── achievement.service.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── challenge.service.ts
│       │   │   ├── missions.service.ts
│       │   │   ├── streak.service.ts
│       │   │   ├── tree.service.ts
│       │   │   ├── upload.service.ts
│       │   │   └── xp.service.ts
│       │   ├── types/
│       │   │   └── fastify.d.ts
│       │   ├── utils/
│       │   │   ├── errors.ts
│       │   │   ├── jwt.ts
│       │   │   └── password.ts
│       │   ├── app.ts
│       │   └── server.ts
│       ├── uploads/
│       │   ├── stories/
│       │   │   ├── 01ab8031-6b16-4eb6-9632-f4c513acdff8.jpg
│       │   │   ├── 3c370aa2-ab03-4fd2-aa6e-ed9a2cb75c4d.jpg
│       │   │   ├── 3d9733b5-3af3-4f87-9b0c-83e0aa56dc45.jpg
│       │   │   ├── 56b97c9f-ed21-44ee-94c9-41d3a14d2cde.png
│       │   │   └── 8d5511e4-e769-4529-810b-f8308ce8914d.jpg
│       │   └── trees/
│       │       ├── .gitkeep
│       │       ├── 0c566d4a-da09-4ef4-ae8c-bc6d9f28a1b6.jpeg
│       │       ├── 75045838-e8a1-4102-8295-57ec8a624c35.jpeg
│       │       └── eb7208c3-ee73-431b-a219-c1fdc05d3ff1.jpg
│       ├── .env
│       ├── .env.example
│       ├── package-lock.json
│       ├── package.json
│       └── tsconfig.json
├── .gitattributes
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

## Quick checks worth doing against this

- `apps/mobile/App.tsx`, `apps/mobile/app.json`, `apps/mobile/src/` — the mobile app, intact.
- `apps/web/app/`, `apps/web/prisma/schema.prisma` — the website, intact, still has its own Prisma schema separate from `services/api`'s.
- `services/api/src/`, `services/api/prisma/` — the backend, intact.
- Nothing named `website/` or `backend/` remains at the root — both were folded into `apps/`/`services/` and the old wrapper paths removed.
- `apps/mobile/assets/characters/New Folder/` is empty and pre-existing (not something this migration created) — leftover clutter you may want to clean up separately.
