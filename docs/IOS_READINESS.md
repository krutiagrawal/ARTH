# Arth — iOS / App Store Readiness Audit

_Audit date: 2026-10-12. Scope: `apps/mobile` (Expo SDK 57, React Native 0.86) plus the push-token path in `services/api`.
**Audit only — no code was changed.** Everything below is a to-do list for later._

---

## 1. Summary

- The app is **~90% iOS-ready**. It is one Expo/React Native codebase; no screen rewrites are needed.
- **No Mac is required.** Builds and App Store submission can be done from Windows with **EAS Build + EAS Submit**. An iPhone is needed for testing (via TestFlight or a development build). The iOS Simulator is Mac-only.
- A small number of **config changes (blockers)**, **App Store policy gaps**, and **things that can only be found by running on a real iPhone** remain. They are listed below in priority order.

### How the app is built
| Item | Current state |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| `ios` block in `app.json` | Exists: `bundleIdentifier: com.arth.app`, `supportsTablet: false`, `LSApplicationQueriesSchemes` (instagram, instagram-stories, whatsapp, twitter) |
| `ios/` native folder | Does not exist (`android/` does, and is git-ignored). EAS generates `ios/` at build time |
| `eas.json` | Android-only settings (`buildType: apk` / `app-bundle`). No iOS profile, empty `submit.production` |
| Backend push-token API | Platform-agnostic (`platform` is a free string, max 20 chars) — iOS works with no backend change |

---

## 2. Part A — Blockers (must fix before an iOS build can ship)

### A1. Missing iOS permission descriptions (`app.json`) — HIGH
Apple crashes the app at runtime and rejects it in review if a permission is requested without a usage-description string.

What the code actually uses:
| Permission | Where used | Declared today? |
|---|---|---|
| Location (when-in-use) | `useMyLocation`, `useLiveDistance`, `useDeviceWeather`, `CheckoutScreen`, `AddressBookScreen`, `DeliveryPartnerQueueScreen`, `EditNurseryProfileScreen`, `useDeliveryLocationReporting` — all use `requestForegroundPermissionsAsync` (no background location) | Yes (via `expo-location` plugin) |
| Camera | `launchCameraAsync` in `PhotoPickerField`, `MultiPhotoPickerField`, `PlantTreeScreen`, `TreePassportScreen`, `LogCommunityObservationScreen` | **No** (plugin defaults only) |
| Photo library | `launchImageLibraryAsync` in ~10 files (nursery stock, NGO/Group/Corporate settings, posts, etc.) | **No** (plugin defaults only) |
| Microphone | **Not used.** Audio is playback only (`SoundContext`: `allowsRecording: false`) | The `expo-audio` plugin **adds a mic permission by default** |

**To do:**
1. Configure the `expo-image-picker` plugin with `cameraPermission`, `photosPermission` (and set `microphonePermission: false`) using clear, honest wording (e.g. "Arth uses your camera to photograph the trees you plant").
2. Configure the `expo-audio` plugin with `microphonePermission: false` so Arth doesn't declare a microphone it never uses (Apple can question this in review).
3. Keep the existing location strings. Re-read them: they say "to record where you plant trees", but location is also used for weather, nearby nurseries and delivery tracking — **widen the wording** so it matches real use (Apple checks this).

### A2. No iOS build/submit profile (`eas.json`) — HIGH
Add iOS settings to `development`, `preview`, `production` profiles, and fill in `submit.production.ios` (Apple ID, App Store Connect app ID, team ID). Decide `autoIncrement` for the iOS build number.

