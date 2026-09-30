# ARTH Mobile App — UAT Test Case Document

**Scope:** Mobile app only (`apps/mobile`, React Native/Expo). Roles covered: **Individual**, **NGO**, **Nursery**. Admin actions appear **only as prerequisites** (clearly marked) — no Admin-UI test cases are included. Group, Corporate, and Delivery Partner roles exist in the codebase but are explicitly **out of scope** for this phase (see "Potentially Untested Areas").

**Method:** Every test case below is derived from a direct, read-only audit of the current mobile codebase (screens, navigation, forms, API calls, and state logic) — not from assumed/ideal product behavior. Where the intended behavior of something we found was ambiguous, it is called out in **Notes** or in the closing "Potential Issue / Requires Verification" list rather than asserted as an expected result.

**Priority legend:** P0 = Critical/must work · P1 = High · P2 = Medium · P3 = Low
**Test Type legend:** Positive · Negative · Boundary · Validation · Permission · Error Handling · State Transition · Integration · Regression

---

## Table of Contents

- [A. Individual User](#a-individual-user)
  - A1 Authentication · A2 Onboarding/Profile Setup · A3 Home · A4 Planting · A5 Plant Photo Verification (AI) · A6 Map/Discovery · A7 Tree Details (Map/Forest) · A8 Adoption · A9 NGO Drives & Campaigns · A10 Donations · A11 Streaks · A12 Impact/Statistics · A13 Profile · A14 Settings · A14b Blocked Accounts & Following · A15 Notifications · A16 Other Implemented Features (Marketplace, Social/Community, Records)
- [B. NGO User](#b-ngo-user)
  - B1 NGO Authentication · B2 Registration Wizard · B3 Pending State · B4 Approved State · B5 Rejected/Suspended State · B6 NGO Profile · B7 Dashboard · B8 Drives/Campaigns · B9 Plantation/Tree Logging · B10 Tree Survival/Health Tracking · B11 Impact/Survival Statistics · B12 Portfolio · B13 Staff/Team · B14 Interaction with Individuals · B15 Interaction with Nurseries · B16 Notifications · B17 Settings (incl. shared preferences screen) · B18 Other Implemented Features (Community, Posts, Growth & Trust, Followers & Follow Requests)
- [C. Nursery User](#c-nursery-user)
  - C1 Nursery Authentication · C2 Registration · C3 Pending State · C4 Approved/Rejected/Suspended States · C5 Nursery Profile · C6 Dashboard · C7 Sapling/Stock Management · C8 Inventory/Availability · C9 NGO Interactions (Bulk Requirements) · C10 Individual-User Interactions (Reservations/Orders/Reviews) · C11 Statistics/Streaks · C12 Notifications · C13 Settings · C14 Other Implemented Features (Delivery Partners, Pickup/Delivery Config, Directory & Community, Followers & Follow Requests)
- [Cross-Role Mobile UAT](#cross-role-mobile-uat)
- [Mobile-Specific Testing](#mobile-specific-testing)
- [UAT Prioritization](#uat-prioritization)
- [Test Data Requirements](#test-data-requirements)
- [Traceability & Coverage Summary](#traceability--coverage-summary)
- [Potentially Untested Areas](#potentially-untested-areas)
- [Potential Issue / Requires Verification](#potential-issue--requires-verification)

---

## A. Individual User

### A1. Authentication

Screens: `SplashScreen`, `AccountTypeScreen`, `LoginScreen`, `RegisterScreen`, `ChangePasswordScreen`, `SessionsScreen`. APIs: `api/auth.ts`, `api/tokenStorage.ts`, `api/client.ts`.

#### IND-AUTH-001 — Register a new Individual account with valid details
- **Role:** Individual (unauthenticated)
- **Feature:** Registration — `RegisterScreen`
- **Scenario:** A new user signs up as an Individual with valid name/email/password.
- **Preconditions:** App installed; device online; email not already registered.
- **Test Data:** Name: `Asha Verma`; Email: `asha.verma+t1@example.com`; Password: `Passw0rd1`
- **Steps:** 1) From `AccountTypeScreen`, tap **Individual** 2) Enter Name, Email, Password 3) Tap **Create account**
- **Expected Result:** Account is created and the user is logged in immediately (no OTP/email-verification step exists); tokens are persisted; app navigates directly to the Home tab shell (`Main`).
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** None
- **Notes:** Confirms there is no email/OTP verification gate — this is a designed-in gap, not a defect; see Potential Issues.

#### IND-AUTH-002 — Register with an email already in use
- **Role:** Individual
- **Feature:** Registration — email availability check
- **Scenario:** User enters an email that already belongs to another account.
- **Preconditions:** An account already exists with the test email.
- **Test Data:** Email of an existing account.
- **Steps:** 1) Open Register 2) Type the existing email into the Email field and wait ~500ms (debounce) 3) Observe field state 4) Attempt to submit anyway
- **Expected Result:** The debounced availability check (`GET /api/auth/check-availability`) marks the email as taken before submit; Submit is blocked or shows an inline "email already in use" error.
- **Priority:** P0
- **Test Type:** Negative
- **Dependencies:** IND-AUTH-001 (existing account)
- **Notes:** The client only re-checks via the debounced effect, not synchronously at submit time — verify a fast paste-and-immediately-submit doesn't slip through (race condition risk, flagged in Potential Issues).

#### IND-AUTH-003 — Register with invalid email format
- **Role:** Individual
- **Feature:** Registration — validation
- **Scenario:** User enters a malformed email.
- **Test Data:** Email: `not-an-email`
- **Steps:** 1) Open Register 2) Enter Name, `not-an-email`, and a valid password 3) Tap Create account
- **Expected Result:** Inline validation error shown; request is not submitted.
- **Priority:** P1
- **Test Type:** Validation
- **Dependencies:** None
- **Notes:** —

#### IND-AUTH-004 — Register with password under 8 characters
- **Role:** Individual
- **Feature:** Registration — password validation
- **Test Data:** Password: `abc123`
- **Steps:** 1) Fill valid name/email 2) Enter a 6-character password 3) Submit
- **Expected Result:** Inline error requiring minimum 8 characters; request not submitted.
- **Priority:** P1
- **Test Type:** Boundary
- **Dependencies:** None
- **Notes:** No complexity rule beyond length was found (no uppercase/symbol requirement) — test only length boundary.

#### IND-AUTH-005 — Register with empty required fields
- **Role:** Individual
- **Feature:** Registration — required-field validation
- **Steps:** 1) Leave Name, Email, Password blank 2) Tap Create account
- **Expected Result:** Inline errors for each missing required field; no API call fired.
- **Priority:** P1
- **Test Type:** Negative
- **Dependencies:** None

#### IND-AUTH-006 — Auto-generated handle collision at registration
- **Role:** Individual
- **Feature:** Registration — handle auto-generation
- **Scenario:** Two users with names that slugify to the same handle (e.g. both named "John Doe") register.
- **Steps:** 1) Register user A named "John Doe" 2) Register user B also named "John Doe"
- **Expected Result:** Unclear from client code — the handle is never shown/editable at registration, so a collision can only be caught server-side. Tester should confirm whether registration fails with a clear error, or silently appends a suffix.
- **Priority:** P2
- **Test Type:** Boundary
- **Dependencies:** None
- **Notes:** **Flagged, not assumed** — see Potential Issues: "no client-side handle collision handling at registration."

#### IND-AUTH-007 — Login with valid credentials
- **Role:** Individual
- **Feature:** Login — `LoginScreen`
- **Test Data:** Valid existing Individual account credentials.
- **Steps:** 1) Open Login 2) Enter valid email/password 3) Tap Log in
- **Expected Result:** Query cache is cleared (`queryClient.clear()`), user is authenticated, app routes to the Individual `Main` tab shell.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** IND-AUTH-001
- **Notes:** —

#### IND-AUTH-008 — Login with incorrect password
- **Role:** Individual
- **Feature:** Login — invalid credentials
- **Steps:** 1) Enter valid email, wrong password 2) Tap Log in
- **Expected Result:** Generic inline error surfaced from the server's `ApiError.message`; no lockout/attempt-limit UI exists (verify none is silently enforced server-side either).
- **Priority:** P0
- **Test Type:** Negative
- **Dependencies:** IND-AUTH-001

#### IND-AUTH-009 — Login with unregistered email
- **Role:** Individual
- **Feature:** Login — non-existent account
- **Test Data:** Email: `doesnotexist@example.com`
- **Expected Result:** Generic inline error; no account enumeration hint (verify the error message doesn't reveal whether the email exists).
- **Priority:** P1
- **Test Type:** Negative
- **Dependencies:** None

#### IND-AUTH-010 — Login with malformed email
- **Role:** Individual
- **Feature:** Login — client-side format validation
- **Test Data:** Email: `abc@`
- **Expected Result:** Inline "enter a valid email address" error on blur, before any network call.
- **Priority:** P2
- **Test Type:** Validation
- **Dependencies:** None

#### IND-AUTH-011 — "Forgot password" link does not exist
- **Role:** Individual
- **Feature:** Login screen — password recovery
- **Scenario:** A locked-out user looks for a self-service password reset.
- **Steps:** 1) Open Login screen 2) Look for a "Forgot password" affordance
- **Expected Result:** No such link/flow exists anywhere in the app (confirmed absent in code — no forgot/reset-password screen or API). A user who forgets their password has no in-app recovery path.
- **Priority:** P0
- **Test Type:** Negative / Gap confirmation
- **Dependencies:** None
- **Notes:** This is a confirmed product gap, not a bug in an existing flow — recorded so QA doesn't spend time searching for a hidden entry point. See Potential Issues.

#### IND-AUTH-012 — Duplicate rapid taps on Login/Register submit
- **Role:** Individual
- **Feature:** Login/Register — duplicate-submission guard
- **Steps:** 1) Fill valid credentials 2) Rapidly tap Submit multiple times before the request resolves
- **Expected Result:** Button becomes disabled / label changes to "Creating account…" or equivalent immediately on first tap (`isSubmitting` guard) — only one request should fire.
- **Priority:** P1
- **Test Type:** Regression
- **Dependencies:** None

#### IND-AUTH-013 — Session persists across app restart
- **Role:** Individual
- **Feature:** Session persistence
- **Preconditions:** Logged in.
- **Steps:** 1) Log in 2) Force-close the app completely 3) Reopen the app
- **Expected Result:** Access token (AsyncStorage) and refresh token (SecureStore) are read on cold start; `GET /api/users/me` succeeds; user lands directly on their role's `Main` shell without re-entering credentials.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** IND-AUTH-007

#### IND-AUTH-014 — Expired access token triggers silent refresh
- **Role:** Individual
- **Feature:** Token refresh — `api/client.ts`
- **Preconditions:** Logged in with an access token old enough to be rejected (or simulate via token tampering if testable).
- **Steps:** 1) Perform any authenticated action after token expiry 2) Observe behavior
- **Expected Result:** A single `POST /api/auth/refresh` fires, the original request is retried once and succeeds transparently — no visible interruption to the user.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-AUTH-007

#### IND-AUTH-015 — Refresh token itself expired/invalid → forced logout
- **Role:** Individual
- **Feature:** Token refresh failure handling
- **Steps:** 1) With an invalid/expired refresh token, perform an authenticated action
- **Expected Result:** Refresh fails, local tokens are cleared, query cache is cleared, and the app resets navigation to `Login`.
- **Priority:** P0
- **Test Type:** Error Handling
- **Dependencies:** None

#### IND-AUTH-016 — Account blocked mid-session
- **Role:** Individual (blocked by Admin — **prerequisite**: *Admin flags/blocks the account from the Admin panel*)
- **Feature:** `AccountBlockedScreen` / `useBlockedRedirect`
- **Preconditions:** Prerequisite admin action has blocked the account.
- **Steps:** 1) While the user is mid-session on any screen, trigger any API call
- **Expected Result:** The very next API response carrying `ACCOUNT_BLOCKED` immediately resets navigation to `AccountBlockedScreen` (no matter what screen was showing); tokens are **not** cleared; the block reason (if provided) is displayed; only action available is "Sign out."
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite
- **Notes:** Distinct mechanism from any role-level pending/rejected status — do not conflate with NGO/Nursery `status` fields.

#### IND-AUTH-017 — Logout clears session
- **Role:** Individual
- **Feature:** Logout — `SettingsScreen`
- **Steps:** 1) Go to Settings 2) Tap "Log Out"
- **Expected Result:** Best-effort `POST /api/auth/logout` fires; local tokens are cleared regardless of server response; app resets to `Login`.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** IND-AUTH-007

#### IND-AUTH-018 — Logout with no network
- **Role:** Individual
- **Feature:** Logout — offline resilience
- **Preconditions:** Airplane mode enabled.
- **Steps:** 1) Tap "Log Out" while offline
- **Expected Result:** Server logout call fails silently (swallowed); local tokens are still cleared and app still returns to `Login`.
- **Priority:** P1
- **Test Type:** Error Handling
- **Dependencies:** None

#### IND-AUTH-019 — Change password with correct current password
- **Role:** Individual
- **Feature:** `ChangePasswordScreen`
- **Test Data:** Current password (correct), New password `NewPass123`, Confirm `NewPass123`
- **Expected Result:** Success confirm dialog, navigates back.
- **Priority:** P1
- **Test Type:** Positive
- **Dependencies:** IND-AUTH-007

#### IND-AUTH-020 — Change password: new/confirm mismatch
- **Test Data:** New: `NewPass123`, Confirm: `NewPass124`
- **Expected Result:** Inline "passwords do not match" error; submit blocked.
- **Priority:** P1
- **Test Type:** Validation

#### IND-AUTH-021 — Change password: new password under 8 characters
- **Expected Result:** Inline "at least 8 characters" error.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-AUTH-022 — Change password with wrong current password
- **Expected Result:** Server rejects; inline error shown from `ApiError.message`.
- **Priority:** P1
- **Test Type:** Negative

#### IND-AUTH-023 — View and revoke an active session
- **Role:** Individual
- **Feature:** `SessionsScreen`
- **Preconditions:** Logged in on 2+ devices/sessions.
- **Steps:** 1) Open Settings → Connected Devices 2) Tap Revoke on a non-current session → confirm
- **Expected Result:** Confirm dialog appears before revocation; session disappears from the list; that device is signed out on its next request.
- **Priority:** P2
- **Test Type:** Positive
- **Dependencies:** A second logged-in session

#### IND-AUTH-024 — Sessions list empty state
- **Expected Result:** "No active sessions found." text shown when the list is empty.
- **Priority:** P3
- **Test Type:** Boundary

---

### A2. Onboarding / Profile Setup

Screens: `OnboardingScreen`, `AccountTypeScreen`.

#### IND-ONB-001 — First-run onboarding carousel completes
- **Role:** Individual (pre-auth)
- **Preconditions:** Fresh install (no `plant_onboarded` flag).
- **Steps:** 1) Launch app for the first time 2) Swipe through all 4 onboarding pages 3) Tap the final CTA
- **Expected Result:** `plant_onboarded` flag is set; app navigates to `AccountTypeScreen`.
- **Priority:** P2
- **Test Type:** Positive
- **Dependencies:** None

#### IND-ONB-002 — Skip onboarding
- **Steps:** 1) On any onboarding page, tap "Skip"
- **Expected Result:** Same effect as completing it — flag set, routes to `AccountTypeScreen`.
- **Priority:** P3
- **Test Type:** Positive

#### IND-ONB-003 — Onboarding not shown again after first run
- **Steps:** 1) Complete onboarding once 2) Log out 3) Relaunch the app
- **Expected Result:** App routes straight to `Login`, not back through Onboarding (flag persists).
- **Priority:** P2
- **Test Type:** Regression

#### IND-ONB-004 — AccountType screen offers Individual entry point
- **Steps:** 1) On `AccountTypeScreen`, confirm the "Individual" card is present and tappable
- **Expected Result:** Navigates to `RegisterScreen`. (Other 4 cards — Group/NGO/Nursery/Corporate — are out of this document's scope except NGO/Nursery, covered in Sections B/C.)
- **Priority:** P1
- **Test Type:** Positive

#### IND-ONB-005 — "Already have an account? Log in" link
- **Steps:** 1) From `AccountTypeScreen`, tap the login link
- **Expected Result:** Navigates to `LoginScreen`.
- **Priority:** P2
- **Test Type:** Positive

---

### A3. Home

Screen: `HomeScreen`.

#### IND-HOME-001 — Home loads hero, streak, and stat pills
- **Preconditions:** Logged in as Individual with at least one planted tree.
- **Expected Result:** Time-of-day themed hero renders (image or Skia fallback), streak/trees/CO₂ stat pills show correct values, weather line reflects device location/weather.
- **Priority:** P1
- **Test Type:** Positive

#### IND-HOME-002 — "Take action for the Earth" CTA opens 4-option sheet
- **Steps:** 1) Tap the primary CTA
- **Expected Result:** Bottom sheet opens with: Plant by myself → `PlantTree`; Adopt a nearby tree → `AdoptTreeList`; Join an NGO drive → `Drives`; Donate to an NGO → `Campaigns`. Each option navigates correctly.
- **Priority:** P0
- **Test Type:** Positive

#### IND-HOME-003 — Daily mission of type "plant" routes to PlantTree
- **Preconditions:** At least one incomplete "plant"-type mission.
- **Steps:** 1) Tap the mission card
- **Expected Result:** Navigates to `PlantTreeScreen`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-HOME-004 — Completing a non-plant mission gives no per-row loading feedback
- **Preconditions:** An incomplete mission whose type isn't "plant".
- **Steps:** 1) Tap the mission card on a slow/throttled network
- **Expected Result:** `useCompleteMission` fires with no confirmation dialog and **no visible per-row spinner**; the row only updates once the mutation resolves.
- **Priority:** P3
- **Test Type:** Error Handling
- **Notes:** Flagged UX gap — a slow network gives no feedback that the tap registered; verify user isn't tempted to tap repeatedly.

#### IND-HOME-005 — Home with zero planted trees (empty "Recent Plants")
- **Preconditions:** New account, no trees planted.
- **Expected Result:** Recent Plants strip is simply empty — no explicit empty-state message on Home itself (informative empty state instead lives on the Map tab).
- **Priority:** P3
- **Test Type:** Boundary

#### IND-HOME-006 — Weather-driven ambient effects
- **Steps:** 1) Observe Home under different device-reported weather conditions (rain/clear/etc.)
- **Expected Result:** Ambient rain/wind/leaf effects visually react to `useDeviceWeather` data.
- **Priority:** P3
- **Test Type:** Positive

#### IND-HOME-007 — Eco Insight card navigates to EcoInsights
- **Steps:** 1) Tap the Eco Insight card
- **Expected Result:** Navigates to `EcoInsightsScreen`.
- **Priority:** P2
- **Test Type:** Positive

---

### A4. Planting

Screen: `PlantTreeScreen` (non-AI aspects — see A5 for the verification pipeline specifically).

#### IND-PLANT-001 — Full happy-path planting flow
- **Preconditions:** Logged in; camera & location permissions available to grant; device physically at (or GPS-spoofed to, in a controlled test env) an ARTH-approved planting location.
- **Steps:** 1) Open Plant Tree (from Home CTA) 2) Take a live camera photo of a planting moment 3) Wait for AI scan (~3.8s) to pass 4) Select an existing species from the grid 5) Enter nickname (optional) and caption 6) Confirm submit
- **Expected Result:** `POST /api/trees` succeeds; XP-earned confetti animation shows; share-card modal offered; "View My Forest" available; tree appears in Forest/Map.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** Camera + location permission granted

#### IND-PLANT-002 — Upload stage is camera-only, no gallery option
- **Steps:** 1) Open Plant Tree 2) Look for a gallery/library option at the photo stage
- **Expected Result:** Only a live camera capture is offered — no gallery picker exists at this stage (by design, so the moment/location is authentic).
- **Priority:** P1
- **Test Type:** Positive

#### IND-PLANT-003 — Add a new species not in the existing list
- **Steps:** 1) At species-selection, tap "Can't find it?" 2) Enter a name (≤40 chars) and pick an emoji 3) Tap "Add species"
- **Expected Result:** Both name and emoji are required before "Add species" enables; new species becomes selected.
- **Priority:** P2
- **Test Type:** Validation

#### IND-PLANT-004 — Species name at 41+ characters is rejected/truncated
- **Test Data:** A 45-character species name.
- **Expected Result:** Input is capped at 40 characters (verify whether it truncates while typing or blocks submit).
- **Priority:** P3
- **Test Type:** Boundary

#### IND-PLANT-005 — Caption at the 2200-character boundary
- **Test Data:** Caption of exactly 2200 characters, then 2201.
- **Expected Result:** 2200 accepted; 2201 either blocked or truncated (verify which).
- **Priority:** P3
- **Test Type:** Boundary

#### IND-PLANT-006 — Submit with no species selected
- **Steps:** 1) Skip species selection 2) Attempt to submit
- **Expected Result:** Submit button remains disabled until a species is chosen.
- **Priority:** P1
- **Test Type:** Validation

#### IND-PLANT-007 — Nearby nursery stock recommendations appear
- **Preconditions:** A nursery within range has approved stock of the selected species.
- **Expected Result:** Up to 3 "Recommended nearby" stock rows appear with distance/price, linking to `NurseryPublicProfile`.
- **Priority:** P3
- **Test Type:** Positive

#### IND-PLANT-008 — Duplicate-submit guard on Plant submission
- **Steps:** 1) Fill the form validly 2) Rapidly tap Submit multiple times
- **Expected Result:** Submit disables on first tap (`mutation.isPending`); only one tree is created.
- **Priority:** P1
- **Test Type:** Regression

#### IND-PLANT-009 — 403 rejection surfaces the server's actual reason
- **Preconditions:** Simulate/force a server-side 403 (e.g. rate-limited, or a genuinely disallowed condition).
- **Expected Result:** The inline error shows the backend's real rejection message, not a generic hardcoded one.
- **Priority:** P2
- **Test Type:** Error Handling

#### IND-PLANT-010 — Plant Tree screen presented modally, swipe-down dismiss
- **Steps:** 1) Open Plant Tree 2) Swipe down / tap back before submitting
- **Expected Result:** Modal dismisses cleanly, no partial tree is created, no crash.
- **Priority:** P2
- **Test Type:** Negative

---

### A5. Plant Photo Verification ("AI Scanner")

**Important scope note:** the implemented feature verifies **"does this photo show a genuine planting moment"** — it does **not** identify tree/plant species. If the product brief implied a species-identifying AI scanner, that does not exist in the current build; species is always chosen manually from a grid. Test cases below reflect only what exists.

#### IND-VERIFY-001 — Valid planting photo passes AI verification
- **Preconditions:** Camera permission granted.
- **Steps:** 1) Capture a photo that plausibly shows a planting action 2) Observe the ~3.8s "AI Analyzing…" animation 3) Wait for it to resolve
- **Expected Result:** `POST /api/trees/verify-photo` returns `isPlanting: true`; flow proceeds to species selection.
- **Priority:** P0
- **Test Type:** Positive

#### IND-VERIFY-002 — Non-planting photo is rejected by AI verification
- **Steps:** 1) Capture a photo unrelated to planting (e.g. a selfie, a wall)
- **Expected Result:** A "Couldn't Verify Planting" modal appears showing the server's rejection reason; flow resets to the upload/camera stage (no forced app restart needed).
- **Priority:** P0
- **Test Type:** Negative

#### IND-VERIFY-003 — Verification pre-check fails open when offline/API error
- **Preconditions:** Airplane mode or forced API failure specifically for `/api/trees/verify-photo`.
- **Steps:** 1) Capture a valid photo while the verify-photo endpoint is unreachable
- **Expected Result:** The client-side pre-check fails open (does not block progress) since final submission re-verifies server-side regardless — confirm the flow still proceeds to species selection rather than getting stuck.
- **Priority:** P1
- **Test Type:** Error Handling
- **Notes:** Confirms defense-in-depth design — verify final submit still enforces verification even though the pre-check was skipped.

#### IND-VERIFY-004 — Mock/fake GPS location blocks submission
- **Preconditions:** A test device with a mock-location/fake-GPS app enabled (Android developer option).
- **Steps:** 1) Complete the planting flow through to final submit with mock location active
- **Expected Result:** Submission is blocked client-side with an explicit error: "Your device is reporting a mock/fake GPS location. Please disable mock locations and try again."
- **Priority:** P0
- **Test Type:** Negative / Anti-fraud
- **Notes:** Genuine anti-cheat control — high-value regression case for every release.

#### IND-VERIFY-005 — Location outside an ARTH-approved planting zone
- **Preconditions:** Device physically (or simulated) outside any approved zone.
- **Steps:** 1) Reach the location stage of Plant Tree with such a position
- **Expected Result:** "Not an ARTH Approved Spot" modal appears; final submit button is disabled. (Client check is a UX pre-check only — actual enforcement is server-side.)
- **Priority:** P0
- **Test Type:** Negative

#### IND-VERIFY-006 — GPS accuracy unavailable still allows submission with sentinel value
- **Preconditions:** Device reports no accuracy figure.
- **Expected Result:** A sentinel value (9999) is sent rather than omitting the field, so the server can reject cleanly with a clear validation message rather than a generic schema error.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-VERIFY-007 — Location permission denied at the Plant Tree stage
- **Steps:** 1) Deny location permission when prompted during Plant Tree
- **Expected Result:** "Location Unavailable / Tap to try again, or enable location in Settings" message shown; no crash; user can retry after granting permission in device settings.
- **Priority:** P0
- **Test Type:** Permission

