# 🌱 PLANT — Eco-Gamified Tree Planting App

A premium, visually immersive habit-building mobile app for tracking real-world tree planting with Duolingo-level polish and a cozy game aesthetic.

---

## ✨ Feature Overview

### Screens
| Screen | Description |
|--------|-------------|
| **Splash** | Cinematic intro with seed→tree animation, particle effects, mascot reveal |
| **Onboarding** | 4 swipeable pages with parallax, animated dot indicators |
| **Home** | Emotional core — streak, animated forest preview, daily missions, XP |
| **Plant Tree** | Camera/upload, AI scan animation, species picker, success state |
| **Map** | Custom Skia-drawn illustrated map, glowing location pins |
| **Forest** | 3D-like parallax forest with day/night, birds, floating leaves |
| **Community** | Friends, challenges, global leaderboard |
| **Profile** | Stats, streak calendar, achievement grid, impact numbers |
| **Streak Protection** | Emotional gamified recovery flow with mascot |
| **Settings** | Theme, haptics, notifications, account placeholders |

### Components
- **Mascot** — Cozy farmer SVG character (dungarees, straw hat, holding sapling) with facial expressions
- **GlassCard / BlurCard** — Glassmorphism cards
- **AnimatedButton** — Spring-pressed gradient buttons
- **ProgressRing** — Animated SVG rings
- **EcoWidget / StreakWidget** — Reusable stat widgets
- **FloatingParticles** — Leaf/petal/dust/firefly particle system
- **BottomNav** — Floating glassmorphism tab bar with raised Plant button

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the dev server
```bash
npx expo start
```

### 3. Run on device
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Physical device**: Scan QR code with Expo Go

---

## 🏗 Architecture

```
src/
├── constants/
│   ├── colors.ts        # Full color palette + gradients
│   ├── typography.ts    # Type scale system
│   └── theme.ts         # Spacing, radius, shadows, animation configs
├── data/
│   └── dummyData.ts     # All dummy data (trees, friends, missions, etc.)
├── hooks/
│   ├── useAnimations.ts  # fade, slide, breathe, float, pulse, rotate hooks
│   ├── useParticles.ts   # particle generation + animation hooks
│   └── useHaptics.ts     # haptic feedback wrapper
├── components/
│   ├── common/
│   │   ├── AnimatedButton.tsx
│   │   ├── GlassCard.tsx
│   │   ├── Mascot.tsx         # SVG farmer mascot + speech bubble
│   │   ├── FloatingParticles.tsx
│   │   ├── EcoWidget.tsx
│   │   └── ProgressRing.tsx
│   └── navigation/
│       └── BottomNav.tsx
├── navigation/
│   └── AppNavigator.tsx
└── screens/
    ├── SplashScreen.tsx
    ├── OnboardingScreen.tsx
    ├── HomeScreen.tsx
    ├── PlantTreeScreen.tsx
    ├── MapScreen.tsx
    ├── ForestScreen.tsx
    ├── CommunityScreen.tsx
    ├── ProfileScreen.tsx
    ├── StreakProtectionScreen.tsx
    └── SettingsScreen.tsx
```

---

## 🎨 Design System

### Color Palette
- **Sage**: `#87A878` — primary green
- **Forest**: `#2D5A27` — deep nature
- **Beige**: `#F5EDD6` — warm background
- **Golden**: `#D4A853` — achievements/XP
- **Earth**: `#8B6B47` — warm brown

### Key Animation Patterns
- `useFloat()` — gentle up/down floating
- `useBreathing()` — subtle scale in/out
- `useSlideUp()` — entrance from below
- `useFadeIn()` — opacity entrance
- `useSpringPress()` — tactile button press
- `useParticleAnimation()` — leaves/petals floating upward

---

## 🔧 Tech Stack

| Technology | Purpose |
|-----------|---------|
| React Native Expo ~51 | Framework |
| TypeScript | Type safety |
| React Navigation (Stack + Bottom Tabs) | Navigation |
| React Native Reanimated 3 | Smooth animations |
| React Native Skia | Canvas (forest, map) |
| React Native SVG | Mascot character |
| Expo Linear Gradient | Beautiful gradients |
| Expo Blur | Glassmorphism |
| Expo Haptics | Tactile feedback |
| NativeWind v4 | Tailwind utility classes |

---

## 🌿 Mascot — "Pip"

The cozy farmer mascot appears throughout the app:
- Wearing dungarees, straw hat, holding a sapling
- Facial expression variants: `happy`, `excited`, `calm`, `encouraging`, `proud`
- Animated float + breathing effect
- Speech bubble component via `MascotBubble`

---

## 📱 Future Backend Integration Points

All screens use `dummyData.ts`. When connecting a real backend:
1. Replace `USER_DATA` with auth context
2. Replace `PLANTED_TREES` with API calls
3. Replace `FRIENDS`, `LEADERBOARD` with social endpoints
4. `PlantTreeScreen` → upload to storage + AI verification API
5. `MapScreen` → replace custom canvas with real coordinates from DB