### A3. Hosted backend URL — HIGH (applies to Android release too)
`apps/mobile/.env` has `EXPO_PUBLIC_API_URL=http://172.16.16.66:4000` (a LAN address, plain `http`).
- Production builds must point to a **public HTTPS** URL. Apple's App Transport Security blocks plain `http` to non-local hosts, and App Review cannot reach a LAN IP.
- `scripts/sync-lan-ip.js` rewrites `.env` before `start/android/ios` — fine for dev, but production env vars should be set per EAS build profile (`env` in `eas.json` or EAS secrets), never from `.env`.
- Also set the **live** Stripe publishable key for production (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

### A4. Apple Developer account and App Store Connect — HIGH (non-code, long lead time)
- Enrol in the Apple Developer Program (~$99/yr; can take days to approve).
- Create the app record using bundle ID `com.arth.app` (confirm it's available).
- Create Apple Merchant ID `merchant.com.arth.app` (already referenced in the Stripe plugin config) — only needed if Apple Pay is enabled.

### A5. Push notifications setup — HIGH (setup, little code)
- Code path (`usePushRegistration.ts`) is already iOS-ready: asks permission, calls `getExpoPushTokenAsync`, sends `Platform.OS` to the backend.
- **To do:** let EAS create the APNs key (`eas credentials`). Android uses `google-services.json` (FCM); iOS needs no equivalent file.
- **To do:** `app.json` has **no `extra.eas.projectId`** (grep found none). The hook falls back to `Constants.easConfig?.projectId`, which EAS builds supply, but run `eas init` so the project ID is stored and pushes can be verified on both platforms.
- Test: send a real push to an iPhone via TestFlight build (push does not work in Expo Go or the Simulator without extra setup).

---

## 3. Part B — App Store policy gaps (Apple rejects for these)

### B1. Account deletion missing for the NGO role — HIGH
Apple Guideline 5.1.1(v): any app with account creation must let users delete the account **inside the app**.
- `deleteAccount()` (`src/api/auth.ts:349`) exists and is wired into: `SettingsScreen`, `NurserySettingsScreen`, `CorporateSettingsScreen`, `GroupSettingsScreen`.
- **`NgoSettingsScreen` has no delete-account option.** Add one.
- Also confirm what delivery-partner and admin accounts do (they appear to use `SettingsScreen` or none) — a delivery partner must also be able to delete.
- Make sure the backend deletion truly removes/anonymises the data and handles blockers (e.g. NGO with open drives, nursery with open orders).

### B2. User-generated content moderation — MEDIUM (mostly present)
Apple Guideline 1.2 requires: report content, block users, filter/moderate, publish contact info.
- Report: present (`ReportSheet.tsx`, `AdminReportsScreen`).
- Block: present (`blockTarget`/`unblockTarget` in `api/social.ts`, `ActionSheet`).
- Admin review: present (`AdminReportsScreen`, `AdminTreeReviewScreen`).
- **To verify:** a block/unblock management screen is reachable, reports are actually actioned within 24h (Apple's expectation), and a support contact is shown in-app.

### B3. Privacy policy and Terms — MEDIUM
- Policy and Terms exist **only as in-app text** (`constants/legalContent.ts`).
- App Store Connect requires a **public privacy-policy URL**. Host the same content on the website (e.g. the `apps/web` app).
- `NurseryDashboardScreen` uses a placeholder support email: `support@plantapp.example` — replace with a real address before release (also on Android).
- Fill the App Store **"Privacy Nutrition Label"** honestly: location, photos, user content, purchases, identifiers (push token), contact info. No third-party analytics/ad SDKs were found in `package.json` (no Firebase Analytics, Sentry, Facebook, etc.), which keeps this simple. No App Tracking Transparency prompt is needed unless tracking is added later.

### B4. Payments (Stripe) — MEDIUM, needs a decision
Stripe is used in two flows:
1. **Tree/sapling orders** (`CheckoutScreen`) — physical goods, delivered or picked up. Apple allows external payment (Stripe) for physical goods. OK.
2. **Donations to campaigns** (`PaymentSheetRunner`, `createDonationIntent`) — Apple Guideline 3.2.1(vi) allows in-app donations only to **registered nonprofits** (and the nonprofit must be the one collecting), and 3.1.1 says anything that unlocks digital features must use In-App Purchase.
   - **To confirm:** donors only give to verified NGOs, and donating does **not** unlock XP, badges, streaks or in-app perks (that could be read as "digital content" and need IAP).
   - Be ready to explain this in the App Review notes.
- Technical items: Apple Pay is not configured (`initPaymentSheet` has no `applePay` option). Optional but recommended for conversion. If added, needs the merchant ID (A4) and `applePay: { merchantCountryCode: 'IN' }`.
- `app.json` has no `scheme`. Stripe's redirect-based payment methods (some banks/UPI-style flows) return to the app via a URL scheme. Add `"scheme": "arth"` and pass `returnURL` to `initPaymentSheet`.

### B5. App Review access — MEDIUM
App Review needs demo credentials for **every role** (citizen, nursery, NGO, group, corporate, delivery, admin as applicable) and a working backend. Prepare these plus review notes (what Arth is, how donations work, how moderation works).

### B6. Store-listing assets (non-code) — LOW
App name, subtitle, description, keywords, category, age rating questionnaire, support URL, marketing URL, screenshots for 6.9"/6.7" (and 6.5"/5.5" if required), and a 1024×1024 icon.

---

## 4. Part C — Code-level iOS checks (found by reading the code)

### C1. Icon — OK
`assets/icon.png` is 1024×1024 RGB (no alpha channel) — meets Apple's requirement. `adaptive-icon.png` is Android-only. `splash.png` is 1284×2778; just verify it looks right on notched iPhones.

### C2. Android-only code — OK (properly guarded)
- `src/utils/androidNavigationBar.ts` returns immediately unless `Platform.OS === 'android'`, wrapped in try/catch. Used by `App.tsx`, `SplashScreen`, `OnboardingScreen`.
- The `expo-navigation-bar` config plugin only affects Android at build time.
- No uses of `BackHandler`, `ToastAndroid` or `PermissionsAndroid` anywhere.
- The `android` blocks in `app.json` (permissions, adaptive icon, google-services) are ignored on iOS.

### C3. Platform-specific UI already handled — OK
- Date/time pickers use iOS spinner display with explicit confirm handling in `GroupCreateChallengeScreen`, `NgoCreateDriveScreen`, `NgoBulkRequirementsScreen`, `NgoPortfolioEntryScreen`, `PersonalizeOnboardingScreen`.
- `KeyboardAvoidingView behavior="padding"` is applied on iOS on 11 screens (Login, Register, NGO/Nursery/Corporate/Group register, etc.).

### C4. Things to test on a real iPhone (can't be proven by reading code)
1. **Keyboard handling in the 5 files that use `<Modal>`** — verify text inputs inside modals are not hidden by the keyboard.
2. **Shadows.** The app uses both `elevation` (Android) and `shadow*` (iOS) props. All files with `elevation` also set iOS shadows except `components/common/FormField.tsx` — check it looks right.
3. **Safe areas** — notch / Dynamic Island / home indicator on all main screens and full-screen views (`StoryViewer`, games shell, Splash, Onboarding).
4. **Fonts** — Bricolage Grotesque / Figtree load via `expo-font`; check weights render correctly.
5. **Maps** — MapLibre (`MapScreen`) and the Leaflet WebView tracking map (`DeliveryTrackingMap`) on iOS.
6. **Skia, Lottie, Reanimated animations** — performance and correctness (forest visuals, decorations, Ollie & Roots animation).
7. **Audio** — background birds + piano loops. `playsInSilentMode: true` is set, which means it plays even when the iPhone's mute switch is on. Decide whether that's intended. Check behaviour during phone calls / when other apps play audio (`duckOthers`).
8. **Haptics and speech** (`useHaptics`, `StoryPreviewModal`).
9. **Sharing.** `react-native-share` is used for WhatsApp / Instagram / X / Instagram Stories (`utils/shareToInstagram.ts`). On iOS, Instagram Stories sharing needs the `instagram-stories` scheme (already in `LSApplicationQueriesSchemes`) and ideally a Facebook App ID (`EXPO_PUBLIC_FACEBOOK_APP_ID`, currently optional/empty). The fallback to the generic share sheet is already coded.
10. **External links.** `LocationActions` opens Google Maps, Uber (`m.uber.com` web link) and Ola (website only). Web links work on iOS; they open Safari or the installed app via universal links. `tel:` links work on iPhones.
11. **Image picker.** Camera cannot be tested in the Simulator — test on a device. Check large HEIC photos upload correctly (iOS photos are HEIC by default; `expo-image-manipulator` is present and `quality` is set, so they are normally converted — verify the backend accepts the resulting JPEG).
12. **Push notification tap routing** (cold start vs background) — `usePushRegistration` handles both; verify on iOS.
13. **Foreground notifications** show banners (handler already set).

### C5. Library compatibility
All native dependencies are Expo-compatible and iOS-capable: MapLibre, Stripe, Skia, Lottie, Reanimated 4 + Worklets, Gesture Handler, Screens, Safe Area, SVG, WebView, Secure Store, Location, Notifications, Image Picker, Document Picker, File System, Haptics, Speech, Audio, Blur, Linear Gradient, Clipboard, View Shot, DateTimePicker, Share.
- `react-native-web`, `react-dom` and `next` in the mobile `package.json` are unusual for a mobile app (probably for the `web` script). They're harmless for iOS but add install weight; review whether they're needed.
- Several modules are lazy-loaded to survive Expo Go (Stripe, Share, Notifications). In a real EAS build they load normally.
- **Expo Go cannot be used to test iOS** for this app (Stripe, MapLibre, Skia, Share and Notifications need a development build).

---

## 5. Part D — Process: building and shipping without a Mac

1. `eas login`, then `eas init` (stores the project ID).
2. Enrol in the Apple Developer Program (A4). Wait for approval.
3. Update `app.json` / `eas.json` (A1, A2, B4 scheme).
4. `eas build --platform ios --profile development` → install on a registered iPhone (`eas device:create`) for live-reload testing.
5. `eas build --platform ios --profile production` → `eas submit --platform ios` → build appears in **TestFlight**.
6. Test on iPhones through TestFlight for 1–2 weeks (Part C4 checklist).
7. Fix issues, fill in App Store Connect (B3, B5, B6), submit for review. Review is typically 1–3 days; first submissions often get one round of questions.
8. After launch: use `eas update` (OTA) for JS-only fixes; a new build is needed only for native changes.

### Reliability notes on EAS
- EAS uses real Macs/Xcode and produces the same signed `.ipa` as a local build. Apple cannot tell the difference.
- Free-tier iOS builds can queue for a long time → use a paid plan near launch.
- Back up signing credentials with `eas credentials`.
- Exit path: `npx expo prebuild --platform ios` generates the native project, buildable in Xcode on any Mac if EAS is ever unavailable.
- Do a **trial iOS build early** (before the feature work is done) to flush out any native-library build errors.

---

## 6. Prioritised checklist

| # | Item | Type | Priority |
|---|---|---|---|
| 1 | Enrol in Apple Developer Program | Account | Do first |
| 2 | Trial iOS build via EAS (finds native build issues early) | Build | Do first |
| 3 | A1 — camera/photos usage strings; mic off for `expo-audio` | Config | High |
| 4 | A2 — iOS profiles in `eas.json` | Config | High |
| 5 | A3 — hosted HTTPS API + live Stripe key via EAS env | Infra | High |
| 6 | B1 — add Delete Account to `NgoSettingsScreen` (+ check delivery/admin) | Code | High |
| 7 | A5 — `eas init`, APNs key, test real iOS push | Setup | High |
| 8 | B3 — host privacy policy URL; fix placeholder support email | Content | Medium |
| 9 | B4 — confirm donation rules; add URL scheme + `returnURL`; optional Apple Pay | Code/Policy | Medium |
| 10 | B2 — verify block-management screen and report handling SLA | Verify | Medium |
| 11 | C4 — full real-device test pass (TestFlight) | QA | Medium |
| 12 | B5/B6 — review demo accounts, notes, screenshots, listing text | Content | Before submit |

**Estimated code change: small** — a handful of lines in `app.json` / `eas.json`, one new settings row (NGO delete account), URL scheme and `returnURL`, plus whatever the iPhone test pass turns up (mainly layout tweaks).

---

## 7. Not checked in this audit
- Backend behaviour on account deletion and on report handling.
- Exact roles that exist beyond those with a settings screen (delivery partner, admin) and which screen they use for settings.
- Whether `EXPO_PUBLIC_FACEBOOK_APP_ID` is set anywhere.
- Actual runtime behaviour on iOS (no iOS build or device test has been run).
- Detailed content of the privacy policy and terms text against Apple's requirements.