#### IND-VERIFY-008 — Pre-verified location from Map's "Plant where you are" skips re-check
- **Preconditions:** User taps "Plant where you are" on the Map tab first.
- **Steps:** 1) From Map, use "Plant where you are" (passes `verifiedLat/verifiedLng` params) 2) Proceed through Plant Tree
- **Expected Result:** Location is trusted immediately (`eligible=true`) without a second eligibility re-check on entering the details stage — but final submit still takes a **fresh** GPS reading regardless (see IND-VERIFY-009).
- **Priority:** P2
- **Test Type:** Integration

#### IND-VERIFY-009 — Final submit always takes a fresh GPS reading, even if pre-verified
- **Steps:** 1) Enter Plant Tree with a pre-verified location 2) Physically/simulate moving to a different location before hitting final Submit
- **Expected Result:** Submit re-acquires a brand-new high-accuracy GPS fix rather than reusing the earlier coordinate — verify the submitted coordinate reflects the new position, not the stale one.
- **Priority:** P1
- **Test Type:** Negative / Anti-fraud

#### IND-VERIFY-010 — Location permission revoked between stages
- **Steps:** 1) Grant location, proceed to details 2) Revoke location permission (device settings) 3) Return to app and hit Submit
- **Expected Result:** Submit fails gracefully with an inline error rather than crashing.
- **Priority:** P1
- **Test Type:** Permission

---

### A6. Map / Discovery

Screen: `MapScreen`, `NgoDirectoryScreen`, `NurseryDirectoryScreen` (individual-viewer paths).

#### IND-MAP-001 — Map loads with location tracking enabled
- **Preconditions:** "Location Tracking" setting ON; location permission granted.
- **Expected Result:** Map centers with a "you are here" pin; GPS FAB shows the active (📍) icon.
- **Priority:** P1
- **Test Type:** Positive

#### IND-MAP-002 — Map with "Location Tracking" setting OFF
- **Preconditions:** Setting toggled off in Settings.
- **Expected Result:** Map does not request permission or auto-center; no crash; GPS FAB reflects the disabled state.
- **Priority:** P2
- **Test Type:** Positive

#### IND-MAP-003 — Location permission denied on Map
- **Steps:** 1) With Location Tracking ON, deny the OS permission prompt
- **Expected Result:** Map still renders (no crash); "you are here" pin/GPS button shows a warning (⚠️) icon instead of the active icon.
- **Priority:** P1
- **Test Type:** Permission

#### IND-MAP-004 — "Plant where you are" runs the same eligibility pre-check as Plant Tree
- **Steps:** 1) Tap the "Plant where you are" map action in each of: location unavailable / not-approved zone / check-failed conditions
- **Expected Result:** The matching one of three `StatusModal`s is shown before any navigation to `PlantTree` occurs.
- **Priority:** P1
- **Test Type:** Integration

#### IND-MAP-005 — Map error boundary in Expo Go
- **Preconditions:** Running under Expo Go (no native `react-native-maps` module).
- **Steps:** 1) Navigate to the Map tab
- **Expected Result:** A graceful fallback message is shown ("Map isn't available in Expo Go on Android. Build a dev client to use this tab.") instead of a crash.
- **Priority:** P1
- **Test Type:** Error Handling

#### IND-MAP-006 — NGO Directory search by name/city
- **Steps:** 1) Open NGO Directory 2) Type a partial NGO name or city
- **Expected Result:** Results filter accordingly; tapping a result opens `NgoPublicProfile`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-MAP-007 — Nursery Directory "Delivers" and "Nearby" filter chips
- **Preconditions:** Location permission granted for "Nearby".
- **Steps:** 1) Toggle "🚚 Delivers" 2) Toggle "📍 Nearby"
- **Expected Result:** List filters to delivery-capable nurseries; Nearby shows per-row distance and re-sorts by proximity.
- **Priority:** P2
- **Test Type:** Positive

#### IND-MAP-008 — Directory search with no results
- **Test Data:** A nonsense search string.
- **Expected Result:** Empty state shown, no crash.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-MAP-009 — Directory list performance with a very large result set
- **Preconditions:** A large number of NGOs/Nurseries exist server-side.
- **Expected Result:** No client-side pagination/"load more" UI was found on either directory — verify how the screen behaves (scroll performance, any silent server-side truncation) with hundreds of results.
- **Priority:** P3
- **Test Type:** Boundary
- **Notes:** Flagged — no visible pagination control in the mobile UI for either directory.

---

### A7. Tree Details (Map / Forest)

**Scope note:** no dedicated "individual tree detail" screen (equivalent to the NGO's `NgoTreeDetailScreen`) was found for a planter's own trees — a planted tree's information is surfaced via **Map pins** and the **Forest** visualization, not a standalone detail page. Test cases below verify that surfacing rather than assuming a screen that doesn't exist.

#### IND-TREE-001 — Tapping a planted-tree pin on the Map shows its info
- **Preconditions:** At least one tree planted and visible on the map.
- **Steps:** 1) Open Map tab 2) Tap a tree pin
- **Expected Result:** Some form of tree info surfaces (species/date/photo). **Tester to confirm and document the exact fields shown**, since this wasn't independently verified at the code level in this audit pass.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Verify exact pin-tap UI on-device; do not assume specific fields beyond what's observed.

#### IND-TREE-002 — Forest visualization scales with tree count
- **Preconditions:** Accounts with 0, 1, and many planted trees.
- **Steps:** 1) Open Forest tab on each account
- **Expected Result:** The Skia-rendered forest canvas visibly scales/grows with `treesPlantedCount`; day/night cycle renders.
- **Priority:** P2
- **Test Type:** Positive

#### IND-TREE-003 — Forest snapshot → Story posting
- **Steps:** 1) On Forest, tap "Snapshot" 2) Confirm posting as a Story
- **Expected Result:** Current forest scene is captured and opens `StoryPreviewModal`; posting succeeds.
- **Priority:** P3
- **Test Type:** Positive

#### IND-TREE-004 — Forest snapshot failure
- **Preconditions:** Simulate a snapshot/capture failure.
- **Expected Result:** Confirm dialog: "Snapshot failed... please try again" — no crash.
- **Priority:** P3
- **Test Type:** Error Handling

#### IND-TREE-005 — Locked forest theme tap gives no explanation (Forest tab)
- **Steps:** 1) On Forest's theme strip, tap a locked/unearned theme
- **Expected Result:** Currently, nothing happens — no explanatory message (unlike the Profile → Achievements tab's theme picker, which does explain locked themes).
- **Priority:** P3
- **Test Type:** Regression
- **Notes:** Flagged inconsistency — see Potential Issues.

#### IND-TREE-006 — Decoration placement in Forest
- **Steps:** 1) Tap a decoration zone 2) Choose a decoration from the picker sheet 3) Place it
- **Expected Result:** Decoration appears in the forest scene; can be moved/deleted via "Decorate" mode toggle.
- **Priority:** P3
- **Test Type:** Positive

#### IND-TREE-007 — Freehand river/stream drawing below minimum size is discarded
- **Steps:** 1) In Decorate mode, draw a very short river stroke
- **Expected Result:** Stroke shorter than `MIN_DRAWN_EXTENT` is discarded, not saved as a decoration.
- **Priority:** P3
- **Test Type:** Boundary

---

### A8. Adoption

Screens: `AdoptTreeListScreen`, `AdoptTreeDetailScreen`, `MyAdoptionsScreen`.

#### IND-ADOPT-001 — Browse adoptable trees list
- **Expected Result:** Location-sorted list of adoptable trees; already-adopted trees show an "Adopted" badge.
- **Priority:** P1
- **Test Type:** Positive

#### IND-ADOPT-002 — Adopt an available tree with a dedication message
- **Steps:** 1) Open an available tree's detail 2) Enter an optional message 3) Tap "Adopt this tree"
- **Expected Result:** No confirmation dialog is shown (single tap commits); success banner appears in-page (no navigation away, preventing accidental double-adopt via re-tap).
- **Priority:** P0
- **Test Type:** Positive

#### IND-ADOPT-003 — Attempt to adopt a tree someone else just adopted (race condition)
- **Preconditions:** Two devices/testers open the same tree detail simultaneously.
- **Steps:** 1) Both tap "Adopt" at nearly the same time
- **Expected Result:** Only one adoption succeeds; the second sees an "already taken" banner instead of a duplicate adoption or crash.
- **Priority:** P1
- **Test Type:** Negative / Concurrency

#### IND-ADOPT-004 — View a removed/delisted adoptable tree
- **Preconditions:** NGO has removed the tree listing (prerequisite: NGO performs "Remove listing").
- **Expected Result:** Detail screen shows a "no longer available" banner rather than an error or crash.
- **Priority:** P2
- **Test Type:** Negative
- **Dependencies:** NGO-side "Remove listing" action

#### IND-ADOPT-005 — Release an adopted tree
- **Preconditions:** User has an active adoption.
- **Steps:** 1) Open `MyAdoptionsScreen` 2) Tap "Release" on a tree → confirm
- **Expected Result:** Confirm dialog required ("This tree will go back into the adoptable pool…"); tree returns to the public adoptable pool afterward.
- **Priority:** P1
- **Test Type:** Positive

#### IND-ADOPT-006 — My Adoptions empty state
- **Preconditions:** No adoptions.
- **Expected Result:** Role-appropriate `EmptyState` shown.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-ADOPT-007 — Adoption message with very long text
- **Test Data:** A 2000+ character message.
- **Expected Result:** No client-side length cap was observed — verify server behavior/UI wrapping doesn't break the layout.
- **Priority:** P3
- **Test Type:** Boundary

---

### A9. NGO Drives & Campaigns (Discovery/Participation)

Screens: `DrivesListScreen`, `DriveDetailScreen`, `CampaignsListScreen`, `CampaignDetailScreen` (individual-viewer paths).

#### IND-DRIVE-001 — Browse nearby drives, sorted by distance
- **Preconditions:** Location permission granted.
- **Expected Result:** Drives list sorted by distance from device location; each card shows NGO name, address/distance, date, capacity.
- **Priority:** P1
- **Test Type:** Positive

#### IND-DRIVE-002 — RSVP to an open drive
- **Steps:** 1) Open a drive with available capacity 2) Tap "I'm in – RSVP"
- **Expected Result:** Haptic feedback; button flips to "Cancel my RSVP"; drive's "Going" badge appears on the list.
- **Priority:** P0
- **Test Type:** Positive

#### IND-DRIVE-003 — RSVP to a full drive
- **Preconditions:** Drive at capacity.
- **Expected Result:** RSVP button shows "Drive is full" and is disabled.
- **Priority:** P1
- **Test Type:** Boundary

#### IND-DRIVE-004 — Cancel an existing RSVP
- **Steps:** 1) On an RSVP'd drive, tap "Cancel my RSVP"
- **Expected Result:** No confirmation dialog (flagged as inconsistent with other destructive actions elsewhere); RSVP is removed immediately.
- **Priority:** P2
- **Test Type:** Negative

#### IND-DRIVE-005 — View a cancelled/completed drive as a non-owner
- **Expected Result:** A status banner is shown instead of RSVP controls.
- **Priority:** P2
- **Test Type:** State Transition

#### IND-DRIVE-006 — Sponsor a plant on a drive (Stripe configured)
- **Preconditions:** Stripe test keys configured in the build.
- **Steps:** 1) Open a drive with sponsorable plants 2) Tap "Sponsor" on a species row 3) Complete the Stripe payment sheet
- **Expected Result:** Payment intent created; sponsorship recorded on success.
- **Priority:** P1
- **Test Type:** Positive
- **Dependencies:** Stripe test configuration

#### IND-DRIVE-007 — Sponsor a plant when Stripe isn't configured (dev/local)
- **Expected Result:** No `clientSecret` is returned, so the app treats it as already-succeeded and skips straight to a success state (documented fallback, not a bug).
- **Priority:** P2
- **Test Type:** Integration

#### IND-DRIVE-008 — Sponsorship attempted when the payments service is unavailable
- **Preconditions:** Simulate `SERVICE_UNAVAILABLE` error code from the API.
- **Expected Result:** Friendly "Sponsorship payments aren't live yet" message, not a raw error dump.
- **Priority:** P2
- **Test Type:** Error Handling

#### IND-DRIVE-009 — Duplicate-tap guard on RSVP/Sponsor
- **Steps:** Rapidly double-tap "I'm in – RSVP" or "Sponsor"
- **Expected Result:** Button disables on first tap while the mutation is pending; no duplicate RSVP/sponsorship.
- **Priority:** P1
- **Test Type:** Regression

#### IND-DRIVE-010 — Drive list → detail navigation is instant (cache preseed)
- **Steps:** 1) Tap a drive card from the list
- **Expected Result:** Detail screen paints instantly using the list item's cached data rather than showing a loading spinner first.
- **Priority:** P3
- **Test Type:** Regression

#### IND-CAMP-001 — Browse active campaigns with progress bar
- **Expected Result:** Each campaign shows a raised/goal progress bar.
- **Priority:** P1
- **Test Type:** Positive

#### IND-CAMP-002 — View a closed campaign
- **Expected Result:** "No longer accepting donations" banner replaces the donate form.
- **Priority:** P2
- **Test Type:** State Transition

---

### A10. Donations

Screen: `CampaignDetailScreen` (donation form), `MyDonationsScreen`.

#### IND-DON-001 — Donate using a preset amount chip
- **Steps:** 1) Open an active campaign 2) Tap the ₹500 chip 3) Tap Donate 4) Complete payment
- **Expected Result:** Donation intent created; on success, an in-page "💚 Thank you!" banner replaces the donate form (no navigation away, preventing accidental double-donation).
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** Stripe test configuration or dev-mode skip

#### IND-DON-002 — Donate a custom amount below ₹1
- **Test Data:** Amount: `0`
- **Expected Result:** Inline error "Enter an amount of at least ₹1."; submit blocked.
- **Priority:** P1
- **Test Type:** Boundary

#### IND-DON-003 — Donate a custom amount with non-numeric input
- **Test Data:** `abc`
- **Expected Result:** Field only accepts digits (sanitized) or shows validation error.
- **Priority:** P2
- **Test Type:** Validation

#### IND-DON-004 — Donate an extremely large custom amount
- **Test Data:** `9999999999`
- **Expected Result:** No client-side upper bound was observed — verify server-side handling/payment gateway limits rather than assuming rejection.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-DON-005 — User cancels the Stripe payment sheet mid-donation
- **Steps:** 1) Start a donation 2) Dismiss the Stripe sheet without completing payment
- **Expected Result:** Cancellation is treated as a non-error (`code === 'Canceled'`); `paying` state resets silently; user can retry.
- **Priority:** P1
- **Test Type:** Negative

#### IND-DON-006 — Donate to a campaign, then view it in My Donations
- **Steps:** 1) Complete a donation 2) Open Settings → My Donations
- **Expected Result:** Donation appears with status `succeeded` (or `pending`/`failed` depending on outcome); tapping it opens `CampaignDetail`.
- **Priority:** P1
- **Test Type:** Integration

#### IND-DON-007 — My Donations list has no pagination for large history
- **Preconditions:** An account with a very large donation history (if obtainable).
- **Expected Result:** No infinite-scroll/"load more" was found on this screen — verify behavior at scale.
- **Priority:** P3
- **Test Type:** Boundary
- **Notes:** Flagged — see Potential Issues.

---

### A11. Streaks

Screens: streak displays on `HomeScreen`/`ForestScreen`/`UserProfileScreen`; `StreakProtectionScreen`.

#### IND-STREAK-001 — Streak counter increments after planting on a new day
- **Preconditions:** Last planting was on a previous calendar day.
- **Steps:** 1) Plant a tree today
- **Expected Result:** `streakCurrent` increments by 1; reflected on Home's fire-emoji counter.
- **Priority:** P1
- **Test Type:** Positive

#### IND-STREAK-002 — Streak calendar on Profile → Achievements
- **Expected Result:** Weekly streak calendar renders via `useStreakCalendar`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-STREAK-003 — StreakProtectionScreen has no discoverable in-app entry point
- **Scenario:** Tester attempts to reach the streak-protection flow through every plausible path (Home, Notifications tap on a streak-risk notice, push-notification tap).
- **Steps:** 1) Let a streak lapse (or simulate being at risk) 2) Check Home, Notifications, and push notification tap-through for any route into `StreakProtectionScreen`
- **Expected Result:** **Unclear / to be confirmed on-device** — static analysis found no call site that navigates to this route anywhere in the current build. Document whatever is actually observed rather than assuming the screen is reachable.
- **Priority:** P0
- **Test Type:** Regression
- **Notes:** High-priority flag — see Potential Issues. If genuinely unreachable, streak-freeze/XP-spend recovery is effectively a dead feature despite being fully built.

#### IND-STREAK-004 — Tapping a "streak_at_risk"/"streak_broken" notification
- **Preconditions:** Such a notification exists (server-triggered).
- **Steps:** 1) Tap the notification row in `NotificationsScreen`
- **Expected Result:** Currently, no deep-link target is wired for these types — the row is marked read but no navigation occurs. Confirm this is the actual observed behavior.
- **Priority:** P1
- **Test Type:** Negative
- **Notes:** Flagged — see Potential Issues.

#### IND-STREAK-005 — If reached directly, Use Streak Freeze with freezes available
- **Preconditions:** `streakFreezesAvailable > 0` (requires a way to reach the screen — direct deep link/dev menu if no in-app path exists).
- **Steps:** 1) Select "Use Streak Freeze" 2) Confirm
- **Expected Result:** `POST /api/streaks/protect` with `{method:'freeze'}`; freeze count decrements; success animation shows updated streak.
- **Priority:** P2
- **Test Type:** Positive

#### IND-STREAK-006 — Use Streak Freeze with zero freezes available
- **Expected Result:** Option is disabled.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-STREAK-007 — Spend XP Tokens with insufficient XP
- **Preconditions:** `user.xp < 100`.
- **Expected Result:** Option disabled.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-STREAK-008 — "Plant a Tree Now" option from Streak Protection
- **Expected Result:** Navigates (`replace`) directly into `PlantTreeScreen` — this option itself does not call the protect API.
- **Priority:** P2
- **Test Type:** Positive

---

### A12. Impact / Statistics

Screen: `EcoInsightsScreen`, contribution stats on `UserProfileScreen`.

#### IND-IMPACT-001 — Your Impact card renders and is shareable
- **Steps:** 1) Open EcoInsights 2) Tap "Share" on the Your Impact card
- **Expected Result:** A branded share card renders CO₂/trees/streak stats; native share sheet opens.
- **Priority:** P2
- **Test Type:** Positive

#### IND-IMPACT-002 — Content pills display static + live content
- **Expected Result:** 4 static pills (Why It Matters/India's Forests/One Tree's Power/How You Help) plus a live "Did You Know" pill from `useEcoFacts`.
- **Priority:** P3
- **Test Type:** Positive

#### IND-IMPACT-003 — "Did You Know" empty state
- **Preconditions:** No eco facts returned.
- **Expected Result:** "Fresh facts are on their way — check back soon." message.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-IMPACT-004 — "Plant Your First Tree" CTA for a zero-tree account
- **Expected Result:** CTA navigates to `PlantTreeScreen`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-IMPACT-005 — Contributions tab on own profile shows CO₂/trees/drives-joined
- **Expected Result:** Stat card renders correctly for accounts with and without activity.
- **Priority:** P2
- **Test Type:** Positive

---

### A13. Profile

Screens: `UserProfileScreen` (own + public), `EditProfileScreen`, `EmojiPickerScreen`, `HomeThemePickerScreen`, `FriendsListScreen`.

#### IND-PROFILE-001 — Edit profile: change name/handle/bio within limits
- **Test Data:** Name ≤60 chars; Handle ≥3 chars, lowercase/numbers/underscore only, ≤30 chars; Bio ≤160 chars
- **Expected Result:** Save succeeds; confirm dialog then back navigation.
- **Priority:** P1
- **Test Type:** Positive

#### IND-PROFILE-002 — Handle with invalid characters
- **Test Data:** Handle: `John Doe!`
- **Expected Result:** Auto-lowercased/sanitized as typed; disallowed characters stripped or rejected per the `^[a-z0-9_]+$` rule.
- **Priority:** P1
- **Test Type:** Validation

#### IND-PROFILE-003 — Handle under 3 characters
- **Test Data:** `ab`
- **Expected Result:** Inline error: "Handle must be at least 3 characters…"
- **Priority:** P2
- **Test Type:** Boundary

#### IND-PROFILE-004 — Handle change with no availability check until submit
- **Steps:** 1) Change handle to one already taken by another user 2) Submit
- **Expected Result:** No live availability check exists on this screen (unlike registration's email check) — error only surfaces after submit, from the server. Confirm this is the actual behavior.
- **Priority:** P2
- **Test Type:** Negative
- **Notes:** Flagged inconsistency vs. registration flow — see Potential Issues.

#### IND-PROFILE-005 — Empty name on submit
- **Expected Result:** Inline "Name cannot be empty." error.
- **Priority:** P1
- **Test Type:** Validation

#### IND-PROFILE-006 — Bio at 160-character boundary
- **Test Data:** Exactly 160 and 161 characters.
- **Expected Result:** Char counter shown; 160 accepted, 161 blocked/truncated.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-PROFILE-007 — No photo upload for avatar — emoji only
- **Steps:** 1) Open Edit Profile 2) Tap the avatar
- **Expected Result:** Opens `EmojiPickerScreen` only — confirm there is genuinely no camera/gallery photo option for Individual avatars.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Confirms a scope boundary — Individual users cannot upload a real photo as their avatar.

#### IND-PROFILE-008 — View another user's public profile
- **Steps:** 1) From a post/comment, tap another user's name
- **Expected Result:** Public-mode profile loads (back button, "⋯" menu with Report/Block/Add-or-Remove-Friend as applicable).
- **Priority:** P1
- **Test Type:** Positive

#### IND-PROFILE-009 — Send and receive a friend request
- **Steps:** 1) On another user's public profile, tap "Add Friend" 2) On the other account, accept via Notifications
- **Expected Result:** Requesting side shows "Requested" (disabled); accepting side gets a `friend_request` notification whose accept/decline banner works; both sides become friends.
- **Priority:** P1
- **Test Type:** Integration

#### IND-PROFILE-010 — Remove a friend
- **Steps:** 1) On a friend's public profile "⋯" menu, tap "Remove friend" → confirm
- **Expected Result:** Confirm dialog required; friendship removed.
- **Priority:** P2
- **Test Type:** Positive

#### IND-PROFILE-011 — Report another user
- **Steps:** 1) "⋯" menu → Report → choose reason → submit
- **Expected Result:** Report is filed; appears later in `MyReportsScreen` with status "Under review."
- **Priority:** P1
- **Test Type:** Positive

#### IND-PROFILE-012 — Block another user
- **Steps:** 1) "⋯" menu → Block → confirm
- **Expected Result:** Navigates back automatically on success; blocked user appears in `BlockedAccountsScreen`.
- **Priority:** P1
- **Test Type:** Positive

#### IND-PROFILE-013 — Own posts grid pagination
- **Preconditions:** 20+ posts on the account.
- **Steps:** 1) Scroll the Posts tab on own profile
- **Expected Result:** Cursor-based `fetchNextPage` loads more without duplication or gaps.
- **Priority:** P2
- **Test Type:** Positive

#### IND-PROFILE-014 — Home theme picker: preview then apply
- **Steps:** 1) Open Home Theme Picker 2) Tap Preview on a theme 3) Tap Apply
- **Expected Result:** Full-screen live preview renders the real Home layout in that theme; Apply persists via settings and updates Home immediately.
- **Priority:** P3
- **Test Type:** Positive

#### IND-PROFILE-015 — Achievements tab: locked forest theme shows explanation
- **Steps:** 1) On Profile → Achievements, tap a locked forest theme
- **Expected Result:** "Keep planting trees to unlock this forest theme!" message shown (contrast with A7's Forest-tab picker, which shows nothing — verify both independently).
- **Priority:** P3
- **Test Type:** Regression

---

### A14. Settings

Screen: `SettingsScreen`.

#### IND-SET-001 — Toggle Ambient Mode / Nature Sounds / Haptics / Reduce Motion
- **Expected Result:** Each toggle persists via settings mutation (Reduce Motion is a local-only override via context, not server-persisted) — verify by relaunching the app.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SET-002 — Toggle Push Notifications off
- **Expected Result:** Setting persists; verify no further pushes are received while off (best tested with a real notification trigger).
- **Priority:** P2
- **Test Type:** Positive

#### IND-SET-003 — Toggle Location Tracking off, then check Map behavior
- **Expected Result:** Consistent with IND-MAP-002 — Map stops auto-requesting location.
- **Priority:** P2
- **Test Type:** Integration

#### IND-SET-004 — Delete Account requires only a confirm dialog, no password
- **Steps:** 1) Settings → Delete Account → confirm in the dialog
- **Expected Result:** `DELETE /api/users/me` fires immediately after the client-side confirm — **no password/re-authentication step exists**. Account is deleted, user logged out, routed to Login.
- **Priority:** P0
- **Test Type:** Negative / Security
- **Notes:** Flagged — irreversible action gated only by a confirm dialog, no re-auth. See Potential Issues.

#### IND-SET-005 — Delete Account, then attempt to log back in
- **Steps:** 1) Delete account 2) Try logging in with the same credentials
- **Expected Result:** Login should fail (account no longer exists) — verify actual server response/message.
- **Priority:** P1
- **Test Type:** Negative

#### IND-SET-006 — Change Password / Connected Devices navigation
- **Expected Result:** Both rows navigate correctly to their respective screens (covered in A1).
- **Priority:** P3
- **Test Type:** Positive

#### IND-SET-007 — "Send Feedback" opens mailto
- **Expected Result:** Device's mail client opens with a pre-filled address.
- **Priority:** P3
- **Test Type:** Positive

