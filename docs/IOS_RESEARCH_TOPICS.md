# Arth — iOS Research Topics

_Date: 2026-10-12. Companion to `IOS_READINESS.md`. ⭐ = could block launch or cost money if assumed wrongly; research these first._

## 1. Apple account and legal
- ⭐ Individual vs. Organization account (D-U-N-S number, legal entity, approval time, seller name shown on the App Store).
- Fees, fee waivers (nonprofit), India-specific rules.
- Account ownership, team members and roles.
- Tax and banking forms in App Store Connect.

## 2. Building with EAS from Windows
- ⭐ EAS pricing: free-tier build limits, iOS queue times, paid plan cost.
- Credential management and backup (`eas credentials`).
- Registering test iPhones; TestFlight vs. ad-hoc distribution.
- EAS Update (OTA): what it can ship and what Apple allows.
- Fallback: `expo prebuild` plus a cloud Mac rental.

## 3. Library compatibility on iOS
- ⭐ MapLibre RN v11 with Expo SDK 57 / RN 0.86: known issues and config.
- Skia 2.6, Reanimated 4.5 + Worklets, Lottie: bugs and new-architecture needs.
- Stripe RN 0.64: minimum iOS version, Apple Pay, `returnURL` flow.
- `react-native-share` Instagram Stories (Facebook App ID).
- WebView behaviour for the Leaflet tracking map.
- Minimum iOS version supported by Expo SDK 57.
- Whether `react-native-web`, `react-dom`, `next` can be removed from the mobile app.

## 4. Push notifications
- ⭐ APNs via Expo push service: reliability, rate limits, receipts handling.
- Creating and rotating the APNs key through EAS.
- iOS behaviours: permission timing, badges, sounds, categories.
- How to test pushes (not possible in Simulator or Expo Go).

## 5. App Store Review Guidelines
- ⭐ 3.2.1(vi) donations: eligible nonprofits; can donations be tied to XP/badges/streaks?
- ⭐ 3.1.1 In-App Purchase: do any features (games, decorations, XP unlocks) count as digital goods?
- 5.1.1(v) account deletion, including legally retained data.
- 1.2 user-generated content: moderation and response-time expectations.
- 5.1.1 data collection and location-prompt wording.
- 4.0 / 4.2 design and minimum-functionality rejections.
- Rejection stories from similar apps (social, e-commerce, location, nonprofit).

## 6. Privacy and compliance
- App Privacy "nutrition label" contents.
- Privacy manifest (`PrivacyInfo.xcprivacy`) and required-reason APIs; do our libraries ship their own?
- App Tracking Transparency: confirm not needed.
- India DPDP Act (and GDPR if EU users); retention and deletion.
- Public hosting of privacy policy and terms.

## 7. Payments
- Stripe in India: card support, UPI limits in PaymentSheet.
- Apple Pay in India: availability, Stripe setup, worth adding?
- Indian charity rules for donations (80G, FCRA).

## 8. UI and product on iPhone
- Human Interface Guidelines: back-swipe, tab bars, sheets.
- Dynamic Island, safe areas, screen sizes.
- Dynamic Type vs. custom fonts.
- Forced light mode (`userInterfaceStyle: "light"`): acceptable?
- VoiceOver accessibility.
- Audio in silent mode, haptics, HEIC photo uploads.
- iPhone-only app running on iPad (`supportsTablet: false`).

## 9. Backend and infrastructure
- ⭐ Production HTTPS hosting, uptime, and App Review access to the API.
- App Transport Security and certificate rules.
- API versioning and forced-update mechanism.
- Cleaning up invalid push tokens reported by Apple.

## 10. Release process
- ⭐ TestFlight: internal vs. external testing, beta review, 90-day build expiry.
- App Store Connect listing: screenshot sizes, metadata, age rating, category.
- Phased release, review times, expedited review.
- Build/version numbering across iOS and Android.
- Review notes and demo accounts for every role.
- App Store Optimization (keywords, naming, screenshots).

## 11. Post-launch
- iOS crash reporting (Sentry or similar) and symbolication without Xcode.
- Analytics options and their privacy-label impact.
- Handling ratings and reviews.
- Ongoing costs: Apple annual fee, EAS plan, any Mac rental.
- Yearly minimum-Xcode/SDK changes forcing rebuilds.

## Suggested order
1. Apple account type (longest lead time).
2. Donation and In-App Purchase rules.
3. MapLibre and Skia compatibility (trial EAS build).
4. EAS pricing and limits.
5. Production backend hosting.
6. Everything else.

## Sources
Apple App Store Review Guidelines, Human Interface Guidelines, App Store Connect Help; Expo EAS Build/Submit/Update docs and SDK 57 changelog; GitHub issues for MapLibre, Skia, Reanimated, Stripe RN; Stripe docs (Apple Pay, India).