#### IND-SET-008 — Settings screen role-specific rows only shown for Individual
- **Expected Result:** My Sapling Reservations, My Orders, Wishlist, Delivery Addresses, My Adopted Trees, My Donations, My Sponsorships, My Reviews all appear (Individual-only block); confirm these do **not** appear when logged in as NGO/Nursery.
- **Priority:** P2
- **Test Type:** Regression
- **Dependencies:** NGO and Nursery test accounts for comparison

---

### A14b. Blocked Accounts & Following

Screens: `BlockedAccountsScreen`, `FollowingScreen` (both reachable from Settings, and shared verbatim by all three roles — see B17/C13 for the NGO/Nursery re-verification cases).

#### IND-SET-009 — View blocked accounts list
- **Role:** Individual
- **Feature:** `BlockedAccountsScreen` (Settings → Safety → Blocked Accounts)
- **Preconditions:** At least one blocked user/NGO/nursery (via the ⋯ menu, IND-PROFILE-012).
- **Expected Result:** Blocked entries show name/handle (or "Organisation" for NGOs) and an "Unblock" action; an intro line explains blocking is bidirectional ("neither of you sees the other's posts or stories").
- **Priority:** P2
- **Test Type:** Positive

#### IND-SET-010 — Unblock a user requires confirmation
- **Steps:** 1) Tap "Unblock" on a blocked entry → confirm in the dialog
- **Expected Result:** Confirm dialog required (unlike blocking itself, which has no confirm at the ⋯ menu — see IND-PROFILE-012); entry is removed from the list on confirm.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SET-011 — Blocked accounts empty state
- **Expected Result:** "Nobody is blocked" with guidance to use the ⋯ menu on a post to block someone.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-SET-012 — Pull-to-refresh on Blocked Accounts
- **Expected Result:** List refetches without duplicating rows.
- **Priority:** P3
- **Test Type:** Positive

#### IND-SET-013 — View "Following" (Settings → My Activity → Following)
- **Role:** Individual
- **Feature:** `FollowingScreen` — distinct from the Home "Following" feed tab (posts); this is the account list of NGOs/nurseries followed.
- **Preconditions:** Following ≥1 NGO and ≥1 nursery, with at least one still `pending` (approval-required policy).
- **Expected Result:** Two labelled sections, "NGOs" and "Nurseries"; a pending entry shows "· Requested" next to its city.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SET-014 — Unfollow from the Following list has no confirmation
- **Steps:** 1) Tap "Unfollow" on an entry
- **Expected Result:** Unfollows immediately with no confirm dialog (consistent with IND-SOCIAL-015's public-profile unfollow); entry disappears from the list.
- **Priority:** P2
- **Test Type:** Regression

#### IND-SET-015 — Tapping a Following row opens that org's public profile
- **Expected Result:** Navigates to `NgoPublicProfile`/`NurseryPublicProfile` as appropriate.
- **Priority:** P3
- **Test Type:** Positive

#### IND-SET-016 — Following list empty state
- **Expected Result:** "Not following anyone yet" — distinct copy from the Home Following-feed's empty state (IND-SOCIAL-019); verify both are independently correct rather than assuming they share text.
- **Priority:** P3
- **Test Type:** Boundary

---

### A15. Notifications

Screen: `NotificationsScreen`.

#### IND-NOTIF-001 — Opening Notifications marks all unread as read
- **Preconditions:** 3+ unread notifications of mixed types.
- **Steps:** 1) Open Notifications screen
- **Expected Result:** Entire batch is marked read in one call on screen open (not per-row); unread highlight/dot clears.
- **Priority:** P1
- **Test Type:** Positive
- **Notes:** Confirms batch-read behavior, not per-item — relevant if a UAT case expects granular read-state.

#### IND-NOTIF-002 — Notifications grouped by day
- **Expected Result:** Sections: Today / Yesterday / N days ago / date, in that order.
- **Priority:** P2
- **Test Type:** Positive

#### IND-NOTIF-003 — Tap a post-like notification
- **Expected Result:** Navigates to `PostDetail` for the relevant post.
- **Priority:** P1
- **Test Type:** Positive

#### IND-NOTIF-004 — Tap a follow-request notification
- **Expected Result:** Navigates to the relevant follow-request screen.
- **Priority:** P1
- **Test Type:** Positive

#### IND-NOTIF-005 — Tap a reservation_fulfilled/declined notification
- **Expected Result:** Navigates to `MySaplingReservations`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-NOTIF-006 — Tap an order-status notification with no orderId in payload
- **Expected Result:** Falls back to `MyOrders` list rather than crashing on a missing param.
- **Priority:** P2
- **Test Type:** Error Handling

#### IND-NOTIF-007 — Tap a cart_abandoned / wishlist_back_in_stock notification
- **Expected Result:** Navigates to `Cart` / `Wishlist` respectively.
- **Priority:** P2
- **Test Type:** Positive

#### IND-NOTIF-008 — Empty notifications state
- **Expected Result:** `EmptyState` with a 🔔 icon.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-NOTIF-009 — Infinite scroll pagination
- **Preconditions:** 50+ notifications.
- **Expected Result:** Scrolling near the bottom (threshold 0.6) loads more without gaps/dupes.
- **Priority:** P2
- **Test Type:** Positive

#### IND-NOTIF-010 — streak_at_risk/streak_broken tap — see IND-STREAK-004 (cross-reference, not duplicated here).

---

### A16. Other Implemented Features

#### A16a. Marketplace (Sapling Reservations, Cart, Checkout, Orders, Wishlist, Addresses)

#### IND-CART-001 — Reserve a sapling directly from a nursery (free reservation path)
- **Steps:** 1) Open a nursery's stock item 2) Set quantity via stepper (bounded 1..stock.quantity) 3) Add optional message 4) Submit
- **Expected Result:** In-page "Request sent!" banner (no navigation away); appears in `MySaplingReservationsScreen` as pending.
- **Priority:** P1
- **Test Type:** Positive

#### IND-CART-002 — Reservation quantity stepper boundaries
- **Steps:** 1) Try to decrement below 1 2) Try to increment above available stock
- **Expected Result:** Stepper is bounds-checked both directions; cannot go below 1 or above `stock.quantity`.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-CART-003 — Reserve from a sold-out item
- **Expected Result:** Form is replaced with a sold-out banner; no reservation possible.
- **Priority:** P2
- **Test Type:** Boundary

#### IND-CART-004 — Cancel a pending sapling reservation
- **Steps:** 1) Open `MySaplingReservationsScreen` 2) Tap "Cancel request" on a pending item → confirm
- **Expected Result:** Confirm dialog required; only shown while status is `pending`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-CART-005 — Add to cart and adjust quantity
- **Steps:** 1) Add an item to cart 2) Adjust quantity via stepper
- **Expected Result:** Same bounds-checking as reservation; heart/wishlist icon in header adds to wishlist with no confirmation/loading feedback.
- **Priority:** P2
- **Test Type:** Positive

#### IND-CART-006 — Decrement cart item quantity to 0 removes it
- **Steps:** 1) In Cart, decrement an item's quantity to 0
- **Expected Result:** Item is removed from the cart entirely (different behavior than the Reservation/AddToCart steppers, which floor at 1 — verify this is intentional).
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged inconsistency between cart-decrement and other stepper screens.

#### IND-CART-007 — Empty cart state
- **Expected Result:** "Your cart is empty" message with browse-nursery guidance.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-CHECKOUT-001 — Checkout with an existing saved address
- **Steps:** 1) From Cart, tap "Proceed to checkout" 2) Select a saved address 3) Complete payment
- **Expected Result:** Order created; on success `navigation.replace('MyOrders')` (not push, so Back doesn't return to a stale checkout).
- **Priority:** P0
- **Test Type:** Positive

#### IND-CHECKOUT-002 — Add a new address via autocomplete suggestion
- **Steps:** 1) "+ Add a new address" 2) Type an address and select an autocomplete suggestion (captures lat/lng) 3) Enter a valid 6-digit pincode 4) Save
- **Expected Result:** Address saves successfully.
- **Priority:** P1
- **Test Type:** Positive

#### IND-CHECKOUT-003 — Add address by typing manually with no suggestion picked and no GPS
- **Steps:** 1) Type a complete, valid-looking address without tapping a suggestion 2) Do not tap "Use current location" 3) Tap Save
- **Expected Result:** Save is blocked with the error "Tap 'Use current location' so deliveries can be tracked to this address." even though the typed address is textually complete.
- **Priority:** P1
- **Test Type:** Negative
- **Notes:** Confirmed friction point by design (coords required for delivery tracking) — flagged in Potential Issues as worth a product-level confirmation.

#### IND-CHECKOUT-004 — Add address using "Use current location"
- **Steps:** 1) Grant location permission 2) Tap "Use current location"
- **Expected Result:** One-shot GPS fetch (note: **no timeout wrapper**, unlike other GPS reads in the app) → reverse-geocode; match auto-fills address + "✓ Matched from GPS"; no-match still saves raw coordinates with a "please type it above" note.
- **Priority:** P1
- **Test Type:** Positive
- **Notes:** On a weak-signal device, this call could hang indefinitely — flagged in Potential Issues; test on a device with poor GPS reception specifically.

#### IND-CHECKOUT-005 — Invalid pincode format
- **Test Data:** Pincode: `1234` (4 digits)
- **Expected Result:** Inline "Pincode must be 6 digits" error; save blocked.
- **Priority:** P1
- **Test Type:** Validation

#### IND-CHECKOUT-006 — Free delivery threshold boundary
- **Test Data:** Cart subtotal exactly ₹499 and ₹498.
- **Expected Result:** ₹499 shows free delivery; ₹498 shows the ₹49 flat fee (client-displayed estimate only — actual total is authoritative server-side).
- **Priority:** P2
- **Test Type:** Boundary

#### IND-CHECKOUT-007 — User cancels the Stripe payment sheet at checkout
- **Expected Result:** `paying` state resets silently, no error shown, cart is preserved.
- **Priority:** P1
- **Test Type:** Negative

#### IND-CHECKOUT-008 — Checkout with empty cart or no address selected
- **Expected Result:** Pay button remains disabled.
- **Priority:** P1
- **Test Type:** Validation

#### IND-ORDER-001 — Track an order through its full pickup lifecycle
- **Steps:** 1) Place a pickup order 2) (Prerequisite: nursery marks packed → ready_for_pickup) 3) View order detail at each stage
- **Expected Result:** Timeline updates; a Pickup code (OTP-style) appears once `ready_for_pickup`; entering it at the nursery (prerequisite: nursery confirms) transitions to `picked_up`.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** Nursery-side order actions (Section C10)

#### IND-ORDER-002 — Track an order through its full delivery lifecycle with live tracking
- **Steps:** 1) Place a delivery order 2) (Prerequisite: nursery packs, assigns a delivery partner, dispatches) 3) View order detail during `out_for_delivery`
- **Expected Result:** Live tracking map renders (lazy-loaded, error-boundary guarded for Expo Go); rider contact tap-to-call works; Delivery OTP shown; entering it (prerequisite: delivery partner/rider confirms) transitions to `delivered`.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** Nursery + delivery-partner-side actions

#### IND-ORDER-003 — Planting guide appears after handoff
- **Preconditions:** Order status `picked_up`/`delivered`/`plantation_verified`.
- **Expected Result:** Species-specific care card renders (sunlight/water/soil/etc.); silently renders nothing if the guide has no populated fields (no broken empty card).
- **Priority:** P2
- **Test Type:** Positive

#### IND-ORDER-004 — Leave a review after order handoff (delivery order)
- **Steps:** 1) On a handed-off delivery order with no review yet, rate nursery (1-5★) and delivery partner (1-5★), add a comment 2) Submit
- **Expected Result:** Both rating fields present since `fulfillmentType==='delivery'` and a rider was assigned; after submit, form locks and cannot be resubmitted.
- **Priority:** P1
- **Test Type:** Positive

#### IND-ORDER-005 — Leave a review after order handoff (pickup order)
- **Expected Result:** Only the nursery-rating field appears (no delivery-partner rating, since there's no rider).
- **Priority:** P2
- **Test Type:** Positive

#### IND-ORDER-006 — Cancel an order while still cancellable
- **Preconditions:** Order status `pending_payment` or `confirmed`.
- **Steps:** 1) Tap Cancel
- **Expected Result:** **No confirmation dialog appears** even though this is a paid order — cancels immediately.
- **Priority:** P1
- **Test Type:** Negative
- **Notes:** Flagged inconsistency — a paid-order cancellation has no confirm-gate unlike several lower-stakes actions elsewhere. See Potential Issues.

#### IND-ORDER-007 — Attempt to cancel an order past the cancellable window
- **Preconditions:** Order status `packed` or later.
- **Expected Result:** Cancel option is not offered.
- **Priority:** P1
- **Test Type:** Boundary

#### IND-ORDER-008 — My Orders status filter/list correctness
- **Expected Result:** All 9 statuses render with correct labels/colors.
- **Priority:** P2
- **Test Type:** Positive

#### IND-WISH-001 — Remove a wishlist item
- **Steps:** 1) Tap the heart icon on a wishlisted item
- **Expected Result:** Removed immediately, no confirmation dialog (consistent with the low-friction wishlist model).
- **Priority:** P3
- **Test Type:** Positive

#### IND-WISH-002 — Empty wishlist state
- **Expected Result:** "Nothing saved yet."
- **Priority:** P3
- **Test Type:** Boundary

#### IND-ADDR-001 — Set a non-default address as default
- **Expected Result:** "Set as default" appears only on non-default rows; tapping updates the default marker.
- **Priority:** P2
- **Test Type:** Positive

#### IND-ADDR-002 — Delete an address with no confirm dialog
- **Steps:** 1) Tap Delete on a saved address
- **Expected Result:** Deletes immediately with no confirmation; if the address is referenced by an in-flight order, an inline error should surface instead of silently failing (verify).
- **Priority:** P2
- **Test Type:** Negative
- **Notes:** Same address-form logic is duplicated between `AddressBookScreen` and `CheckoutScreen` — regressions in one may not propagate to the other; test both independently.

#### A16b. Social / Community

#### IND-SOCIAL-001 — Post composer: photo-only post
- **Steps:** 1) Open Post composer 2) Add 1-6 photos, no caption 3) Submit
- **Expected Result:** Succeeds (photo alone satisfies the "photo OR caption" requirement).
- **Priority:** P1
- **Test Type:** Positive

#### IND-SOCIAL-002 — Post composer: caption-only post
- **Expected Result:** Succeeds with no photo.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SOCIAL-003 — Post composer: neither photo nor caption
- **Expected Result:** Inline error "Add at least one photo or write something."; submit blocked.
- **Priority:** P1
- **Test Type:** Validation

#### IND-SOCIAL-004 — Post composer: attempt to select 7+ photos
- **Expected Result:** Gallery multi-select is capped to the remaining slots (max 6 total) — extra selections are trimmed, not rejected with an error.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-SOCIAL-005 — Story composer: exactly 1 photo required
- **Steps:** 1) Switch to Story tab 2) Attempt to submit with 0 photos
- **Expected Result:** Inline error "Pick a photo for your story."
- **Priority:** P2
- **Test Type:** Validation

#### IND-SOCIAL-006 — Story composer: selecting multiple photos keeps only the first
- **Expected Result:** Extra photos are silently truncated, not rejected.
- **Priority:** P3
- **Test Type:** Boundary

#### IND-SOCIAL-007 — Story expires after 24h
- **Preconditions:** A story posted >24h ago.
- **Expected Result:** No longer appears in the stories tray.
- **Priority:** P2
- **Test Type:** State Transition

#### IND-SOCIAL-008 — Like / unlike a post
- **Expected Result:** Like count updates immediately; toggling again removes the like.
- **Priority:** P1
- **Test Type:** Positive

#### IND-SOCIAL-009 — View who liked a post
- **Expected Result:** `PostLikesScreen` shows a cursor-paginated liker list; "No likes yet." when empty.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SOCIAL-010 — Save/unsave a post
- **Expected Result:** Reflected in `SavedPostsScreen`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SOCIAL-011 — Delete own post
- **Expected Result:** Post removed from feed/grid immediately; only available on own posts.
- **Priority:** P1
- **Test Type:** Positive

#### IND-SOCIAL-012 — View a deleted/moderated post via a stale deep link
- **Steps:** 1) Tap a notification/link pointing to a post that has since been deleted
- **Expected Result:** `PostDetailScreen` shows "This post is gone" empty state, not a crash or infinite spinner.
- **Priority:** P1
- **Test Type:** Error Handling

#### IND-SOCIAL-013 — Follow an NGO/Nursery with open follow policy
- **Expected Result:** Immediate "Following ✓" state.
- **Priority:** P1
- **Test Type:** Positive

#### IND-SOCIAL-014 — Follow an NGO/Nursery with approval-required follow policy
- **Expected Result:** Shows "Requested" (pending) until the org accepts (prerequisite: NGO/Nursery accepts via their Follower Requests screen).
- **Priority:** P1
- **Test Type:** State Transition
- **Dependencies:** NGO/Nursery-side accept action

#### IND-SOCIAL-015 — Unfollow with no confirmation
- **Expected Result:** Single tap unfollows immediately — no confirm dialog (flagged inconsistency vs. other destructive actions).
- **Priority:** P2
- **Test Type:** Regression

#### IND-SOCIAL-016 — Community "Quests/Challenges" join state after app restart
- **Steps:** 1) Join a challenge 2) Force-close and reopen the app 3) Return to the Challenges tab
- **Expected Result:** **Suspected desync** — joined-state (`joinedIds`) appears to be local React state only, not derived from server data. Verify whether "Joined ✓" persists correctly or reverts after a fresh mount.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Flagged as a likely data-desync bug candidate — see Potential Issues. Do not assume pass/fail; this must be observed on-device.

#### IND-SOCIAL-017 — Leaderboard pagination (Users/NGOs/Nurseries tabs)
- **Expected Result:** Numbered pager works correctly across all 3 sub-tabs; "my rank" is shown even if outside the current page.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SOCIAL-018 — Send a friend request from Community's Add Friend search
- **Expected Result:** Row shows "Sent ✓" immediately with no confirmation dialog.
- **Priority:** P2
- **Test Type:** Positive

#### IND-SOCIAL-019 — Following feed empty state offers "Browse NGOs" CTA
- **Preconditions:** New account following nobody.
- **Expected Result:** Empty state includes a working "Browse NGOs" shortcut.
- **Priority:** P3
- **Test Type:** Boundary

#### A16c. My Records (read-mostly screens)

#### IND-REC-001 — My Reports shows filed reports with correct status
- **Expected Result:** Status shown as "Under review" / "actioned" / "dismissed" with the original reason label.
- **Priority:** P2
- **Test Type:** Positive

#### IND-REC-002 — My Reviews lists reviews with a 2-line comment preview
- **Expected Result:** Tapping a review opens the related `OrderDetail`.
- **Priority:** P3
- **Test Type:** Positive

#### IND-REC-003 — My Sponsorships lists drive sponsorships
- **Expected Result:** Status pill + amount; tap → `DriveDetail`.
- **Priority:** P2
- **Test Type:** Positive

#### IND-REC-004 — Records screens have no pagination at scale
- **Preconditions:** An account with a very large history in any of My Adoptions / My Reports / My Reviews / My Donations.
- **Expected Result:** None of these implement infinite scroll — verify behavior (scroll performance, whether older items are simply unreachable) with a large data set.
- **Priority:** P3
- **Test Type:** Boundary
- **Notes:** Flagged — see Potential Issues.

#### IND-REC-005 — "My Bulk Responses" is not an Individual feature
- **Scenario:** Confirm this route, despite its generic name and placement in navigation near other "My…" screens, is Nursery-only.
- **Steps:** 1) As an Individual, attempt to reach `MyBulkResponsesScreen` via any UI path
- **Expected Result:** No Individual-facing entry point should exist to this screen; it is built exclusively for the Nursery role (see Section C9). If an Individual-reachable path is found, treat as a routing defect.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Confirmed via code comment: screen is explicitly documented as Nursery-only despite the generic name.

---

## B. NGO User

**Critical structural finding used throughout this section:** the NGO `status` (`pending`/`approved`/`rejected`/`suspended`) is **not** enforced at the navigator/route level. A pending, rejected, or suspended NGO logs into the exact same `NgoMain` tab shell as an approved one — there is no separate "awaiting approval" holding screen. Gating is done **per-action** via a shared `useApprovalGate`/`guard()` hook that some (not all) mutating buttons are wrapped in. This means "state-transition" testing for NGOs is really "which specific buttons are blocked in which specific status" — test cases below are written accordingly, screen by screen, rather than assuming one clean global gate.

### B1. NGO Authentication

#### NGO-AUTH-001 — NGO account type selection routes to the NGO registration wizard
- **Role:** Unauthenticated → NGO
- **Steps:** 1) On `AccountTypeScreen`, tap **NGO**
- **Expected Result:** Navigates to `NgoRegisterScreen` (dark forest gradient, distinct from Individual's register screen).
- **Priority:** P1
- **Test Type:** Positive

#### NGO-AUTH-002 — Log in as an NGO routes to NgoMain regardless of approval status
- **Preconditions:** An NGO account exists in `pending` status (prerequisite: NGO has completed registration; Admin has not yet acted).
- **Steps:** 1) Log in with the pending NGO's credentials
- **Expected Result:** Routes straight to `NgoMain` tab shell — **not** to any special "awaiting approval" screen. Confirm this matches the pattern for `approved`/`rejected`/`suspended` too (only the content within screens differs, not the route).
- **Priority:** P0
- **Test Type:** State Transition
- **Notes:** This is the single most important state-machine fact for NGO UAT — verify it explicitly rather than assuming a gated login.

#### NGO-AUTH-003 — Logout / session persistence / token refresh / account-blocked handling
- **Expected Result:** Identical mechanism to Individual (see IND-AUTH-013 through IND-AUTH-018) — same `AuthContext`/`client.ts` code path, role-agnostic.
- **Priority:** P1
- **Test Type:** Regression
- **Dependencies:** IND-AUTH-013..018 equivalents, re-run against an NGO account

#### NGO-AUTH-004 — NGO account-level Admin block (distinct from `status: suspended`)
- **Preconditions:** Prerequisite: Admin uses the account-level block mechanism (not the NGO-approval Suspend action) against this NGO.
- **Expected Result:** `AccountBlockedScreen` takes over immediately, same as for any role — this is a different, harsher mechanism than the NGO-specific `status:'suspended'` (see B5). Do not conflate the two in bug reports.
- **Priority:** P1
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite

---

### B2. NGO Registration Wizard

9-step wizard, `NgoRegisterScreen`. All steps are client-side only; a single `POST /api/auth/register-ngo` fires at the very end.

#### NGO-REG-001 — Complete the full 9-step wizard with all required fields valid
- **Test Data:** Step 1: Org name "Green Roots Trust", type "trust"; Step 2: address, city, ≥1 operating city, valid phone; Step 4: contact name+phone, authorization proof photo; Step 5: description, ≥1 work area; Step 8: ≥1 ARTH usage goal; Step 9: valid unused email, password ≥8 chars.
- **Steps:** 1) Complete each step, tapping Continue 2) Submit on the final Account step
- **Expected Result:** Multipart `POST /api/auth/register-ngo` succeeds; the NGO is logged in **immediately** with no waiting/pending screen shown — lands directly on `NgoMain` (status is `pending` under the hood, but nothing in the UI says so beyond a dashboard banner — see B3).
- **Priority:** P0
- **Test Type:** Positive

#### NGO-REG-002 — Step 1 (Org Identity): required-field validation
- **Steps:** 1) Leave Org name blank, or Org type unselected 2) Tap Continue
- **Expected Result:** Blocked with inline error; step does not advance.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-REG-003 — Step 2: phone format and ≥1 operating city required
- **Test Data:** Phone: `12345` (invalid); 0 operating cities selected.
- **Expected Result:** Both are blocked independently with their own inline errors.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-REG-004 — Step 2: optional website/social links validated only if provided
- **Test Data:** Website: `not-a-url`
- **Expected Result:** Rejected as invalid if non-empty; leaving it blank passes.
- **Priority:** P2
- **Test Type:** Validation

#### NGO-REG-005 — Step 3 (Legal Registrations) is entirely optional
- **Steps:** 1) Leave every toggle (Registration cert/NGO Darpan/12A/80G/FCRA/CSR-1) off 2) Tap Continue
- **Expected Result:** Advances with no validation error — step is explicitly optional per its own helper text.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-REG-006 — Step 3: toggling a legal doc on requires its number + document
- **Steps:** 1) Toggle "12A" on 2) Leave the revealed number field and document picker empty 3) Continue
- **Expected Result:** Unclear whether toggling a doc "on" makes its sub-fields mandatory or still optional — **verify actual behavior on-device**, do not assume.
- **Priority:** P2
- **Test Type:** Validation
- **Notes:** Flagged as ambiguous from static analysis.

#### NGO-REG-007 — Step 4 (People): authorization proof is mandatory
- **Steps:** 1) Fill contact name/phone 2) Skip the authorization-proof photo/PDF upload 3) Continue
- **Expected Result:** Blocked — this is the one hard-required upload in the entire wizard besides the final account fields.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-REG-008 — Step 5 (What You Do): ≥1 work area required
- **Steps:** 1) Fill description 2) Select 0 work areas 3) Continue
- **Expected Result:** Blocked with inline error.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-REG-009 — Steps 6–7 (Plantation Practices, Proof of Work) are entirely optional
- **Expected Result:** Both steps advance with everything left blank.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-REG-010 — Step 7: URL fields validated only when filled
- **Test Data:** A drive-report link: `htp:/broken`
- **Expected Result:** Rejected as an invalid URL if non-empty.
- **Priority:** P3
- **Test Type:** Validation

#### NGO-REG-011 — Step 8 (ARTH Goals): ≥1 usage goal required
- **Expected Result:** Blocked with 0 selected.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-REG-012 — Step 9 (Account): email availability check + password length
- **Test Data:** An already-registered email; a 6-character password.
- **Expected Result:** Both rejected independently, matching the Individual register pattern (live-debounced email check).
- **Priority:** P0
- **Test Type:** Validation

#### NGO-REG-013 — Back navigation through the wizard preserves entered data
- **Steps:** 1) Fill steps 1-4 2) Tap Back to step 2 3) Tap Continue forward again
- **Expected Result:** Previously entered data for steps 1-4 is retained (not cleared).
- **Priority:** P1
- **Test Type:** Regression

#### NGO-REG-014 — Registration submit failure (e.g. network drop mid-submit)
- **Steps:** 1) Complete all steps 2) Disable network 3) Submit
- **Expected Result:** Inline error under the form; wizard does not reset; user can retry once network returns.
- **Priority:** P1
- **Test Type:** Error Handling

#### NGO-REG-015 — Multipart document/photo uploads (certs, authorization proof, past-work photos)
- **Expected Result:** All file uploads (registration cert/12A/80G/FCRA/CSR-1/authorization proof/up to 5 past-work photos) attach correctly to the multipart submission.
- **Priority:** P1
- **Test Type:** Integration

#### NGO-REG-016 — Very long free-text fields (org name, description) have no observed client-side cap
- **Test Data:** A 5,000-character description.
- **Expected Result:** No max-length guard was found client-side — verify server-side handling/UI wrapping rather than assuming rejection.
- **Priority:** P3
- **Test Type:** Boundary

#### NGO-REG-017 — Pull-to-refresh gesture on the registration scroll view
- **Expected Result:** Gesture exists but has no real effect (nothing to refresh pre-auth) — cosmetic-only; confirm it doesn't error.
- **Priority:** P3
- **Test Type:** Regression

---

### B3. Pending State

**Prerequisite for reaching this state:** NGO has submitted registration (NGO-REG-001) and Admin has **not yet** approved/rejected/suspended it.

#### NGO-PEND-001 — Dashboard shows a non-blocking "Under review" banner
- **Expected Result:** `NgoDashboardScreen` shows a `StatusBanner` reading something like "Under review"; every Quick Actions dock tile is still visible and tappable.
- **Priority:** P0
- **Test Type:** State Transition

#### NGO-PEND-002 — Attempting to create a new Drive while pending, via the guarded button
- **Steps:** 1) From `NgoManageScreen`/`NgoDrivesScreen`'s "+ New Drive" (which **is** gated) 2) Tap it
- **Expected Result:** A `StatusModal` ("Awaiting approval") appears instead of navigating to `NgoCreateDriveScreen`.
- **Priority:** P0
- **Test Type:** Permission

#### NGO-PEND-003 — Reaching NgoCreateDrive/Campaign/AdoptableTree by a route not gated by a guarded button
- **Scenario:** If any code path (e.g. a future deep link, or manual `navigation.navigate('NgoCreateDrive')`) reaches these create screens directly, they are **not gated at the screen level itself**.
- **Steps:** 1) If a tester can trigger direct navigation to `NgoCreateDrive`/`NgoCreateCampaign`/`NgoCreateAdoptableTree`/`NgoBulkRequirements` while pending (e.g. via a debug deep link)
- **Expected Result:** **Currently, these screens do not block submission for a non-approved NGO.** A pending NGO could publish a live drive/campaign/adoptable tree/bulk requirement this way.
- **Priority:** P0
- **Test Type:** Permission / Security
- **Notes:** Confirmed code-level gap, not assumed — see Potential Issues. High-value regression case once/if fixed.

#### NGO-PEND-004 — Staff CRUD is properly gated
- **Steps:** 1) Attempt to add/edit/delete staff while pending
- **Expected Result:** `StatusModal` blocks the action — this screen's actions **are** correctly gated.
- **Priority:** P1
- **Test Type:** Permission

#### NGO-PEND-005 — Logging planted trees is properly gated
- **Steps:** 1) Attempt to submit `NgoLogPlantedTreesScreen` while pending
- **Expected Result:** Blocked via `StatusModal`.
- **Priority:** P0
- **Test Type:** Permission

#### NGO-PEND-006 — Posting bulk sapling requirements to nurseries is NOT gated
- **Steps:** 1) While pending, open `NgoBulkRequirementsScreen` → "+ New" → submit a requirement
- **Expected Result:** **Currently succeeds with no approval check at all.** A pending/rejected/suspended NGO can freely post live requirements to nurseries.
- **Priority:** P0
- **Test Type:** Permission / Security
- **Notes:** Confirmed gap — see Potential Issues.

#### NGO-PEND-007 — Posting to the community feed while pending
- **Steps:** 1) While pending, open Post Composer and publish
- **Expected Result:** An inline warning explains the post will publish from the NGO's **personal owner account**, not the org — and it does so (`asNgo:false`). This is a deliberate soft-gate, not a block. Verify the post actually appears under the personal handle.
- **Priority:** P1
- **Test Type:** State Transition

#### NGO-PEND-008 — Portfolio "Add past work" entry point is not gated, but Save is
- **Steps:** 1) While pending, tap "+ Add past work" (opens the form freely) 2) Fill it in and tap Save
- **Expected Result:** Form opens without any block; **Save** is blocked by `StatusModal` — verify the user only discovers the block after filling out the whole form, not before.
- **Priority:** P2
- **Test Type:** Permission
- **Notes:** Flagged inconsistent gate placement.

#### NGO-PEND-009 — Read-only screens are fully accessible while pending
- **Steps:** 1) While pending, open Reports, Donations, Followers, Follower Requests, Monthly RSVPs, Streak/Trust, Own Posts/Community, Directory
- **Expected Result:** All render normally with live data — none of these are gated (by design, since they're not "verified org" privileged actions).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-PEND-010 — Settings shows status + rejection reason but no Resubmit action
- **Expected Result:** `NgoSettingsScreen` shows "Status: pending" (or rejected + reason) but there is **no visible Resubmit button anywhere**, even though a resubmit API/hook exists unused in the codebase.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Confirmed dead/incomplete code — see Potential Issues.

---

### B4. Approved State

**Prerequisite:** Admin approves the NGO from `AdminNgoApprovalDetailScreen`.

#### NGO-APPR-001 — All previously gated actions now succeed
- **Steps:** 1) Re-attempt NGO-PEND-002, 004, 005 (create drive, staff CRUD, log planted trees) now that status is `approved`
- **Expected Result:** No `StatusModal` appears; each action proceeds to its normal flow.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin approval prerequisite

#### NGO-APPR-002 — Status banner disappears from the Dashboard
- **Expected Result:** `StatusBanner` is hidden entirely once `status === 'approved'`.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-APPR-003 — Posting now publishes under the org account, not personally
- **Steps:** 1) Publish a post
- **Expected Result:** `canPublishAsNgo` is now true; no personal-account warning; post appears under the org handle with the related-drive chip option available.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-APPR-004 — NGO now appears (or continues to appear) correctly in the individual-facing NGO Directory
- **Expected Result:** Verify visibility rules — confirm whether pending/rejected NGOs were ever visible here too (not independently verified client-side; flagged as worth checking against server truth).
- **Priority:** P2
- **Test Type:** Integration
- **Notes:** See Potential Issues — directory visibility by status wasn't confirmed at the mobile-code level.

---

### B5. Rejected / Suspended State

**Prerequisite:** Admin rejects (with a reason) or suspends the NGO.

#### NGO-REJ-001 — Rejected NGO sees rejection reason and can resubmit via Edit Profile... but not from Settings
- **Steps:** 1) Log in as a rejected NGO 2) Check `NgoSettingsScreen` for a resubmit option 3) Check the profile-editing flow for one
- **Expected Result:** Per current code, **no Resubmit button exists anywhere reachable in the NGO's own UI** (unlike the Nursery role, which does have a working "Resubmit for review" button on `EditNurseryProfileScreen`). Confirm this asymmetry on-device.
- **Priority:** P0
- **Test Type:** Regression
- **Notes:** High-value flag — if true, a rejected NGO has no in-app path back to `pending` at all. Cross-reference with Nursery's C5 for contrast.

#### NGO-REJ-002 — All approval-gated actions remain blocked while rejected
- **Expected Result:** Same `StatusModal` behavior as Pending (B3), but the modal copy shows "Application rejected" + the admin's `rejectionReason`.
- **Priority:** P0
- **Test Type:** Permission

#### NGO-REJ-003 — Suspended NGO sees "Account suspended" modal on gated actions
- **Preconditions:** Admin suspends the NGO with a reason.
- **Expected Result:** Gated actions show "🚫 Account suspended" instead of the pending/rejected copy.
- **Priority:** P1
- **Test Type:** Permission

#### NGO-REJ-004 — Rejected/suspended NGO's ungated actions (drive/campaign/tree creation, bulk requirements) still work
- **Expected Result:** Consistent with NGO-PEND-003/006 — the same gap applies in rejected/suspended states, not just pending. Confirm.
- **Priority:** P0
- **Test Type:** Permission / Security

#### NGO-REJ-005 — Rejected NGO's own dashboard/profile stats render with no visible restriction
- **Expected Result:** `NgoDashboardScreen`/`NgoProfileScreen` (own view) show zero status-dependent UI changes beyond the plain-text status line in Settings.
- **Priority:** P2
- **Test Type:** Regression

---

### B6. NGO Profile

#### NGO-PROF-001 — Edit NGO profile: logo, description, website, phone, city
- **Test Data:** Website: `https://greenroots.org`; Phone: 10-digit valid.
- **Expected Result:** Multipart `PATCH` succeeds; confirm dialog "Saved".
- **Priority:** P1
- **Test Type:** Positive

#### NGO-PROF-002 — Invalid website/phone format on Settings
- **Expected Result:** Inline validation errors block save.
- **Priority:** P2
- **Test Type:** Validation

#### NGO-PROF-003 — Toggle "Approve each follower" (follow policy)
- **Expected Result:** Toggling changes whether new followers land as pending (requiring accept) vs. immediately accepted.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-PROF-004 — View own profile tabs: Campaigns and Adopt are intentionally empty
- **Expected Result:** The own-profile view's Campaigns and Adopt tabs render empty by design — NGOs manage those via the Manage tab, not this profile screen. Confirm this isn't mistaken for a bug.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Explicit in-code comment confirms this is intentional.

#### NGO-PROF-005 — View another NGO's public profile (as an NGO)
- **Expected Result:** Follow/unfollow, Report, Block via ActionSheet all function the same as when an Individual views it.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-PROF-006 — View a suspended/removed NGO's public profile
- **Expected Result:** Dedicated `EmptyState`: "This NGO isn't available… may have been suspended or removed" with a "Go back" action, rather than a raw error.
- **Priority:** P2
- **Test Type:** Error Handling

#### NGO-PROF-007 — Homepage theme picker for NGO
- **Expected Result:** Same pinned time-of-day theme mechanism as Individual's Home theme picker, scoped to the NGO dashboard.
- **Priority:** P3
- **Test Type:** Positive

---

### B7. Dashboard / Home

#### NGO-DASH-001 — Dashboard stats and streak card render
- **Expected Result:** Drives/Streak/CO₂ stats row, streak card, "Your Impact" 2×2 tiles (Drives/Trees/Raised/Campaigns) all populate from `useNgoStats`/`useNgoStreakCalendar`.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-DASH-002 — Impact tiles deep-link to the correct Manage segment
- **Steps:** 1) Tap the "Trees" impact tile
- **Expected Result:** Opens `NgoManageScreen` pre-set to the "trees" segment (not the default "drives" segment).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-DASH-003 — Quick Actions dock — all 9 items navigate correctly
- **Expected Result:** Survival & Impact, Log Planted Trees, Bulk Requirements, Growth & Trust, Volunteers, Staff Roster, Donations, Reports, Past Work all route to their respective screens.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-DASH-004 — Pull-to-refresh updates stats/streak/profile
- **Expected Result:** All three refetch on pull.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-DASH-005 — Dashboard loading state
- **Expected Result:** `ActivityIndicator` shown only around the stats block while loading; hero/dock render with fallback `0`/placeholder values in the interim rather than a full-screen blocking spinner.
- **Priority:** P2
- **Test Type:** Positive

---

### B8. Drives & Campaigns (NGO-side management)

#### NGO-DRIVE-001 — Create a drive with self-arranged transport
- **Test Data:** Title, description, address, city; transport mode "self_arrange".
- **Expected Result:** `POST /api/drives` (multipart with cover photo) succeeds; appears in `NgoDrivesScreen` and (confirmed via shared API) in the individual-facing `DrivesListScreen`/map.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** NGO must be approved to reach this via the guarded button (see B3/B4)

#### NGO-DRIVE-002 — Create a drive with NGO-provided transport requires ≥1 pickup point
- **Steps:** 1) Select "ngo_provided" transport 2) Add 0 pickup points 3) Continue/Submit
- **Expected Result:** Blocked until at least one pickup point (address + arrival time) is added.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-DRIVE-003 — Create a drive missing required fields (title/description/address/city)
- **Expected Result:** Blocked with inline errors per field.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-DRIVE-004 — Drives list status pills (upcoming/completed/cancelled)
- **Expected Result:** Correct color-coded pill per drive status; confirmed/capacity counts accurate.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-DRIVE-005 — Create a campaign with a funding goal
- **Test Data:** Title, description, Goal: ₹50000 (digits only).
- **Expected Result:** Creates successfully; appears to individuals for donation.
- **Priority:** P0
- **Test Type:** Positive

#### NGO-DRIVE-006 — Create a campaign with no goal (open-ended)
- **Expected Result:** Goal is optional — campaign creates successfully with no target amount.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-DRIVE-007 — Close and reopen a campaign
- **Steps:** 1) Tap "Close" on an active campaign → confirm if prompted 2) Tap "Reopen"
- **Expected Result:** Status toggles correctly; a closed campaign stops accepting donations (verified from the Individual side in IND-CAMP-002).
- **Priority:** P1
- **Test Type:** State Transition

#### NGO-DRIVE-008 — Create an adoptable tree listing
- **Test Data:** Nickname, species, description, city (required); area/landmark (optional).
- **Expected Result:** `POST /api/adoptable-trees` succeeds; visible to individuals in `AdoptTreeListScreen`.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-DRIVE-009 — Release an adopted tree back into the pool
- **Preconditions:** A tree currently adopted by an individual (prerequisite: individual completed IND-ADOPT-002).
- **Steps:** 1) On `NgoTreesScreen`, tap "Release" on the adopted tree → confirm
- **Expected Result:** Tree returns to the public adoptable pool without being delisted; the previous adopter is notified.
- **Priority:** P1
- **Test Type:** Positive
- **Dependencies:** IND-ADOPT-002

#### NGO-DRIVE-010 — Remove an adoptable tree listing that currently has a live adoption
- **Steps:** 1) Tap "Remove listing" on an adopted tree → confirm
- **Expected Result:** Listing is delisted **and** the live adoption is auto-released as part of the same call, with the adopter notified — verify both effects occur, not just the delisting.
- **Priority:** P1
- **Test Type:** Integration

#### NGO-DRIVE-011 — NGO sees adopter identity directly on the tree card
- **Expected Result:** Adopter's name/handle and optional dedication message appear inline on the `NgoTreesScreen` card once adopted — no separate notification screen needed to see who adopted.
- **Priority:** P2
- **Test Type:** Positive

---

### B9. Plantation / Tree Logging

#### NGO-LOG-001 — Log planted trees against a specific drive and zone
- **Test Data:** Species name, Count: 25 (within 1-200), photo attached, zone selected.
- **Steps:** 1) Open Log Planted Trees 2) Pick a drive, then a zone (or "Unzoned") 3) Fill species/count/location/photo 4) Submit
- **Expected Result:** `POST /api/ngo/planted-trees/bulk` succeeds; confirm dialog shows created count.
- **Priority:** P0
- **Test Type:** Positive

#### NGO-LOG-002 — Log planted trees with no drive selected ("Independent Plantings")
- **Steps:** 1) Select "No drive" 2) Complete and submit
- **Expected Result:** Trees are logged under a synthetic "Independent Plantings" bucket, visible later in `NgoPlantationsScreen`.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-LOG-003 — Count boundary: 0, 1, 200, 201
- **Test Data:** Count = 0, 1, 200, 201
- **Expected Result:** 0 rejected; 1 and 200 accepted; 201 rejected (range is 1-200 per batch).
- **Priority:** P1
- **Test Type:** Boundary

#### NGO-LOG-004 — Photo is mandatory for logging planted trees
- **Steps:** 1) Fill all fields except photo 2) Submit
- **Expected Result:** Blocked — photo is a hard requirement.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-LOG-005 — Create a new zone for a drive
- **Steps:** 1) On `NgoZonesScreen`, tap "+ New zone" 2) Enter a name → Add
- **Expected Result:** Zone created and selectable in future logging.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-LOG-006 — Attempt to rename or delete a zone
- **Steps:** 1) Look for a rename/delete affordance on any zone
- **Expected Result:** **No UI exists for this** — `renameZone`/`deleteZone` APIs exist in code but are never wired to any screen. Confirm no such option is reachable.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Confirmed dead/orphaned feature — see Potential Issues.

---

### B10. Tree Survival / Health Tracking

#### NGO-HEALTH-001 — Mark a single tree's health status
- **Steps:** 1) Open `NgoTreeDetailScreen` for a tree 2) Tap a "Mark this tree as" status button (healthy/struggling/dead/removed)
- **Expected Result:** `logHealthCheck` succeeds; new entry appears in the tree's health-check history.
- **Priority:** P0
- **Test Type:** Positive

#### NGO-HEALTH-002 — Attempt a second health check on the same tree, same day
- **Steps:** 1) Mark a tree's status 2) Immediately mark it again with a different status, same day
- **Expected Result:** Server returns `CONFLICT` with the `existingCheck`; UI offers a confirm dialog to overwrite via `updateExisting:true` rather than silently creating a duplicate or erroring unhelpfully.
- **Priority:** P1
- **Test Type:** Boundary / Regression
- **Notes:** Genuine, well-implemented duplicate-action guard — good regression case.

#### NGO-HEALTH-003 — Bulk-mark all trees in a zone
- **Steps:** 1) On `NgoZonesScreen`, use a zone's "mark all" quick action → confirm
- **Expected Result:** Every tree currently in that zone gets the selected status applied in one call.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-HEALTH-004 — Multi-select bulk status apply on Zone Trees screen
- **Steps:** 1) On `NgoZoneTreesScreen`, long-press to enter multi-select 2) Select several trees across different current statuses 3) Apply a new status → confirm
- **Expected Result:** All selected trees update in one `logBulkHealthChecks` call.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-HEALTH-005 — Filter Zone Trees by status
- **Steps:** 1) Use the status filter chip row (all/not_checked/healthy/struggling/dead/removed)
- **Expected Result:** List filters correctly per chip.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-HEALTH-006 — Zone/plantation survival-rate rollups and "next check due" dates
- **Expected Result:** `NgoPlantationsScreen`/`NgoZonesScreen` show accurate survival % and next-due-date per zone/plantation, including the driveless "Independent Plantings" pseudo-row.
- **Priority:** P2
- **Test Type:** Positive

---

### B11. Impact / Survival Statistics

#### NGO-STAT-001 — Reports screen shows all KPI groups
- **Expected Result:** Summary strip (Drives/RSVPs/Raised/Volunteers), Reach & Impact, Survival & Attendance, Standing & Funding, Sponsored Trees, and 3 six-month bar charts (Donations/RSVPs/Adoptions) all render.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-STAT-002 — Reports has no custom date-range picker
- **Steps:** 1) Look for any way to change the reporting window on `NgoReportsScreen`
- **Expected Result:** None exists — the screen always shows a fixed trailing-6-month window. Confirm this matches user expectations before treating it as a gap.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged — see Potential Issues / Untested Areas.

#### NGO-STAT-003 — RSVP bar chart drill-down by month
- **Steps:** 1) Tap a bar in the RSVPs chart
- **Expected Result:** Opens `NgoMonthlyRsvpsScreen` scoped to that month.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-STAT-004 — Survival rate shown as "Not yet tracked" with no health checks logged
- **Preconditions:** A drive with planted trees but zero health checks.
- **Expected Result:** Reports shows "Not yet tracked" rather than 0% or an error.
- **Priority:** P2
- **Test Type:** Boundary

#### NGO-STAT-005 — ARTH Trust Score "N/A" before any score is computed
- **Expected Result:** Shown as "N/A", not a blank or zero.
- **Priority:** P3
- **Test Type:** Boundary

---

### B12. Portfolio

#### NGO-PORT-001 — Add a past-work portfolio entry
- **Test Data:** Title (required), a past date (required, must be in the past), photos (up to 6, first = cover).
- **Expected Result:** Entry saves; total "N trees across M projects" header updates.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-PORT-002 — Attempt to enter a future date for "Happened on"
- **Test Data:** A date next month.
- **Expected Result:** A friendly confirm dialog redirects the NGO to Manage → Drives instead, since portfolio is explicitly for past/historical work only.
- **Priority:** P1
- **Test Type:** Validation

#### NGO-PORT-003 — Edit an entry without replacing photos
- **Steps:** 1) Edit an existing entry's title only, leaving "Replace photos" off
- **Expected Result:** Existing photos are left untouched — the save does not wipe media just because the photo array wasn't resent.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Explicit in-code safeguard — good regression case to prevent a future accidental-media-wipe bug.

#### NGO-PORT-004 — Edit an entry with "Replace photos" enabled
- **Steps:** 1) Toggle "Replace photos" 2) Pick a new set 3) Save
- **Expected Result:** Entire photo set is replaced with the new selection.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-PORT-005 — Delete a portfolio entry
- **Expected Result:** Removed from the list; total stats recalculate.
- **Priority:** P2
- **Test Type:** Positive

---

### B13. Staff / Team Functionality

**Important scope clarification:** despite the name, `NgoStaffScreen` is **not** a multi-login/permissions system. It is a public-facing team roster (name/role/email/phone/photo) shown on the org's profile — there is no invite flow, no separate staff login/session, and no permission model. Test cases below reflect this actual scope; do not test for staff login credentials or role-based access, as that does not exist.

#### NGO-STAFF-001 — Add a staff/team member entry
- **Test Data:** Name, Role/title (required); Email, Phone (optional but format-validated if given).
- **Expected Result:** Entry appears in the roster and on the org's public profile.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-STAFF-002 — Invalid email/phone format on a staff entry
- **Expected Result:** Inline validation errors; save blocked.
- **Priority:** P2
- **Test Type:** Validation

#### NGO-STAFF-003 — Edit and delete a staff entry
- **Expected Result:** Both succeed when approved; both gated (`StatusModal`) when not (see B3).
- **Priority:** P1
- **Test Type:** Positive

#### NGO-STAFF-004 — Confirm no staff login/session capability exists
- **Steps:** 1) Add a staff entry with an email 2) Attempt to log in using that email on the Login screen
- **Expected Result:** No login should succeed — staff entries are not accounts. Document actual behavior if this assumption proves wrong.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Written to catch a scope misunderstanding, not because a bug is expected.

---

### B14. Interaction with Individual Users

#### NGO-INDIV-001 — Volunteer roster reflects individuals who've attended drives
- **Expected Result:** `NgoVolunteersScreen` lists name/handle, drives-attended count, last-active date per volunteer; tapping opens their public profile.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-INDIV-002 — Remove a volunteer (cancels only upcoming RSVPs)
- **Steps:** 1) Tap "Remove" on a volunteer → confirm
- **Expected Result:** Only future/upcoming RSVPs are cancelled; past attendance history is explicitly preserved (per in-code comment and confirm-dialog copy).
- **Priority:** P1
- **Test Type:** Positive

#### NGO-INDIV-003 — Follower request accept/decline
- **Preconditions:** Follow policy is "approval"; an individual has requested to follow (prerequisite: IND-SOCIAL-014).
- **Steps:** 1) Accept one request, decline another
- **Expected Result:** Correct outcome per action; but note both mutations share one global `busy` flag — a second row's accept/decline is blocked while any row's mutation is in flight, not just that row's own. Verify this doesn't feel broken during concurrent interaction.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged UX nit, not a functional bug.

#### NGO-INDIV-004 — Follower Requests screen when follow policy is "open"
- **Expected Result:** Instead of an empty list, an explanatory banner + link to Settings is shown (correct, deliberate UX).
- **Priority:** P3
- **Test Type:** Positive

#### NGO-INDIV-005 — Remove a follower
- **Expected Result:** Confirm dialog explains the follower isn't told and can follow again.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-INDIV-006 — Followers/Donations screens lack pagination at scale
- **Preconditions:** NGO with a very large follower/donor count.
- **Expected Result:** Both screens call APIs that support `page`/`take`, but neither screen actually paginates — verify real-world scroll/load behavior with a large data set.
- **Priority:** P2
- **Test Type:** Boundary
- **Notes:** Flagged — see Potential Issues.

#### NGO-INDIV-007 — Individual donates to a campaign; NGO sees it reflected
- **Steps:** 1) (Prerequisite: individual completes IND-DON-001) 2) Open `NgoDonationsScreen`
- **Expected Result:** Donation appears with correct status/campaign attribution; per-campaign summary total updates.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-DON-001

#### NGO-INDIV-008 — Filter donations by status
- **Expected Result:** All/Succeeded/Pending/Failed/Refunded chips correctly refetch and filter.
- **Priority:** P2
- **Test Type:** Positive

---

### B15. Interaction with Nurseries (Bulk Requirements)

Full two-sided marketplace flow: NGO posts a requirement → nursery(ies) respond with offers → NGO accepts → nursery hands off → NGO confirms with a handoff code.

#### NGO-BULK-001 — Post a new bulk sapling requirement
- **Test Data:** Species (from catalog or free-text note), Quantity needed (>0, required), needed-by date (optional), delivery address/city.
- **Expected Result:** `POST /api/ngo/bulk-requirements` succeeds; requirement becomes visible to nurseries (see C9).
- **Priority:** P0
- **Test Type:** Positive

#### NGO-BULK-002 — Quantity needed must be greater than 0
- **Test Data:** Quantity: 0
- **Expected Result:** Blocked with inline validation.
- **Priority:** P1
- **Test Type:** Boundary

#### NGO-BULK-003 — Use current GPS location for the requirement's delivery address
- **Expected Result:** Reverse-geocode result shown with a "Matched from GPS, verify" notice — NGO can confirm/edit before submit.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-BULK-004 — Add a species not in the existing catalog
- **Steps:** 1) Search for a species with no match 2) Tap "add to catalog" 3) Provide a name + emoji
- **Expected Result:** New catalog species created and linked to this requirement (enabling automatic nursery stock-checking against it going forward).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-BULK-005 — Accept a nursery's offer
- **Preconditions:** A nursery has responded with an offer (prerequisite: Section C9 nursery-side "Send offer").
- **Steps:** 1) Open the requirement detail 2) Accept the offer
- **Expected Result:** Offer status flips to `accepted`.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** Nursery-side offer (C9)

#### NGO-BULK-006 — Decline a nursery's offer
- **Expected Result:** Offer status flips to `declined`; requirement remains open for other nurseries.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-BULK-007 — Confirm receipt with a correct handoff code
- **Preconditions:** Nursery has marked the accepted offer `handed_off` and shared its handoff code out-of-band (prerequisite: C9 nursery hand-off).
- **Steps:** 1) Enter the correct 4-ish-digit handoff code 2) Confirm
- **Expected Result:** `confirmNgoBulkResponseReceived` succeeds — this is the **only** action that mints traceable sapling units / updates nursery reputation; a nursery cannot self-mark fulfilled.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** Nursery hand-off (C9)

#### NGO-BULK-008 — Confirm receipt with an incorrect handoff code
- **Test Data:** A deliberately wrong code.
- **Expected Result:** Inline error; requirement remains in `handed_off`, not `fulfilled`.
- **Priority:** P1
- **Test Type:** Negative

#### NGO-BULK-009 — Requirement expires unfulfilled past its needed-by date
- **Preconditions:** A requirement whose `neededByDate` has passed with no fulfillment.
- **Expected Result:** Status auto-flips to `expired`; a reschedule box appears letting the NGO pick a new date and reopen it to nurseries.
- **Priority:** P1
- **Test Type:** State Transition

#### NGO-BULK-010 — Overdue-but-still-open requirements are visually flagged
- **Expected Result:** Red "overdue" text shown on the card once `neededByDate` has passed and the requirement is still unfulfilled but not yet auto-expired.
- **Priority:** P2
- **Test Type:** Boundary

#### NGO-BULK-011 — Cancel a requirement
- **Steps:** 1) Tap "Cancel this requirement" → confirm
- **Expected Result:** Available unless already `cancelled`/`fulfilled`; status updates accordingly.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-BULK-012 — This entire flow has no approval gate
- **Expected Result:** Cross-reference NGO-PEND-006 — confirm a pending/rejected/suspended NGO can perform every action in this section (post, accept, decline, confirm-receipt) unimpeded.
- **Priority:** P0
- **Test Type:** Permission / Security

---

### B16. Notifications

#### NGO-NOTIF-001 — NGO-relevant notification types route correctly
- **Expected Result:** Confirm NGO-specific notification types (new follower/follow request, new RSVP, donation received, bulk-requirement offer received, etc. — as applicable) deep-link to the correct screens, mirroring the Individual pattern in A15.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Superseded by the fully-enumerated cases below, derived directly from `NotificationsScreen.tsx`'s `openTarget` switch rather than assumed.

#### NGO-NOTIF-002 — `follow_request` opens Follow Requests
- **Expected Result:** Tapping navigates to `NgoFollowerRequestsScreen` (distinct from the Nursery equivalent, which opens a combined `NurseryFollowersScreen` on its Requests tab instead — verify each role routes to its own screen shape).
- **Priority:** P1
- **Test Type:** Positive

#### NGO-NOTIF-003 — `ngo_donation_received` opens Donations with the correct ₹ amount in the copy
- **Expected Result:** Row text reads "<donor> donated ₹<amount> to your campaign"; tap navigates to `NgoDonations`.
- **Priority:** P1
- **Test Type:** Positive

#### NGO-NOTIF-004 — `ngo_drive_rsvp` opens the specific drive
- **Preconditions:** Notification payload includes `driveId`.
- **Expected Result:** Navigates to `DriveDetail` for that drive.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-NOTIF-005 — `ngo_drive_rsvp` with no `driveId` in the payload
- **Expected Result:** **No fallback exists in code** — if `driveId` is missing, the tap handler returns without navigating anywhere (silent no-op). Confirm whether this payload gap is actually reachable in practice, and if so, that it fails silently rather than crashing.
- **Priority:** P2
- **Test Type:** Error Handling
- **Notes:** Flagged — unlike other notification types on this screen (e.g. order/bulk-requirement types), this one has no list-level fallback route.

#### NGO-NOTIF-006 — `ngo_streak_at_risk` / `ngo_streak_broken` / `ngo_impact_milestone` open Growth & Trust
- **Expected Result:** All three navigate to `NgoStreakBadges`.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-NOTIF-007 — `bulk_requirement_response_received` opens Bulk Requirements
- **Expected Result:** Navigates to `NgoBulkRequirements` (list, not a specific requirement — unlike the deadline-passed type below).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-NOTIF-008 — `bulk_requirement_deadline_passed` opens the specific requirement when possible
- **Expected Result:** If `requirementId` is present, `NgoBulkRequirements` opens pre-targeted via `openRequirementId`; if absent, opens the plain list.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-NOTIF-009 — `post_like` / `new_post_from_followed` on the NGO's own posts
- **Expected Result:** Same shared post-notification handling as Individual (IND-NOTIF-003) — navigates to `PostDetail`.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-NOTIF-010 — `new_follower` / `follow_accepted` tap — no explicit route for an individual actor
- **Scenario:** An individual user follows the NGO (or has their follow request accepted), triggering `new_follower`/`follow_accepted`.
- **Steps:** 1) Tap that notification row
- **Expected Result:** **Unclear / flagged** — these two types have no explicit case in `openTarget`; the code falls through to a generic `actor.kind === 'ngo' | 'nursery'` check at the end, which does not match an individual actor. Confirm on-device whether the tap does nothing (row still marks read) or something else — do not assume either outcome.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Confirmed from source (`NotificationsScreen.tsx`'s `openTarget`) — a genuine candidate gap, high-value regression case once addressed.

#### NGO-NOTIF-011 — `ngo_tree_adopted` tap ("X adopted a tree from you")
- **Expected Result:** **Unclear / flagged** — same root cause as NGO-NOTIF-010: the actor is the adopting individual, not an org, so no case matches and the generic fallback likely does nothing. Confirm actual on-device behavior; do not assume a working deep link to the tree/adopter exists.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Contrast with NGO-DRIVE-011, where the adopter's identity is at least visible inline on the tree card in `NgoTreesScreen` — the notification tap itself is the untested/likely-broken path.

---

### B17. Settings

Covered in depth under B6 (Profile) since `NgoSettingsScreen` **is** the NGO's profile-edit screen (reached via "Edit profile"). Additional settings-specific cases:

#### NGO-SET-001 — Awards list: add/remove repeatable entries
- **Test Data:** Title, Year, Issuer per award row.
- **Expected Result:** Multiple awards can be added and removed freely before Save.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-002 — Numeric fields (founded year, volunteer count) reject non-numeric input
- **Expected Result:** Non-numeric characters filtered or rejected.
- **Priority:** P3
- **Test Type:** Validation

#### NGO-SET-003 — Save failure shows inline error, not a silent no-op
- **Preconditions:** Simulate a server error on save.
- **Expected Result:** Inline error message shown; form data is not lost.
- **Priority:** P1
- **Test Type:** Error Handling

**Clarification — two screens share the word "Settings":** `NgoSettingsScreen` (tested above, in-app titled **"NGO Profile"**) is the org **identity** editor. It has its own gear-icon (⚙️) entry point to the actual shared **`SettingsScreen`** component (in-app titled **"Settings"**) — the same screen Individual users use, with two NGO-specific conditionals: the individual-only marketplace block is hidden, and a "Browse" section (Browse NGOs/Browse Nurseries) is shown instead. This shared screen was previously untested from the NGO side; the cases below cover it directly.

#### NGO-SET-004 — Gear icon on NGO Profile opens the shared Settings screen
- **Steps:** 1) On `NgoSettingsScreen` ("NGO Profile"), tap the ⚙️ icon top-right
- **Expected Result:** Navigates to the shared `SettingsScreen` (titled "Settings"); its profile card's "Edit" button routes back to `NgoSettingsScreen`, not `EditProfile` (verify the role check `user?.role === 'ngo' ? 'NgoSettings' : 'EditProfile'`).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-005 — Experience toggles persist for an NGO account
- **Expected Result:** Ambient Mode / Nature Sounds / Haptic Feedback / Reduce Motion toggle and persist identically to Individual (IND-SET-001) — verify by relaunching.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-006 — Notification toggles persist for an NGO account
- **Expected Result:** Push Notifications and Streak Reminders toggle and persist (IND-SET-002 equivalent).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-007 — Individual-only marketplace rows are absent from an NGO's shared Settings screen
- **Expected Result:** My Sapling Reservations / My Orders / Wishlist / Delivery Addresses / My Adopted Trees / My Donations / My Sponsorships / My Reviews are **all** absent (the `user?.role === 'user'` block) — confirms IND-SET-008's assumption directly from the NGO side, rather than by inference.
- **Priority:** P2
- **Test Type:** Regression

#### NGO-SET-008 — "Browse" section is present and functional for an NGO account
- **Steps:** 1) On the shared Settings screen, tap "Browse NGOs" then "Browse Nurseries"
- **Expected Result:** Both rows are visible only because `user?.role === 'ngo'` (confirm they do **not** appear for an Individual account, which has no equivalent section here — see IND-SET-013 for its own discovery path via Map/Directory); each row navigates to the respective directory screen.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-009 — "My Activity" section works for an NGO account
- **Steps:** 1) Tap Following, Liked Posts, Saved Posts, My Reports in turn
- **Expected Result:** All four navigate correctly; "Following" here is the same shared `FollowingScreen` as Individual (IND-SET-013) — an NGO account can itself follow other NGOs/nurseries.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-SET-010 — Change Password / Connected Devices from the shared Settings screen
- **Expected Result:** Same shared flow as Individual (A1) — re-verify against an NGO account.
- **Priority:** P3
- **Test Type:** Regression

#### NGO-SET-011 — Blocked Accounts / Notifications rows under Safety
- **Expected Result:** `BlockedAccountsScreen` (IND-SET-009..012) and `NotificationsScreen` behave identically for an NGO account.
- **Priority:** P2
- **Test Type:** Regression

#### NGO-SET-012 — Log Out / Delete Account from the shared Settings screen
- **Expected Result:** Same no-re-auth confirm-only mechanism as Individual (IND-AUTH-017, IND-SET-004) — deleting an NGO account this way removes the account entirely, not just the org profile; verify what happens to the NGO's live drives/campaigns/adoptable trees after deletion (not independently confirmed — flag if orphaned data remains visible to individuals afterward).
- **Priority:** P1
- **Test Type:** Security
- **Notes:** Higher-stakes than the Individual case — confirm downstream cleanup (or lack of it) for org-owned public content.

---

### B18. Other Implemented Features

#### B18a. Community / Own Posts

#### NGO-COMM-001 — Community tab segments: Posts / Followers / Requests
- **Expected Result:** All 3 segments render correctly; Requests badge shows the correct pending count.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-COMM-002 — "+ New post" is available regardless of approval status
- **Expected Result:** Button is not gated — consistent with Post Composer's own graceful non-approved handling (B3/NGO-PEND-007) rather than a hard block.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-COMM-003 — Own Posts screen is only reachable via the Community tab
- **Steps:** 1) Attempt to find a standalone route to `NgoOwnPosts`
- **Expected Result:** No standalone stack route exists — it's embedded only inside `NgoCommunityScreen`'s Posts segment. Confirm no dead/broken direct link exists elsewhere pointing to it.
- **Priority:** P3
- **Test Type:** Regression

#### NGO-COMM-004 — Delete own post from the Community feed
- **Expected Result:** Removed immediately; total posts/likes summary updates.
- **Priority:** P2
- **Test Type:** Positive

#### B18b. Growth & Trust (Streaks/Badges)

#### NGO-GROWTH-001 — Growth level badge and progress-to-next-level
- **Expected Result:** Correct badge (seedling/growing/established/evergreen) and progress text shown based on lifetime activity.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-GROWTH-002 — ARTH Trust Score gauge with factor breakdown
- **Expected Result:** Score (0-100) color-banded correctly; factor breakdown (drive completion/update freshness/compliance completeness) shown; "Not yet verified" if null.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-GROWTH-003 — Three weekly contribution streaks (Update/Drive Activity/Impact Verification)
- **Expected Result:** Current/longest/weeks shown correctly per streak type.
- **Priority:** P2
- **Test Type:** Positive

#### NGO-GROWTH-004 — NGO leaderboard (top 5 + own rank)
- **Expected Result:** Own rank shown even when outside top 5.
- **Priority:** P3
- **Test Type:** Positive

#### B18c. Followers & Follow Requests

Screens: `NgoFollowersScreen` (accepted followers), `NgoFollowerRequestsScreen` (pending requests) — two separate screens, contrast with Nursery's single tabbed screen (see C14d).

#### NGO-FOLLOW-001 — Accept a pending follow request
- **Preconditions:** Follow policy set to "approval" (NGO-PROF-003); ≥1 pending request.
- **Steps:** 1) Open the Followers screen's "Requests" badge (or Community → Requests) 2) Tap "Accept" on a request
- **Expected Result:** Request disappears from the pending queue; the requester moves into the accepted Followers list; cross-check the requesting individual's own UI flips from "Requested" to "Following ✓" (CROSS-ING-007).
- **Priority:** P1
- **Test Type:** Positive

#### NGO-FOLLOW-002 — Decline a pending follow request
- **Steps:** 1) Tap "Decline" on a request
- **Expected Result:** Request is removed from the queue without creating a follow relationship; verify the requester's own side reflects this correctly (does it silently revert to "Follow", or stay stuck showing "Requested"?).
- **Priority:** P1
- **Test Type:** Negative
- **Notes:** Flagged — the declining side's own UI was confirmed from code; the requester-side outcome specifically after a decline (as opposed to an accept) wasn't traced end-to-end.

#### NGO-FOLLOW-003 — Follow Requests screen under an "open" follow policy
- **Preconditions:** Follow policy set to "open" (default).
- **Expected Result:** An explanatory note replaces the empty state: "Anyone can follow you instantly right now, so requests never queue up here," with an "Open settings →" link that navigates to `NgoSettings` (the NGO Profile screen where the policy toggle lives — note this is a different screen from the shared "Settings" tested in B17 despite the similar name; verify the link goes to the correct one).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-FOLLOW-004 — Follow Requests empty state under "approval" policy with zero pending requests
- **Expected Result:** "No pending requests" empty state (distinct from the open-policy explanatory note in NGO-FOLLOW-003).
- **Priority:** P3
- **Test Type:** Boundary

#### NGO-FOLLOW-005 — Search the accepted-Followers list by name/handle
- **Steps:** 1) On `NgoFollowersScreen`, type a partial name/handle into the search field
- **Expected Result:** List filters live; a no-match search shows "No one matches that" (distinct copy from the true empty state, "No followers yet").
- **Priority:** P2
- **Test Type:** Positive

#### NGO-FOLLOW-006 — Remove an accepted follower
- **Steps:** 1) Tap "Remove" on a follower row → confirm
- **Expected Result:** Confirm dialog required, with explicit copy that the follower is **not notified** and **can follow again later**; verify both claims on-device — no notification is sent, and re-following is genuinely possible afterward (not silently blocked).
- **Priority:** P2
- **Test Type:** Positive

#### NGO-FOLLOW-007 — Followers screen header shows a live pending-request count
- **Expected Result:** The "Requests (N)" button in the header reflects the current pending count and navigates to `NgoFollowerRequestsScreen`.
- **Priority:** P3
- **Test Type:** Positive

#### NGO-FOLLOW-008 — Followers/Requests lists at scale
- **Preconditions:** 50+ followers.
- **Expected Result:** No infinite-scroll/pagination control was observed on either screen — verify behavior (performance, whether older followers are reachable) with a large list.
- **Priority:** P3
- **Test Type:** Boundary
- **Notes:** Flagged, consistent with similar unpaginated-list gaps elsewhere in the app (see Potentially Untested Areas).

---

## C. Nursery User

**Critical structural finding used throughout this section:** exactly like NGO, the nursery `status` (`pending`/`approved`/`rejected`/`suspended`) is enforced **per-action** via the same shared `useApprovalGate`/`guard()` hook, not at the navigator level. One concrete inconsistency found: **adding and deleting** stock items is gated, but **editing an existing stock item's quantity/price/photo via `StockDetailSheet` is not** — a pending/rejected/suspended nursery can still edit existing inventory even though it can't add new items or delete them.

### C1. Nursery Authentication

#### NUR-AUTH-001 — Nursery account type selection routes to the nursery registration wizard
- **Steps:** 1) On `AccountTypeScreen`, tap **Nursery**
- **Expected Result:** Navigates to `NurseryRegisterScreen`.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-AUTH-002 — Log in as a nursery routes to NurseryMain regardless of approval status
- **Preconditions:** A nursery account in `pending` status.
- **Expected Result:** Routes straight to `NurseryMainApp` (Home/Stock/Orders tabs) — no separate holding screen, same pattern as NGO (NGO-AUTH-002).
- **Priority:** P0
- **Test Type:** State Transition

#### NUR-AUTH-003 — Logout / session persistence / token refresh / account-blocked handling
- **Expected Result:** Identical shared mechanism as Individual/NGO (IND-AUTH-013..018) — re-verify against a nursery account.
- **Priority:** P1
- **Test Type:** Regression

---

### C2. Nursery Registration

7-step wizard: `identity → location → person → stock → verification → photo → account`.

#### NUR-REG-001 — Complete the full 7-step wizard with all required fields valid
- **Test Data:** Step 1: name, owner name, description, type "retail"; Step 2: address, city, 10-digit phone; Step 3: "same as owner" left on; Step 4: ≥1 plant category, plant-count bucket; Step 6: a live camera verification photo; Step 7: valid unused email, password ≥8 chars.
- **Expected Result:** Multipart `POST /api/auth/register-nursery` succeeds; nursery logs straight into `NurseryMain` in `pending` status; dashboard banner reads something like "We're reviewing your nursery. Your stock will go live once approved."
- **Priority:** P0
- **Test Type:** Positive

#### NUR-REG-002 — Step 1: required-field validation
- **Steps:** 1) Leave nursery name, owner name, description, or type blank 2) Continue
- **Expected Result:** Blocked per missing field.
- **Priority:** P1
- **Test Type:** Validation

#### NUR-REG-003 — Step 1: year established must be 4 digits if provided
- **Test Data:** `19` (2 digits)
- **Expected Result:** Rejected if non-4-digit; field is optional so blank passes.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-REG-004 — Step 2: contact phone live "taken" check
- **Test Data:** A phone number already used by another nursery account.
- **Expected Result:** Live-checked and flagged as taken before submit (mirrors the email check pattern used elsewhere).
- **Priority:** P1
- **Test Type:** Validation

#### NUR-REG-005 — Step 3: "same as owner" toggle behavior
- **Steps:** 1) Turn off "same as owner" 2) Leave the revealed name/phone fields empty 3) Continue
- **Expected Result:** Name and phone become required once the toggle is off; phone re-validated as 10-digit.
- **Priority:** P2
- **Test Type:** Validation

#### NUR-REG-006 — Step 4: ≥1 plant category required
- **Steps:** 1) Select 0 categories 2) Continue
- **Expected Result:** Blocked.
- **Priority:** P1
- **Test Type:** Validation

#### NUR-REG-007 — Step 5: verification fields are dynamic per nursery type and all optional
- **Steps:** 1) Select nursery type "government" 2) Observe which verification field appears 3) Leave it blank and continue
- **Expected Result:** Only the government-relevant field (Government Nursery ID) is shown for that type (e.g. NGO-type shows NGO Reg # instead); step is fully optional regardless of type.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-REG-008 — Step 5: GSTIN format validation when provided
- **Test Data:** GSTIN: `invalid-gstin`
- **Expected Result:** Rejected as invalid format if non-empty.
- **Priority:** P2
- **Test Type:** Validation

#### NUR-REG-009 — Step 6: verification photo is camera-only, required, no gallery option
- **Steps:** 1) Look for a gallery option at this step
- **Expected Result:** None exists — camera capture only, 4:3 aspect, and the step cannot be skipped.
- **Priority:** P1
- **Test Type:** Validation

#### NUR-REG-010 — Step 7: email availability + password length
- **Expected Result:** Same live-check pattern as NGO/Individual registration.
- **Priority:** P0
- **Test Type:** Validation

#### NUR-REG-011 — No max-length cap observed on free-text fields
- **Test Data:** A 5,000-character description/notes field.
- **Expected Result:** No client-side cap found — verify server-side handling rather than assuming rejection.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-REG-012 — "Use current location" during the Location step
- **Expected Result:** Reverse-geocodes and fills the address field from device GPS.
- **Priority:** P2
- **Test Type:** Positive

---

### C3. Pending State

#### NUR-PEND-001 — Dashboard shows a non-blocking status banner, all Quick Action tiles visible
- **Expected Result:** Same pattern as NGO — banner is informational only; all 12 dock tiles remain tappable.
- **Priority:** P0
- **Test Type:** State Transition

#### NUR-PEND-002 — Add a new stock item while pending is blocked
- **Steps:** 1) Attempt to add a sapling stock item
- **Expected Result:** `StatusModal` ("Awaiting approval") blocks the mutation.
- **Priority:** P0
- **Test Type:** Permission

#### NUR-PEND-003 — Edit an existing stock item's quantity/price/photo while pending is NOT blocked
- **Preconditions:** At least one stock item exists (added before the nursery went pending, or seeded directly).
- **Steps:** 1) While pending, open an existing stock item via `StockDetailSheet` 2) Change quantity/price/photo 3) Save
- **Expected Result:** **Currently succeeds with no approval check** — inconsistent with Add/Delete, which are gated.
- **Priority:** P0
- **Test Type:** Permission / Security
- **Notes:** Confirmed code-level inconsistency — see Potential Issues. High-value case: a pending nursery could inflate quantity/price on already-listed stock.

#### NUR-PEND-004 — Delete a stock item while pending is blocked
- **Expected Result:** `StatusModal` blocks it, unlike editing (NUR-PEND-003).
- **Priority:** P1
- **Test Type:** Permission

#### NUR-PEND-005 — Fulfil/decline a reservation while pending is blocked
- **Expected Result:** Gated correctly via `guard()`.
- **Priority:** P0
- **Test Type:** Permission

#### NUR-PEND-006 — Order actions (pack/dispatch/reassign/deliver/pickup/cancel) while pending are blocked
- **Expected Result:** All gated correctly.
- **Priority:** P0
- **Test Type:** Permission

#### NUR-PEND-007 — Responding to a review while pending is blocked
- **Expected Result:** Gated correctly.
- **Priority:** P2
- **Test Type:** Permission

#### NUR-PEND-008 — Saving Pickup/Delivery config while pending is blocked
- **Expected Result:** Gated correctly.
- **Priority:** P2
- **Test Type:** Permission

#### NUR-PEND-009 — Sending an offer on an NGO bulk requirement while pending is blocked
- **Expected Result:** Gated correctly (unlike the NGO side of this same flow, which is **not** gated — see NGO-BULK-012).
- **Priority:** P1
- **Test Type:** Permission
- **Notes:** Worth noting this asymmetry: the nursery half of the bulk-requirement flow is properly gated, the NGO half is not.

#### NUR-PEND-010 — Creating/editing/toggling delivery partners while pending is blocked
- **Expected Result:** Gated correctly.
- **Priority:** P2
- **Test Type:** Permission

#### NUR-PEND-011 — Posting to the community feed while pending publishes under the personal account
- **Expected Result:** Same soft-gate pattern as NGO (NGO-PEND-007) — inline warning, then posts as the individual owner-user rather than the nursery org.
- **Priority:** P1
- **Test Type:** State Transition

#### NUR-PEND-012 — Removing a follower is NOT gated
- **Expected Result:** Succeeds regardless of approval status — arguably fine since it's not a business-verification-dependent action, but inconsistent with most other mutations. Confirm actual behavior.
- **Priority:** P3
- **Test Type:** Regression

---

### C4. Approved / Rejected / Suspended States

#### NUR-APPR-001 — All previously gated actions succeed once approved
- **Steps:** 1) Re-attempt NUR-PEND-002, 004, 005, 006 now that status is `approved`
- **Expected Result:** No `StatusModal`; each proceeds normally.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin approval prerequisite

#### NUR-APPR-002 — Status banner disappears once approved
- **Priority:** P1
- **Test Type:** Positive

#### NUR-APPR-003 — Rejected nursery sees rejection reason AND a working Resubmit button
- **Preconditions:** Admin rejects with a reason.
- **Steps:** 1) Open `EditNurseryProfileScreen` 2) Observe the rejection card 3) Tap "Resubmit for review" → confirm
- **Expected Result:** `resubmitNurseryProfile()` fires (`POST /api/nursery/resubmit`); status returns to `pending`. **Unlike the NGO role, this resubmit path actually works and is reachable in the UI.**
- **Priority:** P0
- **Test Type:** State Transition
- **Notes:** Contrast directly with NGO-REJ-001 — Nursery has a working resubmit flow; NGO does not.

#### NUR-APPR-004 — Suspended nursery has no resubmit path
- **Preconditions:** Admin suspends with a reason.
- **Expected Result:** Only a mailto support link is offered — no self-service path back to `pending`. Confirm this is distinct from and doesn't get confused with the harsher, unrelated account-level "blocked" mechanism.
- **Priority:** P1
- **Test Type:** State Transition

#### NUR-APPR-005 — Suspended nursery's gated actions all correctly blocked
- **Expected Result:** Same `guard()` coverage as pending/rejected.
- **Priority:** P1
- **Test Type:** Permission

---

### C5. Nursery Profile

#### NUR-PROF-001 — Edit nursery profile: name, description, address, city, phone
- **Expected Result:** Multipart `PATCH /api/nursery/profile`; success confirm dialog.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-PROF-002 — Owner name field writes to the user record, not the nursery profile
- **Steps:** 1) Change "Owner name" and save
- **Expected Result:** Uses a separate `useUpdateMe` mutation from the main profile PATCH — verify both save correctly in a single "Save" tap.
- **Priority:** P2
- **Test Type:** Regression

#### NUR-PROF-003 — Logo upload uses gallery, not camera-restricted
- **Expected Result:** Unlike the registration verification photo, the profile logo picker allows gallery selection (1:1 aspect, 0.85 quality).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-PROF-004 — Toggle "Offer delivery" and set a delivery radius
- **Expected Result:** This toggle fires its **own mutation immediately** on change, independent of the main "Save Changes" button.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Two different save granularities on one screen — verify toggle state survives navigating away before hitting the main Save button (it should, since it already persisted).

#### NUR-PROF-005 — Toggle "Approve each follower" (follow policy)
- **Expected Result:** Same immediate-mutation behavior as the delivery toggle.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-PROF-006 — "Use my current location" auto-saves address immediately
- **Expected Result:** This action fires its own mutation on tap (reverse-geocode + save), separate from the main Save button.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-PROF-007 — View a suspended/removed nursery's public profile
- **Expected Result:** Dedicated `EmptyState`: "This nursery isn't available… may have been suspended or removed" with "Go back."
- **Priority:** P2
- **Test Type:** Error Handling

#### NUR-PROF-008 — Own profile shows full reputation data; public view does not
- **Expected Result:** Own view shows trust gauge, growth badge, and all 4 streak cards; public view instead shows Posts/Followers/Badges + Follow/Report/Block.
- **Priority:** P2
- **Test Type:** Positive

---

### C6. Nursery Dashboard

#### NUR-DASH-001 — Dashboard hero, "Today" tiles, and dock render
- **Expected Result:** Orders today, new pending, ready-for-pickup, deliveries-pending, trust score, growth level, low-stock species, upcoming bulk requirements, and activity feed all populate.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-DASH-002 — Dashboard 12-item Quick Actions dock — all tiles navigate correctly
- **Expected Result:** Stock, Reservations, Reviews, Post, Followers, Growth & Trust, Stock Analytics, Map, Pickup & Delivery, Delivery Partners, Bulk Requirements, Impact all route correctly.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-DASH-003 — Empty activity feed
- **Expected Result:** "No activity yet" `EmptyState`.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-DASH-004 — Dashboard loading state
- **Expected Result:** Spinner only around "Your Impact"; hero/today/dock render with `?? 0` fallbacks in the meantime (no full-screen block).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-DASH-005 — Pull-to-refresh refetches profile/stats/reservations/today-data
- **Priority:** P2
- **Test Type:** Positive

---

### C7. Sapling / Stock Management

#### NUR-STOCK-001 — Add a new stock item using an existing catalog species (fuzzy search)
- **Test Data:** Search "neem" → should fuzzy-match "Neem" even with a typo like "neme".
- **Expected Result:** Levenshtein-based fuzzy match (similarity ≥0.5 or substring) surfaces the right species in the top-8 results.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-STOCK-002 — Add a species not found in the catalog
- **Steps:** 1) Search a species with no match 2) "Can't find it? Add details" 3) Fill common name, emoji, and optional botanical fields
- **Expected Result:** New species created and immediately usable for this stock entry.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-STOCK-003 — Quantity = 0 is explicitly allowed
- **Test Data:** Quantity: `0`
- **Expected Result:** Accepted (not rejected) — presumably to list a species as "coming soon"/out of stock intentionally. Confirm resulting `availabilityStatus` shows `out_of_stock`.
- **Priority:** P1
- **Test Type:** Boundary

#### NUR-STOCK-004 — Negative quantity is rejected
- **Test Data:** `-5`
- **Expected Result:** Inline error "Enter a valid quantity."
- **Priority:** P1
- **Test Type:** Boundary

#### NUR-STOCK-005 — Extremely large quantity has no observed upper bound
- **Test Data:** `999999999`
- **Expected Result:** No client-side max was found — verify server-side handling/UI display rather than assuming rejection.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-STOCK-006 — Price left blank marks the item as free
- **Steps:** 1) Leave the ₹ price field blank 2) Save
- **Expected Result:** `isFree:true` is sent; listing displays as free.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-STOCK-007 — Negative price value
- **Test Data:** Price: `-100`
- **Expected Result:** No client-side validation was observed preventing a negative value from being entered and multiplied into `priceCents` — verify the server rejects this rather than assuming the client blocks it.
- **Priority:** P2
- **Test Type:** Negative
- **Notes:** Flagged potential gap — see Potential Issues.

#### NUR-STOCK-008 — Low-stock threshold and availability badge transitions
- **Steps:** 1) Set a low-stock threshold 2) Reduce quantity via orders/reservations until it crosses the threshold, then to 0
- **Expected Result:** `availabilityStatus` badge transitions `available → low_stock → out_of_stock` correctly on the stock list.
- **Priority:** P2
- **Test Type:** State Transition

#### NUR-STOCK-009 — Edit an existing stock item via StockDetailSheet
- **Expected Result:** All fields editable (quantity/price/photo/age/height/pot size/threshold/environments/notes); saves correctly.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-STOCK-010 — Delete a stock item
- **Steps:** 1) Tap delete icon → confirm
- **Expected Result:** Confirm dialog required; item removed from the list.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-STOCK-011 — Empty stock list
- **Expected Result:** "No stock yet." with a loading spinner in `ListEmptyComponent` while fetching.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-STOCK-012 — No bulk-edit or CSV import exists
- **Steps:** 1) Look for a way to edit multiple stock items at once or import a list
- **Expected Result:** None exists — each item must be edited individually via its detail sheet. Confirm this matches actual product expectations rather than assuming it's missing by accident.
- **Priority:** P3
- **Test Type:** Regression
- **Notes:** See Potentially Untested Areas.

---

### C8. Inventory / Availability

#### NUR-INV-001 — Stock ledger reflects a reservation fulfillment (decrement)
- **Preconditions:** An individual has an active reservation (prerequisite: IND-CART-001).
- **Steps:** 1) Fulfil the reservation (see C10) 2) Open Stock Analytics
- **Expected Result:** A `reservation_fulfilled` ledger entry appears with the correct negative delta; current stock quantity decreases by the fulfilled amount.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-CART-001

#### NUR-INV-002 — Stock ledger reflects an order placement (decrement) and cancellation (restock)
- **Steps:** 1) (Prerequisite: individual places then cancels an order — IND-CART/IND-ORDER) 2) Open Stock Analytics
- **Expected Result:** A matching negative (`order_placed`) then positive (`order_cancelled`) ledger pair appears; net stock quantity returns to its original value.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** Individual order + cancellation

#### NUR-INV-003 — Attempt to fulfil a reservation/order for more than available quantity
- **Preconditions:** A reservation/order quantity exceeds current stock (e.g. stock reduced by another sale in the meantime).
- **Expected Result:** Should be rejected rather than allowed to drive stock negative — verify actual server behavior; do not assume it's blocked just because it should be.
- **Priority:** P1
- **Test Type:** Negative
- **Notes:** Flagged as untested from the mobile-code level alone — floor enforcement is server-side.

#### NUR-INV-004 — Stock Analytics lifetime stats
- **Expected Result:** Given-out lifetime, added lifetime, reservations fulfilled, currently-in-stock counts all shown; empty state "No activity yet" when nothing has happened.
- **Priority:** P2
- **Test Type:** Positive

---

### C9. NGO Interactions (Bulk Requirements)

#### NUR-BULK-001 — View open bulk requirements from NGOs, grouped correctly
- **Expected Result:** 4 tabs (Open/Responded/Accepted/Completed), computed client-side from requirement × own-response status combinations; a withdrawn/declined response correctly falls back to "Open" if the requirement itself is still open.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-BULK-002 — Send an offer with quantity exactly equal to available stock (boundary — should succeed)
- **Preconditions:** A species-specific requirement where `myStockQuantity = 50`.
- **Test Data:** Offer quantity: `50`
- **Expected Result:** Accepted — offering exactly what's in stock should succeed.
- **Priority:** P0
- **Test Type:** Boundary

#### NUR-BULK-003 — Send an offer with quantity 1 more than available stock (boundary — should block)
- **Test Data:** Offer quantity: `51` (when `myStockQuantity = 50`)
- **Expected Result:** Client-side confirm dialog warns "Not enough in stock — you only have 50… tried to offer 51" with a shortcut to Manage Inventory; if bypassed or attempted anyway, the server independently rejects with `INSUFFICIENT_STOCK` (defense in depth — verify both layers).
- **Priority:** P0
- **Test Type:** Boundary / Negative

#### NUR-BULK-004 — Send an offer on a requirement with no specific species (`speciesId` null)
- **Expected Result:** Per the API's own documentation, `myStockQuantity: null` here means "no specific species," **not** "stock unchecked" — verify the server does not silently skip the stock check in this case, since a null value could otherwise be misread as "unlimited."
- **Priority:** P1
- **Test Type:** Boundary
- **Notes:** Explicitly flagged as worth independent verification — the distinction between "null = not applicable" vs. "null = unchecked" matters here.

#### NUR-BULK-005 — Withdraw an offer
- **Preconditions:** Offer status is `proposed`.
- **Expected Result:** Withdraw is only available while `proposed` — not after `accepted`.
- **Priority:** P2
- **Test Type:** State Transition

#### NUR-BULK-006 — Mark an accepted offer as handed off
- **Preconditions:** NGO has accepted the offer (prerequisite: NGO-BULK-005).
- **Steps:** 1) Tap "Mark handed off"
- **Expected Result:** A handoff code is generated and shown to the nursery to share with the NGO in person; status becomes `handed_off`.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** NGO-BULK-005

#### NUR-BULK-007 — Nursery cannot self-mark an offer as "fulfilled"
- **Steps:** 1) After marking handed off, look for any nursery-side way to mark the requirement fulfilled directly
- **Expected Result:** None exists — fulfilment and reputation-counting only happen once the NGO confirms receipt with the handoff code (see NGO-BULK-007). Confirm this anti-fraud boundary holds.
- **Priority:** P0
- **Test Type:** Security / Positive

---

### C10. Individual-User Interactions

#### NUR-CUST-001 — Fulfil a pending sapling reservation
- **Preconditions:** An individual has requested a reservation (IND-CART-001).
- **Steps:** 1) Open Reservations 2) Tap "Fulfil" on the pending request → confirm ("Stock will be reduced")
- **Expected Result:** `POST /api/nursery/reservations/:id/fulfill` succeeds; stock decrements (see NUR-INV-001); reservation moves to History as `fulfilled`.
- **Priority:** P0
- **Test Type:** Positive
- **Dependencies:** IND-CART-001

#### NUR-CUST-002 — Decline a pending reservation
- **Expected Result:** Confirm required; status becomes `declined`; individual sees this reflected (IND-CART-004 equivalent notification).
- **Priority:** P1
- **Test Type:** Positive

#### NUR-CUST-003 — Reservation fulfil/decline failure shows inline per-row error
- **Preconditions:** Simulate a server error on fulfil.
- **Expected Result:** Error shown inline under that specific row, not a blocking global error.
- **Priority:** P2
- **Test Type:** Error Handling

#### NUR-CUST-004 — Order list filters (9 statuses + "All") and search
- **Steps:** 1) Use the filter sheet to select each status 2) Search by customer name or species
- **Expected Result:** List filters correctly; search is client-side substring match, case-insensitive.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-CUST-005 — Progress a pickup order: confirmed → packed → ready_for_pickup → picked_up
- **Steps:** 1) Mark as packed 2) Mark ready for pickup 3) Enter the customer's 4-digit pickup code (prerequisite: individual has this code — IND-ORDER-001) → confirm
- **Expected Result:** Each transition succeeds in order; the pickup-code confirm button is disabled until exactly 4 digits are entered.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** IND-ORDER-001

#### NUR-CUST-006 — Progress a delivery order: assign a delivery partner and dispatch
- **Preconditions:** At least one active delivery partner exists (prerequisite: NUR-DP-001).
- **Steps:** 1) Mark as packed 2) Assign a delivery partner from the picker (filtered to active partners) 3) Dispatch ("Send out with {name}")
- **Expected Result:** Order moves to `out_for_delivery`; delivery confirmation now happens on the delivery partner's own app, not the nursery's — nursery sees a passive "waiting for rider to confirm" banner once a rider is assigned.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** NUR-DP-001

#### NUR-CUST-007 — Reassign a delivery partner mid-flight
- **Preconditions:** Order is `confirmed` through `out_for_delivery`.
- **Expected Result:** Reassignment is available right up until the order has actually left (i.e. through `out_for_delivery` inclusive), not just at initial assignment.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-CUST-008 — Cancel an order at each still-cancellable status
- **Preconditions:** Order at `confirmed`, `packed`, or `ready_for_pickup`.
- **Expected Result:** Cancel is available at all three (explicitly including `ready_for_pickup`, so a nursery can cancel a no-show pickup instead of holding stock hostage); a customer-facing "refunded and notified" banner appears.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-CUST-009 — Attempt to cancel an order past `out_for_delivery`
- **Expected Result:** Cancel option no longer offered.
- **Priority:** P1
- **Test Type:** Boundary

#### NUR-CUST-010 — Respond to a customer review
- **Steps:** 1) Open a review 2) Write a response → submit
- **Expected Result:** Response saved and shown in a highlighted box; an "Edit" link allows editing indefinitely (no one-response lock, no observed character cap).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-CUST-011 — Edit a previously submitted review response
- **Expected Result:** Reopens the same form pre-filled; saves successfully.
- **Priority:** P3
- **Test Type:** Positive

#### NUR-CUST-012 — Empty reservations/reviews states
- **Expected Result:** "No requests yet." / "No reviews yet." respectively.
- **Priority:** P3
- **Test Type:** Boundary

---

### C11. Statistics / Streaks ("Growth & Trust")

#### NUR-GROWTH-001 — Growth level and progress-to-next-level
- **Expected Result:** `seedling → growing → established → evergreen`, driven by lifetime supplied count and/or months active; progress text shows saplings-to-next and/or months-to-next.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-GROWTH-002 — Trust Score gauge with 4 factors
- **Expected Result:** Fulfilment/rating/inventory-freshness/responsiveness factors shown correctly.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-GROWTH-003 — Four streak cards use mixed units — verify each independently
- **Scenario:** Supply Streak and Inventory Freshness Streak and ARTH Contribution Streak are **weekly** activity flags, while Fulfilment Streak is **consecutive-order**-based (no cancellations) — a different unit entirely on the same screen.
- **Steps:** 1) Trigger each streak's underlying activity independently 2) Verify each card's "current"/"longest" values track the correct unit (weeks vs. order count)
- **Expected Result:** Each streak type behaves per its own actual definition — do not assume all four cards mean "consecutive weeks."
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged as a likely source of tester/user confusion even if functioning as designed — see Potential Issues.

#### NUR-GROWTH-004 — Impact screen aggregate stats and monthly trend bar chart
- **Expected Result:** Trees growing through you, total saplings supplied, verification %, species count, NGO drives supported, est. CO₂/year all shown; "View on Map" deep-links to the nursery's own map pin.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-GROWTH-005 — Impact screen empty trend
- **Expected Result:** "No plantings tracked yet."
- **Priority:** P3
- **Test Type:** Boundary

---

### C12. Notifications

#### NUR-NOTIF-001 — Nursery-relevant notification types route correctly
- **Expected Result:** `reservation_requested` deep-links to `NurseryReservations` (this notification type is nursery-only and should never appear/fire for an Individual — cross-check against IND-NOTIF-005, which is the individual-side outcome type instead).
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Superseded by the fully-enumerated cases below, derived directly from `NotificationsScreen.tsx`'s `openTarget` switch rather than assumed.

#### NUR-NOTIF-002 — `stock_low` / `stock_out_of_stock` open Stock management
- **Expected Result:** Both navigate to `NurseryStock`.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-NOTIF-003 — `bulk_requirement_nearby` opens the specific requirement
- **Expected Result:** If `requirementId` is present, opens `NurseryBulkRequirementDetail`; otherwise falls back to the `NurseryBulkRequirements` list.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-NOTIF-004 — `bulk_requirement_response_accepted` opens the specific requirement
- **Expected Result:** Same fallback pattern as NUR-NOTIF-003.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-NOTIF-005 — `sapling_planted` / `nursery_tree_milestone` / `nursery_impact_milestone` open Impact
- **Expected Result:** All three navigate to `NurseryImpact`.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-NOTIF-006 — Order-lifecycle notifications open the correct nursery-side order screen
- **Expected Result:** `order_placed` through `order_plantation_verified` and `order_fulfillment_today` navigate to `NurseryOrderDetail` when an `orderId` is present in the payload, else to the plain `NurseryOrders` list — mirrors the Individual pattern (IND-NOTIF-006) but routes to the nursery-specific screen names.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-NOTIF-007 — `follow_request` opens the Followers screen's Requests tab
- **Expected Result:** Navigates to `NurseryFollowers` with the "Requests" tab active (contrast with NGO, which has a wholly separate `NgoFollowerRequestsScreen` — verify the nursery version actually lands on the Requests tab, not the default Followers tab).
- **Priority:** P1
- **Test Type:** Positive

#### NUR-NOTIF-008 — `reservation_requested` opens Reservations
- **Expected Result:** Navigates to `NurseryReservations`.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-NOTIF-009 — `new_follower` / `follow_accepted` tap — same flagged gap as NGO
- **Expected Result:** **Unclear / flagged** — identical root cause to NGO-NOTIF-010: no explicit case for these types, and the generic actor-kind fallback won't match an individual follower. Confirm actual on-device behavior for a nursery account.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** See NGO-NOTIF-010 — same code path (`NotificationsScreen.tsx`), shared across roles.

---

### C13. Settings

Covered in depth under C5 (Profile). Additional settings-specific cases:

#### NUR-SET-001 — Settings screen accessible in every approval state
- **Expected Result:** Not status-gated — pending/rejected/suspended nurseries can reach and use Settings normally.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-SET-002 — Delete Account (shared mechanism)
- **Expected Result:** Same no-re-auth confirm-dialog-only mechanism as Individual (IND-SET-004) — verify against a nursery account.
- **Priority:** P1
- **Test Type:** Security

#### NUR-SET-003 — "My Bulk Responses" is reachable and correct for Nursery
- **Expected Result:** Unlike the Individual role (where this screen is unreachable/out of scope — IND-REC-005), a nursery **should** be able to reach `MyBulkResponsesScreen` showing every offer it has made to NGO bulk requirements.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Direct counterpart to IND-REC-005 — confirms correct role-scoping of this screen.

**Clarification — architecturally distinct from NGO:** `NurserySettingsScreen.tsx` is a fully separate, hand-rolled screen (in-app titled **"Settings"**) that does **not** delegate to the shared `SettingsScreen.tsx` component the way NGO's gear icon does (B17) — it duplicates the same preferences/account/safety UI directly. The cases below test that duplicated implementation explicitly, since a future change to one screen will not automatically apply to the other.

#### NUR-SET-004 — Preference toggles persist for a nursery account
- **Expected Result:** Ambient Mode / Nature Sounds / Haptic Feedback / Reduce Motion / Push Notifications / Streak Reminders / Public Profile / Usage Analytics all toggle and persist — mirrors IND-SET-001/002.
- **Priority:** P2
- **Test Type:** Positive
- **Notes:** Verify independently of the NGO/Individual equivalents — this is separate code, not shared.

#### NUR-SET-005 — "My Responses" row shows correct content
- **Expected Result:** Navigates to `MyBulkResponsesScreen`, showing every offer this nursery has made to NGO bulk requirements (cross-ref NUR-SET-003, which confirms role-scoping — this case confirms the row's actual list content).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-SET-006 — "My Activity" section (Following/Liked Posts/Saved Posts/My Reports)
- **Expected Result:** All four navigate correctly; "Following" is the same shared `FollowingScreen` as Individual/NGO (IND-SET-013).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-SET-007 — "Browse NGOs" / "Browse Nurseries" from Nursery Settings
- **Expected Result:** Both rows present unconditionally on this screen (unlike the shared `SettingsScreen`, where the equivalent section is gated behind `role === 'ngo'` — Nursery gets its own copy of this section built directly into its dedicated screen).
- **Priority:** P2
- **Test Type:** Positive

#### NUR-SET-008 — Blocked Accounts / Notifications rows under Safety
- **Expected Result:** Behave identically to Individual/NGO (IND-SET-009..012).
- **Priority:** P2
- **Test Type:** Regression

#### NUR-SET-009 — Change Password / Connected Devices / Privacy Policy / Terms / Send Feedback / App Version
- **Expected Result:** All present and functional, identical content/behavior to the Individual and NGO equivalents.
- **Priority:** P3
- **Test Type:** Regression

#### NUR-SET-010 — Log Out / Delete Account for a nursery
- **Expected Result:** Same no-re-auth confirm-only mechanism; verify what happens to the nursery's live stock listings/pending orders after deletion — not independently confirmed, flag if orphaned records remain visible to individuals with in-flight orders.
- **Priority:** P1
- **Test Type:** Security
- **Notes:** Same class of concern as NGO-SET-012 — higher-stakes than Individual deletion because of live marketplace listings and potentially in-flight paid orders.

---

### C14. Other Implemented Features

#### C14a. Pickup / Delivery Configuration

#### NUR-CONFIG-001 — Attempt to disable both pickup and delivery
- **Steps:** 1) Turn off "Offer pickup" 2) Turn off "Offer delivery" 3) Save
- **Expected Result:** Blocked with "Enable at least one of pickup or delivery — you can't turn both off."
- **Priority:** P1
- **Test Type:** Validation

#### NUR-CONFIG-002 — Enable delivery without a saved address/location
- **Steps:** 1) Turn on "Offer delivery" with no address set 2) Save
- **Expected Result:** Blocked with a message prompting to add an address or use current location first.
- **Priority:** P1
- **Test Type:** Validation

#### NUR-CONFIG-003 — Set delivery fee / minimum order / radius
- **Expected Result:** Blank delivery fee = platform default; blank minimum = none; radius accepted numerically with no observed client-side bound.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-CONFIG-004 — Add/remove pickup windows and operating-hours rows with no time-format enforcement
- **Test Data:** Pickup window start: `abc` (not a time)
- **Expected Result:** No format validation was observed on these free-text time fields — verify whether the server rejects malformed values, since the client does not.
- **Priority:** P2
- **Test Type:** Validation
- **Notes:** Flagged — see Potential Issues.

#### C14b. Delivery Partner Management (nursery-initiated)

#### NUR-DP-001 — Create a delivery partner account
- **Test Data:** Name, handle (auto-lowercased), email (live-availability-checked), phone (10-digit, live-taken-checked), temporary password (≥8 chars).
- **Steps:** 1) Fill the form 2) Submit
- **Expected Result:** `POST /api/nursery/delivery-partners` succeeds; the nursery is shown a reminder to share the password with the partner directly — **there is no partner self-signup flow**; the nursery sets the partner's initial credentials.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-DP-002 — Edit a delivery partner's name/phone
- **Expected Result:** Uses a separate edit form from create, specifically to avoid a false "phone already taken" check against the partner's own current number.
- **Priority:** P2
- **Test Type:** Regression

#### NUR-DP-003 — Deactivate a delivery partner with in-progress deliveries
- **Preconditions:** Partner currently has 1+ active order assigned.
- **Steps:** 1) Tap deactivate → confirm
- **Expected Result:** Confirm dialog explains: no longer assignable to *new* orders, but in-progress deliveries keep working.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-DP-004 — Reactivate a delivery partner
- **Expected Result:** Immediate, no confirm dialog required.
- **Priority:** P3
- **Test Type:** Positive

#### NUR-DP-005 — Deactivated partners are excluded from the order-assignment picker
- **Expected Result:** `NurseryOrderDetailScreen`'s assign/reassign sheet only lists `isActive` partners.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-DP-006 — Nursery has no visibility into live delivery-partner GPS tracking
- **Steps:** 1) Look for a live map/ETA view of an assigned partner from the nursery side
- **Expected Result:** None exists — the nursery only sees rider name/phone on the order detail; live location/ETA tracking is a customer-facing feature only (deliberate, per code comments).
- **Priority:** P3
- **Test Type:** Regression

#### C14c. Nursery Directory (browsing other nurseries) and Community

#### NUR-DIR-001 — Search/filter other nurseries by name/city, "Delivers" and "Nearby"
- **Expected Result:** Same filter mechanism available to a nursery browsing peers as to an Individual (IND-MAP-007).
- **Priority:** P3
- **Test Type:** Positive

#### NUR-DIR-002 — No pagination on directory results at scale
- **Expected Result:** Flat list with no visible "load more" — verify behavior with a very large nursery count.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-COMM-001 — Post/story composer for nursery — approved vs. not
- **Expected Result:** Mirrors NGO-PEND-007/NGO-COMM-002 exactly: not gated at the button, but silently falls back to posting as the personal account when `status !== 'approved'`.
- **Priority:** P1
- **Test Type:** State Transition

#### NUR-COMM-002 — Nursery has no dedicated "own posts" management screen
- **Scenario:** Confirm there is no `NurseryCommunityScreen`/`NurseryOwnPosts` equivalent to NGO's Community tab.
- **Steps:** 1) As a nursery, look for a screen listing only the nursery's own posts with delete/manage controls
- **Expected Result:** No such screen exists in the current build — a nursery's own posts are only reviewable via its own `NurseryPublicProfile`/profile Posts tab (as any account would see them), with the same generic post-delete affordance as Individual (IND-SOCIAL-011), not a dedicated management screen like NGO's `NgoCommunityScreen`.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Confirmed via file search — no `NurseryCommunityScreen` exists in the codebase, unlike its NGO counterpart. Flag as a product asymmetry, not an assumed defect.

#### C14d. Nursery Followers & Follow Requests

Screen: `NurseryFollowersScreen` — a single screen with two tabs, contrast with NGO's two separate screens (B18c).

#### NUR-FOLLOW-001 — Followers/Requests combined into one tabbed screen
- **Steps:** 1) Open `NurseryFollowersScreen` 2) Switch between the "Followers" and "Requests" tabs
- **Expected Result:** Unlike NGO (separate `NgoFollowersScreen` + `NgoFollowerRequestsScreen`), Nursery uses a single screen with two tabs sharing one search box; confirm the tab switch correctly refetches with the right `status` filter each time.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-FOLLOW-002 — Accept / Decline a pending follow request
- **Expected Result:** Same accept/decline mechanism as NGO-FOLLOW-001/002, scoped to the "Requests" tab's rows.
- **Priority:** P1
- **Test Type:** Positive

#### NUR-FOLLOW-003 — Remove an accepted follower
- **Steps:** 1) On the "Followers" tab, tap "Remove" → confirm
- **Expected Result:** Confirm dialog required, copy states the follower "can follow you again later" — same no-notification behavior as NGO-FOLLOW-006.
- **Priority:** P2
- **Test Type:** Positive

#### NUR-FOLLOW-004 — Search filters whichever tab is active
- **Steps:** 1) Type a query while on "Followers" 2) Switch to "Requests" with the same query still entered
- **Expected Result:** Confirm whether the search term persists across the tab switch and correctly filters both, since both tabs share one query state and one API call shape (`status`+`q`).
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-FOLLOW-005 — Empty states differ per tab
- **Expected Result:** "Requests" tab empty: "No pending requests"; "Followers" tab empty: "No followers yet" — verify both copy variants independently.
- **Priority:** P3
- **Test Type:** Boundary

#### NUR-FOLLOW-006 — No open-policy explanatory banner on the Requests tab
- **Scenario:** Contrast with NGO-FOLLOW-003, where an "open" follow policy replaces the empty Requests list with an explanatory note + settings link.
- **Steps:** 1) With follow policy set to "open" (toggle lives on `EditNurseryProfileScreen`, mirroring NGO's policy toggle on `NgoSettingsScreen`), open the Requests tab
- **Expected Result:** No equivalent banner was found in this screen's code — confirm whether the Requests tab instead shows a bare "No pending requests" empty state, which would be misleading (implies requests could appear, when under an open policy they structurally never will).
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged inconsistency vs. the NGO role's equivalent screen — worth a product decision, not just a test note.

---

## Cross-Role Mobile UAT

These scenarios chain actions across two or more mobile apps/roles (with Admin steps marked explicitly as **[ADMIN PREREQUISITE — not a mobile test step]**) to verify the platform behaves consistently end-to-end, not just within one role's screens.

### Individual ↔ NGO

#### CROSS-ING-001 — Individual discovers, RSVPs, and NGO sees the volunteer
- **Steps:** 1) NGO creates a drive (NGO-DRIVE-001) 2) Individual finds it in `DrivesListScreen` (IND-DRIVE-001) and RSVPs (IND-DRIVE-002) 3) NGO opens `NgoVolunteersScreen`
- **Expected Result:** The individual appears as a volunteer with a correct drives-attended count once the drive occurs; NGO's confirmed/capacity count on the drive reflects the RSVP immediately (not just at drive time).
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** NGO-DRIVE-001, IND-DRIVE-002

#### CROSS-ING-002 — Individual sponsors a plant; NGO's donation/reports totals update
- **Steps:** 1) Individual sponsors a plant on a drive (IND-DRIVE-006) 2) NGO checks Reports' "Sponsored Trees" total and ₹ raised
- **Expected Result:** Figures reflect the new sponsorship without requiring app restart (pull-to-refresh acceptable).
- **Priority:** P1
- **Test Type:** Integration

#### CROSS-ING-003 — Individual donates to a campaign; NGO sees it in Donations and Reports
- **Steps:** 1) Individual donates (IND-DON-001) 2) NGO checks `NgoDonationsScreen` and the Reports donations chart
- **Expected Result:** Donation appears with correct status/attribution in both places.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-DON-001, NGO-INDIV-007

#### CROSS-ING-004 — Individual adopts a tree; NGO sees the adopter on the tree card
- **Steps:** 1) NGO lists an adoptable tree (NGO-DRIVE-008) 2) Individual adopts it with a message (IND-ADOPT-002) 3) NGO opens `NgoTreesScreen`
- **Expected Result:** Tree flips to "adopted"; adopter's name/handle/message appear inline on the NGO's card.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** NGO-DRIVE-008, IND-ADOPT-002

#### CROSS-ING-005 — NGO releases an adopted tree; individual sees it leave My Adoptions
- **Steps:** 1) Following CROSS-ING-004, NGO releases the tree (NGO-DRIVE-009) 2) Individual reopens `MyAdoptionsScreen`
- **Expected Result:** Tree no longer appears in the individual's adoption list; tree reappears as available in `AdoptTreeListScreen` for other individuals.
- **Priority:** P1
- **Test Type:** Integration
- **Dependencies:** CROSS-ING-004

#### CROSS-ING-006 — NGO removes a listing with a live adoption; adopter is notified
- **Steps:** 1) Following CROSS-ING-004, NGO taps "Remove listing" (NGO-DRIVE-010) 2) Individual checks Notifications and `MyAdoptionsScreen`
- **Expected Result:** Individual's adoption is auto-released; a notification is received; tree detail (if still cached/deep-linked) shows "no longer available" (IND-ADOPT-004).
- **Priority:** P1
- **Test Type:** Integration
- **Dependencies:** CROSS-ING-004

#### CROSS-ING-007 — Individual follows an NGO with approval-required policy; NGO accepts
- **Steps:** 1) NGO sets follow policy to "approval" (NGO-PROF-003) 2) Individual follows (IND-SOCIAL-014), sees "Requested" 3) NGO accepts in `NgoFollowerRequestsScreen` (NGO-INDIV-003)
- **Expected Result:** Individual's state flips from "Requested" to "Following ✓" (verify whether this requires a manual refresh or updates live/on next screen focus).
- **Priority:** P1
- **Test Type:** Integration
- **Dependencies:** NGO-PROF-003, IND-SOCIAL-014, NGO-INDIV-003

#### CROSS-ING-008 — Individual reports/blocks an NGO's post; content moderation reflected
- **Steps:** 1) Individual reports an NGO post (mirrors IND-PROFILE-011 but on a post) 2) Individual checks `MyReportsScreen` later
- **Expected Result:** Report status progresses from "Under review" to whatever the (out-of-scope, admin-side) resolution sets it to — mobile-visible outcome only.
- **Priority:** P2
- **Test Type:** Integration

---

### NGO ↔ Nursery

#### CROSS-NN-001 — Full bulk-requirement lifecycle: post → offer → accept → hand off → confirm
- **Steps:** 1) NGO posts a requirement (NGO-BULK-001) 2) Nursery views it under "Open" and sends an offer (NUR-BULK-001/002) 3) NGO accepts (NGO-BULK-005) 4) Nursery marks handed off (NUR-BULK-006) and shares the handoff code out-of-band 5) NGO confirms receipt with the code (NGO-BULK-007)
- **Expected Result:** Requirement/offer status progresses correctly at each step on **both** sides' screens (nursery sees Open→Responded→Accepted→Completed tabs move the card; NGO sees the offer list update); sapling units are only "minted"/nursery reputation only updates at the final NGO-confirmation step, never earlier.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** NGO-BULK-001, NUR-BULK-002, NGO-BULK-005, NUR-BULK-006, NGO-BULK-007

#### CROSS-NN-002 — Nursery offers more than it has in stock; NGO never sees an offer it can't fulfill
- **Steps:** 1) NGO posts a species-specific requirement 2) Nursery attempts to offer more than `myStockQuantity` (NUR-BULK-003)
- **Expected Result:** Blocked client-side (and server-side as a backstop) before the offer ever reaches the NGO — verify no "phantom" over-committed offer appears on the NGO's side.
- **Priority:** P0
- **Test Type:** Integration / Negative
- **Dependencies:** NUR-BULK-003

#### CROSS-NN-003 — NGO enters a wrong handoff code; nursery's status is unaffected
- **Steps:** 1) Following a nursery hand-off (NUR-BULK-006), NGO enters an incorrect code (NGO-BULK-008) 2) Nursery re-checks the requirement's status
- **Expected Result:** Nursery still shows `handed_off`, not `fulfilled` — the wrong code on the NGO side must not silently advance the nursery's view.
- **Priority:** P1
- **Test Type:** Integration / Negative
- **Dependencies:** NUR-BULK-006

#### CROSS-NN-004 — NGO cancels a requirement after a nursery has already offered
- **Steps:** 1) Nursery sends an offer 2) NGO cancels the requirement before accepting (NGO-BULK-011)
- **Expected Result:** Nursery's offer/tab reflects the cancellation (moves out of "Open"/"Responded" appropriately) rather than being left in limbo.
- **Priority:** P2
- **Test Type:** Integration

#### CROSS-NN-005 — Requirement expires with a pending offer still outstanding
- **Steps:** 1) NGO's requirement passes its `neededByDate` unfulfilled with a nursery offer still `proposed` (NGO-BULK-009)
- **Expected Result:** Verify what happens to the nursery's now-orphaned offer once the NGO reschedules and reopens it — does the old offer reappear as still-active, or must the nursery re-offer? Document actual observed behavior; not assumed from static code alone.
- **Priority:** P2
- **Test Type:** Integration
- **Notes:** Flagged as needing on-device confirmation.

---

### Individual ↔ Nursery

#### CROSS-IN-001 — Free reservation: request → fulfil → stock decrements → individual sees it
- **Steps:** 1) Individual reserves a sapling (IND-CART-001) 2) Nursery fulfils it (NUR-CUST-001) 3) Individual reopens `MySaplingReservationsScreen`
- **Expected Result:** Status flips to `fulfilled` on the individual's side; stock ledger on the nursery's side shows the matching decrement (NUR-INV-001).
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-CART-001, NUR-CUST-001

#### CROSS-IN-002 — Paid order: full pickup lifecycle across both apps
- **Steps:** 1) Individual checks out with pickup fulfillment (IND-CHECKOUT-001) 2) Nursery packs → marks ready for pickup (NUR-CUST-005) 3) Individual arrives with the code shown in `OrderDetailScreen`, nursery enters it to confirm pickup
- **Expected Result:** Both sides' order status stay in lock-step at every transition; the pickup code matches on both ends; final state is `picked_up` (then `plantation_verified` once a review/verification step, if any, completes).
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-CHECKOUT-001, NUR-CUST-005

#### CROSS-IN-003 — Paid order: full delivery lifecycle including a delivery partner
- **Steps:** 1) Individual checks out with delivery fulfillment 2) Nursery packs, assigns a delivery partner, dispatches (NUR-CUST-006) 3) Individual sees live tracking + Delivery OTP (IND-ORDER-002) 4) Delivery partner (or nursery, if unassigned scenario) confirms delivery with the code
- **Expected Result:** Status lock-step across nursery/individual views; rider name/phone visible to the individual once assigned; nursery correctly loses direct delivery-confirmation control once a rider is assigned (per NUR-CUST-006).
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-CHECKOUT-001, NUR-CUST-006, NUR-DP-001

#### CROSS-IN-004 — Individual cancels an order the nursery hasn't packed yet
- **Steps:** 1) Individual cancels while `confirmed` (IND-ORDER-006) 2) Nursery reopens `NurseryOrdersScreen`
- **Expected Result:** Order shows `cancelled` on both sides; stock is restocked on the nursery's ledger (NUR-INV-002); no pack/dispatch action is offered anymore on the nursery side.
- **Priority:** P1
- **Test Type:** Integration

#### CROSS-IN-005 — Individual leaves a review after handoff; nursery responds
- **Steps:** 1) Individual submits a review (IND-ORDER-004) 2) Nursery opens `NurseryReviewsScreen` and responds (NUR-CUST-010)
- **Expected Result:** Review + response both visible correctly on each side; individual sees the nursery's response on their own `MyReviewsScreen`/order detail (verify whether the response actually surfaces on the individual's side, since this wasn't independently confirmed).
- **Priority:** P2
- **Test Type:** Integration
- **Notes:** Flagged — confirm whether the individual can actually see the nursery's response anywhere in their own UI.

#### CROSS-IN-006 — Individual follows a nursery with approval-required policy; nursery accepts
- **Steps:** Mirrors CROSS-ING-007 but for Nursery follow requests (`NurseryFollowersScreen` Requests tab).
- **Priority:** P1
- **Test Type:** Integration

#### CROSS-IN-007 — Individual's planted-tree nearby-stock recommendation links correctly to a real nursery listing
- **Steps:** 1) Individual plants a tree of a species a nearby nursery stocks (IND-PLANT-007) 2) Tap through to that nursery's public profile
- **Expected Result:** Correct nursery/stock data shown, no dead link.
- **Priority:** P2
- **Test Type:** Integration

---

### Tree Lifecycle (End-to-End)

#### CROSS-TREE-001 — Self-planted tree: plant → AI-verify → appears in Forest/Map → contributes to Impact stats
- **Steps:** 1) Individual completes the full Plant Tree flow (IND-PLANT-001, passing AI verification IND-VERIFY-001) 2) Check Forest tab scaling (IND-TREE-002) 3) Check Home/EcoInsights impact stats (IND-IMPACT-001)
- **Expected Result:** Tree count, CO₂ estimate, and forest scale all increase consistently across every screen that surfaces them — no screen should show a stale/mismatched count.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** IND-PLANT-001, IND-VERIFY-001

#### CROSS-TREE-002 — NGO-logged tree: log → zone/plantation rollup → health check → survival stats → reports
- **Steps:** 1) NGO logs planted trees against a drive/zone (NGO-LOG-001) 2) Mark a health check on one tree (NGO-HEALTH-001) 3) Check `NgoPlantationsScreen` survival % and `NgoReportsScreen`'s Survival & Attendance section
- **Expected Result:** Every rollup level (zone → plantation → reports) reflects the same underlying tree-status data consistently.
- **Priority:** P0
- **Test Type:** Integration
- **Dependencies:** NGO-LOG-001, NGO-HEALTH-001

#### CROSS-TREE-003 — Purchased sapling: order → handoff → "planting guide" → review → nursery impact stats
- **Steps:** 1) Individual completes a nursery order through handoff (CROSS-IN-002/003) 2) Individual views the planting guide (IND-ORDER-003) 3) Nursery checks `NurseryImpactScreen`'s "total saplings supplied"
- **Expected Result:** The purchased sapling counts toward the nursery's lifetime supplied figure once handed off; the marketplace lifecycle explicitly converges on "plantation_verified" as its true end state, mirroring the self-planted tree's AI-verification concept.
- **Priority:** P1
- **Test Type:** Integration
- **Dependencies:** CROSS-IN-002 or CROSS-IN-003

---

### Approval Lifecycle (Registration → Admin Action → Mobile Behavior)

#### CROSS-APR-001 — NGO: registration → pending → [ADMIN PREREQUISITE: Admin approves from AdminNgoApprovalDetailScreen] → mobile behavior change
- **Steps:** 1) Complete NGO-REG-001 2) Verify pending-state behavior (Section B3 cases) 3) **[ADMIN PREREQUISITE]** Admin opens `AdminNgoApprovalDetailScreen` and taps Approve 4) Re-run NGO-APPR-001 on the same account without reinstalling/re-logging-in if possible (to check whether the change reflects live) — then also verify after a fresh login
- **Expected Result:** Gated actions that were blocked in step 2 now succeed in step 4; verify whether the change requires a fresh app load / pull-to-refresh of the profile query, or applies instantly mid-session.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite action

#### CROSS-APR-002 — NGO: registration → pending → [ADMIN PREREQUISITE: Admin rejects with a reason] → mobile behavior change
- **Steps:** 1) Complete NGO-REG-001 2) **[ADMIN PREREQUISITE]** Admin rejects with a reason in `AdminNgoApprovalDetailScreen` 3) Verify NGO-REJ-001 through NGO-REJ-005
- **Expected Result:** Rejection reason surfaces in Settings; all previously-gated actions remain blocked with rejected-specific modal copy; per NGO-REJ-001, confirm there is genuinely no resubmit path.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite action

#### CROSS-APR-003 — Nursery: registration → pending → [ADMIN PREREQUISITE: Admin approves] → mobile behavior change
- **Steps:** Mirrors CROSS-APR-001 for the Nursery role via `AdminNurseryApprovalDetailScreen` and NUR-APPR-001.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite action

#### CROSS-APR-004 — Nursery: registration → pending → [ADMIN PREREQUISITE: Admin rejects] → resubmit → pending again
- **Steps:** 1) Complete NUR-REG-001 2) **[ADMIN PREREQUISITE]** Admin rejects with a reason 3) Nursery resubmits via `EditNurseryProfileScreen` (NUR-APPR-003) 4) **[ADMIN PREREQUISITE]** Admin approves the resubmission
- **Expected Result:** Full round-trip works end-to-end: pending → rejected → (nursery-initiated) pending → approved. This is the one role where a complete self-service recovery loop exists.
- **Priority:** P0
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite actions (×2)

#### CROSS-APR-005 — Nursery: registration → pending → [ADMIN PREREQUISITE: Admin suspends] → mobile behavior change
- **Steps:** 1) Approve a nursery, then **[ADMIN PREREQUISITE]** Admin suspends it with a reason 2) Verify NUR-APPR-004/005
- **Expected Result:** Suspended-specific modal copy; no resubmit path (distinct from rejected); mailto support link only.
- **Priority:** P1
- **Test Type:** State Transition
- **Dependencies:** Admin prerequisite action

#### CROSS-APR-006 — Confirm NGO/Nursery `status` is distinct from the account-level "blocked" mechanism
- **Steps:** 1) With an NGO/Nursery in `approved` status, **[ADMIN PREREQUISITE]** Admin uses the separate account-block mechanism (not NGO/Nursery Suspend) 2) Observe mobile behavior
- **Expected Result:** `AccountBlockedScreen` takes over (same as IND-AUTH-016), which is a stricter, different lockout than `status:'suspended'` — verify the two mechanisms don't get confused with each other in the actual admin tooling or mobile UI copy.
- **Priority:** P1
- **Test Type:** Regression
- **Dependencies:** Admin prerequisite action

---

## Mobile-Specific Testing

Scoped strictly to what's implemented — e.g. no biometric-lock cases (none exists), no offline-queue/sync cases (no offline queueing was found; all network handling is per-screen inline error text with a single automatic retry).

### Android Back Button

#### MOBILE-BACK-001 — Hardware back button on a stack-pushed screen
- **Steps:** 1) Navigate Home → Drives → Drive Detail 2) Press hardware Back
- **Expected Result:** Standard stack pop back to Drives, matching the in-app back arrow.
- **Priority:** P1
- **Test Type:** Positive

#### MOBILE-BACK-002 — Hardware back button on a modal screen (Plant Tree, Emoji Picker, Home Theme Picker, Campaign Detail)
- **Steps:** 1) Open Plant Tree (presented modally) 2) Press hardware Back mid-flow
- **Expected Result:** Modal dismisses cleanly (equivalent to swipe-down); no partial/corrupt tree submission; no crash.
- **Priority:** P1
- **Test Type:** Negative

#### MOBILE-BACK-003 — Hardware back button on a bottom-tab root screen (Home/Dashboard)
- **Steps:** 1) From the Home tab (Individual/NGO/Nursery), press hardware Back
- **Expected Result:** Verify actual behavior — standard Android convention is either exiting the app or a "press back again to exit" toast; confirm which is implemented (not assumed) since this wasn't independently verified in the code audit.
- **Priority:** P2
- **Test Type:** Regression
- **Notes:** Flagged for on-device confirmation.

#### MOBILE-BACK-004 — Back button during an in-flight mutation (e.g. mid-checkout payment)
- **Steps:** 1) Start a checkout payment 2) Press Back while the Stripe sheet or mutation is in flight
- **Expected Result:** No duplicate order/charge created; app does not crash; verify the in-flight request either completes or is safely abandoned.
- **Priority:** P1
- **Test Type:** Negative

#### MOBILE-BACK-005 — Back button on a wizard step (NGO/Nursery registration)
- **Steps:** 1) Mid-way through the 9-step NGO wizard or 7-step Nursery wizard, press hardware Back
- **Expected Result:** Matches the in-app "Back" step navigation (goes to the previous step, not out of the wizard entirely) — verify actual behavior, since wizards sometimes intercept hardware back differently than a stack screen would.
- **Priority:** P2
- **Test Type:** Regression

---

### App Backgrounding / Foregrounding / Restart

#### MOBILE-BG-001 — Background and resume mid-planting-flow
- **Steps:** 1) Start Plant Tree, capture a photo, reach species selection 2) Background the app (home button) 3) Resume after 1+ minute
- **Expected Result:** Flow state is preserved (species selection screen, photo intact) or, if not preserved, fails gracefully back to a sane screen rather than crashing or showing corrupted state.
- **Priority:** P1
- **Test Type:** Regression

#### MOBILE-BG-002 — Background during the AI verification scan animation
- **Steps:** 1) Capture a planting photo, immediately background the app during the ~3.8s scan 2) Resume
- **Expected Result:** Verification result (pass/fail) is still correctly applied once resumed — the parallel API call should not be cancelled by backgrounding.
- **Priority:** P1
- **Test Type:** Regression

#### MOBILE-BG-003 — Background during an active Stripe payment sheet
- **Steps:** 1) Open the Stripe payment sheet for a donation/sponsorship/checkout 2) Background the app 3) Resume
- **Expected Result:** Sheet state is preserved or safely reset; no duplicate charge; no crash.
- **Priority:** P1
- **Test Type:** Negative

#### MOBILE-BG-004 — Force-quit and relaunch after cold-start session persistence
- **Covered in depth as IND-AUTH-013** — re-verify here specifically for NGO and Nursery accounts too, including mid-pending-status accounts.
- **Priority:** P0
- **Test Type:** State Transition

#### MOBILE-BG-005 — App restart while an Android delivery-location-reporting session is active (Delivery Partner-adjacent, nursery-visibility only)
- **Scenario:** Not directly testable from the Individual/NGO/Nursery apps in scope, but relevant to CROSS-IN-003 — verify a nursery's view of an in-progress delivery doesn't break if the assigned delivery partner's app is backgrounded/restarted mid-delivery.
- **Priority:** P3
- **Test Type:** Integration
- **Notes:** Delivery Partner role itself is out of scope; this case only verifies the nursery-side view degrades gracefully.

---

### Network Conditions

#### MOBILE-NET-001 — No network at app launch
- **Steps:** 1) Enable Airplane Mode 2) Launch the app (already logged in)
- **Expected Result:** `GET /api/users/me` fails; verify the app shows a sensible state (e.g. falls through to Login, or shows a retry-able error) rather than an indefinite spinner. No global offline banner exists anywhere in the app — confirm this is actually the case and that each affected screen's own inline error is legible.
- **Priority:** P0
- **Test Type:** Error Handling
- **Notes:** No systemic offline indicator was found — flagged in Potential Issues.

#### MOBILE-NET-002 — Network drops mid-action (e.g. mid-checkout, mid-drive-RSVP, mid-tree-planting submit)
- **Steps:** 1) Start the action 2) Disable network right before/during the request
- **Expected Result:** React Query's single automatic retry (`retry:1`) fires; if still failing, an inline, screen-specific error message appears; no partial/duplicate state is created.
- **Priority:** P0
- **Test Type:** Error Handling

#### MOBILE-NET-003 — Network restored after a failed action — retry
- **Steps:** 1) Following MOBILE-NET-002, re-enable network 2) Manually retry the same action (e.g. tap Submit again)
- **Expected Result:** Action succeeds cleanly on retry, no leftover error state, no duplicate submission from the earlier failed attempt.
- **Priority:** P1
- **Test Type:** Positive

#### MOBILE-NET-004 — Slow/throttled network on image-heavy screens (feed, post composer with multiple photos)
- **Steps:** 1) Throttle network to 2G-equivalent 2) Scroll the feed / submit a 6-photo post
- **Expected Result:** Images load progressively without blocking the UI thread; upload shows a "Posting…" busy state for the duration; no timeout crash (verify — multipart uploads have no explicit client-side timeout override observed).
- **Priority:** P1
- **Test Type:** Boundary

#### MOBILE-NET-005 — Intermittent connectivity during Map/GPS operations
- **Steps:** 1) Toggle airplane mode on/off repeatedly while on the Map tab or mid-Plant-Tree location fetch
- **Expected Result:** GPS reads (which don't require network) should still resolve; only the network-dependent eligibility/reverse-geocode calls should show transient errors that clear once connectivity returns.
- **Priority:** P2
- **Test Type:** Boundary

#### MOBILE-NET-006 — API timeout on a long-running request
- **Steps:** 1) Simulate a very slow server response (proxy/delay tool) for any mutation
- **Expected Result:** Verify actual client-side timeout behavior — no explicit request-timeout configuration was found in `api/client.ts` beyond the platform default; confirm the UI doesn't hang indefinitely with no feedback.
- **Priority:** P1
- **Test Type:** Boundary
- **Notes:** Flagged as worth explicit confirmation — see Potentially Untested Areas.

---

### Permissions

#### MOBILE-PERM-001 — Camera permission denied at Plant Tree
- **Covered as IND-VERIFY-007 (location) — camera-specific case:**
- **Steps:** 1) Deny the OS camera permission prompt when Plant Tree requests it
- **Expected Result:** `expo-image-picker` surfaces its own denial handling — verify the screen shows an actionable message/retry rather than silently doing nothing.
- **Priority:** P0
- **Test Type:** Permission

#### MOBILE-PERM-002 — Camera permission denied at Nursery/NGO registration verification-photo step
- **Expected Result:** Since this step is camera-only with no gallery fallback, a denial must still leave the user with a clear path to grant permission and retry — verify this explicitly, since a hard block here would strand the entire registration wizard.
- **Priority:** P0
- **Test Type:** Permission

#### MOBILE-PERM-003 — Gallery/photo-library permission denied on any gallery-based picker (posts, stock photos, logos, portfolio)
- **Expected Result:** Consistent denial handling across all gallery-picker usages — verify none of them crash or hang.
- **Priority:** P1
- **Test Type:** Permission

#### MOBILE-PERM-004 — Location permission denied → granted later (re-prompt flow)
- **Steps:** 1) Deny location at Plant Tree/Checkout/Map 2) Go to device Settings and grant it 3) Return to the app and retry
- **Expected Result:** The app re-requests/re-reads successfully without requiring a full app restart.
- **Priority:** P1
- **Test Type:** Permission

#### MOBILE-PERM-005 — Location "Tracking" app-setting OFF vs. OS-level permission — interaction check
- **Steps:** 1) Grant OS location permission 2) Turn the in-app "Location Tracking" setting OFF 3) Open Map
- **Expected Result:** Ambient/automatic reads (Map) respect the app setting and skip requesting even though OS permission is granted; explicit user-initiated actions (Plant Tree submit) still always take a real GPS fix regardless of this setting (per code comments) — verify both halves of this distinction hold.
- **Priority:** P1
- **Test Type:** Permission

#### MOBILE-PERM-006 — Push notification permission denied
- **Expected Result:** `usePushRegistration` should no-op gracefully; app remains fully usable without push (in-app Notifications screen still works via polling/manual open).
- **Priority:** P2
- **Test Type:** Permission

---

### Image Upload

#### MOBILE-IMG-001 — Large image file upload (multi-MB, high-resolution device camera)
- **Steps:** 1) Capture/select a very high-resolution photo (e.g. 12MP+) for a post, stock item, or verification photo 2) Submit
- **Expected Result:** All uploads compress to JPEG quality 0.85 client-side before sending — no explicit file-size or dimension cap was found beyond that compression; verify upload completes in reasonable time and doesn't fail on a real device with a large sensor.
- **Priority:** P1
- **Test Type:** Boundary

#### MOBILE-IMG-002 — Image upload failure (network drop mid-upload)
- **Steps:** 1) Start any photo-attached submission 2) Kill network mid-upload
- **Expected Result:** Inline `ApiError`-driven failure message, not a silent hang; user can retry.
- **Priority:** P1
- **Test Type:** Error Handling

#### MOBILE-IMG-003 — Cancel the camera/gallery picker mid-selection
- **Expected Result:** `result.canceled` is handled gracefully everywhere — no crash, form remains in its prior state.
- **Priority:** P2
- **Test Type:** Negative

#### MOBILE-IMG-004 — Multi-photo picker at exactly its max count (6 for posts/portfolio, 5 for NGO past-work at registration, 1 for stories)
- **Expected Result:** Exactly the max is accepted; one more than the max is silently trimmed (not rejected with an error) in every multi-photo picker found in the app.
- **Priority:** P2
- **Test Type:** Boundary

#### MOBILE-IMG-005 — `resolveMediaUrl()` regression check — raw server-relative image paths never render
- **Scenario:** A latent-bug class flagged directly in the codebase's own comments: any screen that renders a post/logo/avatar image **must** pass the path through `resolveMediaUrl()` first, or the image silently fails to render with no visible error.
- **Steps:** 1) After any new screen/feature touches images, spot-check that photos actually render (drive thumbnails, post images, stock photos, avatars, logos) across Individual/NGO/Nursery
- **Expected Result:** All images render; none show a blank/broken image silently.
- **Priority:** P1
- **Test Type:** Regression
- **Notes:** Explicitly called out in-code as the root cause of a real historical bug (missing drive thumbnails) — good standing regression check for every release.

#### MOBILE-IMG-006 — Multipart upload compatibility (Expo/RN upgrade regression)
- **Scenario:** Uploads use `expo-file-system`'s `File` class specifically as an Expo SDK 57/New-Architecture compatibility fix for a prior "Unsupported FormDataPart implementation" crash on Android.
- **Steps:** 1) After any Expo SDK or React Native upgrade, re-run every photo/document upload flow (post, stock, verification photo, registration docs) on Android specifically
- **Expected Result:** No regression of the previously-fixed crash.
- **Priority:** P1
- **Test Type:** Regression

---

### Keyboard Behavior

#### MOBILE-KB-001 — Keyboard does not cover the active input on long forms
- **Steps:** 1) On the NGO/Nursery registration wizard (multi-field steps) or Checkout's address form, tap the lowest-positioned input
- **Expected Result:** `KeyboardAvoidingView`/scroll behavior keeps the focused field visible above the keyboard.
- **Priority:** P1
- **Test Type:** Positive

#### MOBILE-KB-002 — Keyboard does not obscure the submit button
- **Steps:** 1) On Login/Register (which explicitly use `KeyboardAvoidingView`), focus the Password field
- **Expected Result:** Submit button remains reachable/visible or the view scrolls to reveal it.
- **Priority:** P1
- **Test Type:** Positive

#### MOBILE-KB-003 — Numeric-only fields reject non-numeric keyboard input
- **Steps:** 1) On quantity/price/pincode/phone fields, attempt to type letters
- **Expected Result:** Sanitization filters non-numeric characters as typed (confirmed pattern for pincode/phone; verify consistently for quantity/price fields too).
- **Priority:** P2
- **Test Type:** Validation

#### MOBILE-KB-004 — Long multi-line text fields (bio, description, caption) scroll correctly with keyboard open
- **Steps:** 1) Type a long multi-paragraph caption/description with the keyboard open
- **Expected Result:** Text field scrolls internally; screen doesn't jump or clip content.
- **Priority:** P2
- **Test Type:** Positive

---

### Scrolling / Long Forms

#### MOBILE-SCROLL-001 — Long list scroll performance (feed, notifications, leaderboard)
- **Preconditions:** 100+ items available.
- **Expected Result:** Smooth scroll with no dropped frames/jank on a mid-range Android device; cursor-paginated screens load more before visibly running out.
- **Priority:** P2
- **Test Type:** Boundary

#### MOBILE-SCROLL-002 — ProfilePostFeedScreen jump-to-index on a large grid
- **Steps:** 1) Open a specific post from deep within a large post grid (`ProfilePostFeed`)
- **Expected Result:** Scrolls directly to that post using the estimated/real height map; `onScrollToIndexFailed` fallback engages gracefully if the jump target hasn't measured yet.
- **Priority:** P2
- **Test Type:** Regression

#### MOBILE-SCROLL-003 — Long registration wizards remain usable on a small-screen device
- **Preconditions:** Small physical screen (e.g. a compact Android phone).
- **Expected Result:** All 9 NGO / 7 Nursery wizard steps remain fully scrollable and usable without clipped content.
- **Priority:** P2
- **Test Type:** Boundary

---

### Duplicate / Rapid Taps

#### MOBILE-TAP-001 — Rapid double-tap on every primary submit button across the app
- **Scenario:** Systematic regression sweep — apply to: Login/Register submit, Plant Tree submit, Drive RSVP/Sponsor, Campaign Donate, Adopt tree, Checkout Pay, NGO/Nursery create-drive/campaign/tree/stock submit, health-check mark, bulk-requirement send-offer/accept/confirm-receipt.
- **Steps:** For each listed action: fill validly, then rapidly double/triple-tap the submit control.
- **Expected Result:** Every one of these is expected to disable on first tap via a pending-mutation flag — confirm this holds for **all** of them, not just the ones with an obvious "isPending" state; treat any single-instance failure as a P1 regression finding, not a whole-app failure.
- **Priority:** P0
- **Test Type:** Regression

#### MOBILE-TAP-002 — Rapid tap on non-idempotent read actions (e.g. Accept/Decline on NGO follower requests)
- **Expected Result:** Per NGO-INDIV-003, the whole request list shares one global `busy` flag during any single mutation — verify a second tap on a different row is safely queued/blocked rather than causing a race.
- **Priority:** P2
- **Test Type:** Regression

#### MOBILE-TAP-003 — Rapid repeated taps on non-mutating navigation (e.g. tapping a drive card multiple times fast)
- **Expected Result:** No duplicate screen instances are pushed onto the stack.
- **Priority:** P3
- **Test Type:** Regression

---

### App Killed / Reopened Mid-Operation

#### MOBILE-KILL-001 — App killed mid-registration-wizard (before final submit)
- **Steps:** 1) Fill several steps of the NGO/Nursery wizard 2) Force-kill the app 3) Reopen
- **Expected Result:** Since wizard state is entirely client-side/in-memory (no server call until final submit), reopening should show a fresh, empty wizard — verify no half-submitted/corrupted account is created server-side, and no crash occurs on relaunch.
- **Priority:** P1
- **Test Type:** Negative

#### MOBILE-KILL-002 — App killed mid-checkout (after payment initiated, before confirmation)
- **Steps:** 1) Start a checkout payment 2) Force-kill the app right after the Stripe sheet is dismissed/confirmed but before the app processes the result 3) Reopen and check My Orders
- **Expected Result:** Verify the order lands in a consistent state (either successfully placed or cleanly not-placed) — no permanently-stuck `pending_payment` order with an actual charge behind it. This is a high-value payment-integrity case.
- **Priority:** P0
- **Test Type:** Negative
- **Notes:** Could not be verified from static code alone — flagged for careful on-device/staging testing with a real (test-mode) payment.

#### MOBILE-KILL-003 — App killed mid-planting-submission (after photo captured, during AI verification or final submit)
- **Steps:** 1) Reach the final submit of Plant Tree 2) Force-kill immediately after tapping Submit 3) Reopen and check Forest/Home tree count
- **Expected Result:** Either the tree was fully created server-side (and now appears) or it wasn't created at all — no orphaned/partial tree record with a missing photo or invalid state.
- **Priority:** P1
- **Test Type:** Negative

#### MOBILE-KILL-004 — App killed mid-bulk-requirement handoff-code entry
- **Steps:** 1) NGO begins entering a handoff code 2) Kill the app before confirming 3) Reopen
- **Expected Result:** No partial/duplicate confirmation; the requirement's status is unchanged from before the code entry began.
- **Priority:** P2
- **Test Type:** Negative

---

## UAT Prioritization

### P0 — Must pass before release (86 cases)

Failure in any of these makes the app unusable, unsafe, or capable of corrupting money/trust-critical data:

- **Authentication & session integrity** (IND-AUTH-001/007/013/014/015/016, NGO-AUTH-002, NUR-AUTH-002): if login, session persistence, token refresh, or the account-blocked mechanism breaks, no role can use the app at all.
- **Plant-photo anti-fraud controls** (IND-VERIFY-001/002/004/005): the mock-GPS check and the ARTH-zone eligibility check are the platform's core defense against fake/gamed tree-planting records — this is the product's entire trust model.
- **Payment/order integrity** (IND-CHECKOUT-001, IND-DON-001, MOBILE-KILL-002): a failure here means real (test-mode) money moves with no matching order, or an order exists with no payment — the single worst class of bug for a marketplace feature.
- **Approval-gate enforcement gaps** (NGO-PEND-003/006, NUR-PEND-003, NGO-BULK-012): the audit found several create/mutate actions that are **not** gated by NGO/Nursery approval status. Until product confirms these are intentional, they represent a live path for unverified organizations to publish content or transact — treated as P0 to force an explicit decision, not because a defect is assumed.
- **Marketplace/bulk-requirement handoff-code integrity** (NUR-CUST-005, NGO-BULK-007, NUR-BULK-007): these codes are the platform's only anti-fraud proof-of-handoff between two independent parties (buyer/nursery, nursery/NGO) — a bypass here breaks the trust chain for physical goods changing hands.
- **Core registration wizards** (NGO-REG-001/012, NUR-REG-001/010): these are the only on-ramp for two of the three roles this document covers.

### P1 — Must pass (172 cases)

Important for normal day-to-day operation but a failure is recoverable or narrowly scoped rather than catastrophic:

- Core dashboards, drive/campaign/adoption lifecycles, stock/inventory management, order fulfillment state machines, and their direct cross-role counterparts — the primary value loop of the app for each role.
- Registration wizard step-level validation (individual steps, not the whole wizard).
- Social/community core actions (follow, friend, report, block) that affect trust & safety.
- Permission-denial handling for camera/location, since a crash or dead-end here blocks entire flows.

### P2 — Should pass (169 cases)

Meaningfully improves the experience but does not block the app's core purpose:

- Analytics/reporting screens (Reports, Impact, Stock Analytics), secondary settings, pagination/scale behavior, most boundary/edge-value cases, and most flagged inconsistencies that are UX nits rather than functional breaks (missing confirm dialogs, inconsistent gate placement on lower-stakes actions).

### P3 — Nice to have (61 cases)

Cosmetic, rarely-used, or purely exploratory paths: theming/decoration, badge/leaderboard display details, empty-state copy, and boundary cases on fields with generous/unbounded limits.

---

## Test Data Requirements

Only data actually required by implemented functionality is listed.

### Individual accounts
- Fresh account (0 trees, 0 activity) — for empty-state testing across Home/Forest/My Records screens.
- Established account with: 1+ planted trees (self-planted, AI-verified), 1+ adopted tree, 1+ drive RSVP (past and upcoming), 1+ campaign donation, 1+ sapling reservation (pending and fulfilled), 1+ marketplace order (one at each fulfillment status, both pickup and delivery types), 1+ friend, 1+ follow (both open and approval-required targets), streak ≥1 day, streak freeze available (≥1) and depleted (0), XP ≥100 and <100.
- A second Individual account for friend-request/follow/block/report cross-account tests and adoption-race tests (IND-ADOPT-003).
- An account with a very large history (50+ orders/donations/notifications) to probe the several flagged no-pagination screens.

### NGO accounts
- **Pending** NGO (freshly registered, no admin action).
- **Approved** NGO with: 1+ drive (upcoming, full, completed, cancelled), 1+ campaign (open and closed), 1+ adoptable tree (available and adopted), 1+ posted bulk requirement (open, responded, accepted, completed, expired), planted-tree records across multiple zones with a mix of health-check statuses, 1+ staff roster entry, 1+ portfolio entry, 1+ follower (accepted) and 1+ pending follow request, follow policy set to both "open" and "approval" (test on two different NGO accounts or toggle mid-test), donations across all 4 statuses (succeeded/pending/failed/refunded).
- **Rejected** NGO (with a rejection reason set by the admin prerequisite).
- **Suspended** NGO (with a reason).
- An NGO account specifically for probing the ungated create-screen gap (NGO-PEND-003) while pending.

### Nursery accounts
- **Pending** nursery (freshly registered).
- **Approved** nursery with: stock items across all 3 availability states (available/low_stock/out_of_stock) including at least one at exactly quantity 0, 1+ pending reservation, 1+ order at each of the 9 statuses (both pickup and delivery fulfillment types), 1+ active and 1+ deactivated delivery partner, 1+ customer review (with and without a nursery response), 1+ bulk-requirement offer at each stage (proposed/accepted/handed_off/fulfilled/declined/withdrawn), pickup and delivery both configured (and, separately, a mis-configuration with both disabled to test NUR-CONFIG-001).
- **Rejected** nursery (to test the working resubmit flow, NUR-APPR-003).
- **Suspended** nursery (to confirm the mailto-only, no-resubmit path, NUR-APPR-004).
- A nursery with zero inventory (empty-state testing).

### Shared/system data
- Species catalog with several existing entries (for fuzzy-search testing) plus room to add a new custom species.
- At least 2 approved nurseries near each other (for directory/map "Nearby" sort and IND-PLANT-007 recommendation testing).
- At least one ARTH-approved planting zone and one location clearly outside any zone, for IND-VERIFY-005.
- A device (or emulator) with mock-location/fake-GPS enabled, for IND-VERIFY-004.
- Stripe test-mode keys configured in at least one build variant, to exercise the real payment-sheet path (IND-DRIVE-006, IND-DON-001, IND-CHECKOUT-001) rather than only the dev-mode skip-to-success fallback.
- **[ADMIN PREREQUISITE DATA]** — not mobile test data, but required to drive state transitions: Admin access to approve/reject/suspend at least one NGO and one Nursery on demand during test execution, plus the separate account-level block mechanism.

---

## Traceability & Coverage Summary

Every test case above is tagged inline with its screen(s), the role it applies to, its API dependency (where identifiable), and — for state-dependent cases — its prerequisite. The table below summarizes coverage at a glance. Screen counts are approximate: several screens (Map, Directory, public-profile views, PostComposer) are implemented once and reused across multiple roles, so they are counted once per role context in which they were audited and tested, not duplicated.

| Role | Screens (approx.) | Feature Subsections | UAT Cases |
| --- | --- | --- | --- |
| Individual | ~50 | 16 (A1–A16) | 195 |
| NGO | ~28 | 18 (B1–B18) | 121 |
| Nursery | ~20 | 14 (C1–C14) | 102 |
| Cross-Role | — (integration, no dedicated screens) | 5 integration areas | 29 |
| Mobile-Specific | — (device/condition based, no dedicated screens) | 8 device/condition categories | 42 |
| **Total** | **~98 unique + shared** | **61 subsections** | **489** |

---

## Potentially Untested Areas

Implemented in the code but with no obvious, dedicated UAT case above — either because the exact on-screen behavior couldn't be confirmed from static analysis alone, or because it's a minor/incidental feature. Flagged here explicitly per the audit instructions rather than silently omitted:

1. **Group, Corporate, and Delivery Partner roles** exist as fully-built mobile experiences (own registration, dashboard, and navigation stack each) but are explicitly out of scope for this phase per product decision. Recommend a dedicated follow-up UAT pass covering these three roles.
2. **Exact Map-pin tap behavior** for a planted tree (IND-TREE-001) — confirmed the pin exists and is tappable, but the precise fields shown were not independently verified at the code level.
3. **NGO Reports' fixed 6-month window** (NGO-STAT-002) — no custom date-range picker exists; worth a product conversation on whether this is a gap or intentional.
4. **Whether the individual can see a nursery's response to their review** anywhere in their own UI (CROSS-IN-005) — not confirmed either way.
5. **Zone rename/delete** (NGO-LOG-006) — APIs exist, no UI exists; not tested beyond confirming absence.
6. **NGO resubmit-after-rejection** (NGO-REJ-001) — API/hook exists, no UI exists; the Nursery equivalent works. Recommend a product decision on whether NGO should get the same UI.
7. **Bulk-edit or CSV import for nursery stock** (NUR-STOCK-012) — doesn't exist; only relevant if this was an expected feature.
8. **Staff-entry login/permission capability** (NGO-STAFF-004) — confirmed not to exist; written to prevent testers from assuming it does based on the screen's name.
9. **API request timeout behavior** (MOBILE-NET-006) — no explicit client-side timeout configuration found; real-world behavior on a hung connection wasn't verified.
10. **App-killed-mid-payment recovery** (MOBILE-KILL-002) — the single highest-value case that could not be verified via static code analysis; requires careful staging-environment testing with real (test-mode) payment interruption.
11. **Delivery Partner's own live GPS reporting reliability** — out of scope as a role, but its correctness underpins the individual's live-tracking map (IND-ORDER-002) and should be covered when Delivery Partner UAT is eventually scoped.

---

## Potential Issue / Requires Verification

Consolidated from every flag raised during the audit and while writing test cases. These are recorded as **findings that need a product/engineering decision**, not confirmed bugs — per the audit's explicit instruction not to assume intended behavior where it isn't clear from the code alone.

1. **NGO approval gate has real gaps**: `NgoCreateDriveScreen`, `NgoCreateCampaignScreen`, `NgoCreateAdoptableTreeScreen`, and the entire `NgoBulkRequirementsScreen` flow have no `useApprovalGate` check of their own — only the *button that navigates to them* is gated in the screens the audit found. Any other path to these routes bypasses the gate entirely. *(NGO-PEND-003, NGO-PEND-006, NGO-BULK-012)*
2. **Nursery stock-edit gate gap**: adding and deleting a stock item is approval-gated; editing an existing item's quantity/price/photo via `StockDetailSheet` is not. *(NUR-PEND-003)*
3. **NGO has no working "resubmit after rejection" UI**, even though the API exists and the Nursery role has a fully working equivalent. *(NGO-REJ-001)*
4. **No forgot/reset-password flow exists anywhere in the app**, for any role. *(IND-AUTH-011)*
5. **No OTP/email verification at signup**, for any role — registration logs the user in immediately.
6. **`StreakProtectionScreen` has no discoverable in-app entry point** in the current build (no call site found from Home, Notifications, or push-tap routing). *(IND-STREAK-003)*
7. **`streak_at_risk`/`streak_broken` notifications don't deep-link anywhere** — tapping them only marks them read. *(IND-STREAK-004)*
8. **Delete Account (Individual and, by the same shared mechanism, NGO/Nursery) requires no re-authentication** — only a client-side confirm dialog, for an irreversible action. *(IND-SET-004)*
9. **No client-side handle-availability check on Edit Profile**, unlike registration's live email check — a handle collision only surfaces as a post-submit server error. *(IND-PROFILE-004)*
10. **Checkout/AddressBook's "Use current location" has no timeout guard**, unlike every other GPS read in the app — could hang indefinitely on a weak-signal device. *(IND-CHECKOUT-004)*
11. **Checkout/AddressBook silently blocks saving a manually-typed address** unless an autocomplete suggestion or GPS was used, even if the typed address is complete and valid — worth a product-level confirmation that this friction is intentional. *(IND-CHECKOUT-003)*
12. **Inconsistent confirm-dialog usage** across similarly "destructive-ish" actions app-wide: Unfollow, Wishlist remove, Cancel Order (even though paid), Delete Address, Cancel Drive RSVP have no confirmation; Release Adoption, Revoke Session, Remove Friend, Delete Account, Remove Nursery/NGO Follower do. Recommend a single house rule.
13. **Community "Quests/Challenges" joined-state is local React state only** (`joinedIds`), not derived from server data — suspected to desync on remount/refresh. *(IND-SOCIAL-016)*
14. **`MyBulkResponsesScreen` is Nursery-only** despite its generic "My…" naming pattern suggesting it might be Individual-facing — confirmed via an explicit in-code comment. *(IND-REC-005, NUR-SET-003)*
15. **Negative stock price has no observed client-side validation** on the Nursery stock form. *(NUR-STOCK-007)*
16. **No time-format validation** on nursery pickup-window/operating-hours free-text fields. *(NUR-CONFIG-004)*
17. **Forest theme picker gives no locked-theme explanation**, while the Profile → Achievements theme picker does, for the same underlying data. *(IND-TREE-005)*
18. **No global offline indicator** anywhere in the app — all network-failure handling is per-screen inline text with a single automatic retry. *(MOBILE-NET-001)*
19. **NGO Follower Requests accept/decline shares one global "busy" flag** across the whole list rather than per-row, which may feel broken under concurrent interaction. *(NGO-INDIV-003)*
20. **Several list screens call paginated APIs but never actually paginate** in the UI (NGO Donations, NGO Followers, Individual My Donations/My Reports/My Reviews/My Adoptions) — verify behavior at scale rather than assuming it's fine.
21. **NGO's four "streak" cards on Growth & Trust mix units** (three are weekly-activity-based, one is consecutive-order-based) — a likely source of user confusion even if each is functioning as individually designed. *(NUR-GROWTH-003 — same pattern also present on the NGO side)*
22. **Directory visibility rules for pending/rejected NGOs/Nurseries were not independently confirmed** at the mobile-code level — unclear whether an unapproved org is hidden from individual-facing directories or simply operates its dashboard while also being publicly listed. *(NGO-APPR-004)*
