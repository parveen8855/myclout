# WeClout

> Your Region. Your Clout.

## What is WeClout?

WeClout is a pay-to-rank competition and community donation platform built for India — and scaling globally. Users donate to represent their state and district on a live leaderboard. The more you donate, the higher you rank. Every rupee goes toward real social impact through the WeClout Foundation.

## Features

- 🏆 Live Leaderboard — District, State, and National rankings updated in real time
- 🔥 Streak System — Donate every week to build your streak. Miss a week, lose it.
- ⚔️ Rival Mode — Tag anyone as your rival and get notified when they move ahead
- 👑 Crown War — The #1 donor holds the crown. It transfers live when someone overtakes.
- 🎭 Anonymous Mode — Compete without revealing your identity
- 🎭 Anonymous Reveal — Community can pool money to reveal an anonymous top donor
- ⚡ Boost — Pay to highlight your name on the leaderboard for 24 hours
- 🧊 Streak Freeze — Buy freezes to protect your streak if you miss a week
- ✨ Profile Upgrades — Animated borders, bold name, custom badge colors
- 🎪 Make it Happen — Pay to request real-world events (flash mobs, proposals, surprises). Our team handles it.
- 🏛️ Hall of Fame — Permanent legends section with cinematic entrance animation
- 🌍 War Room — Monthly state vs state donation campaigns for real causes
- 💜 Clout For Good — 100% transparent impact tracking with before/after proof
- 🎴 Clout Card — Shareable player card with your stats, auto-generated
- 📈 Clout Score — Your overall WeClout reputation score (0-1000)
- 🗺️ Regional Takeover — Hold #1 in your district for 3 weeks to permanently mark it

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions)
- **Payments**: Razorpay
- **State Management**: Zustand
- **Hosting**: Vercel
- **Notifications**: react-hot-toast, Firebase Cloud Messaging

## Project Structure

app/                    # Next.js App Router pages
  page.tsx              # Emotional landing/home page
  dashboard/            # User dashboard
  leaderboard/          # Live leaderboard
  profile/              # User profile with badges, timeline, upgrades
  requests/             # Make it Happen — request marketplace
  war-room/             # Monthly state campaigns
  hall-of-fame/         # Legends section with cinematic animation
  impact/               # Clout For Good — impact tracking
  made-my-day/          # Fulfilled moments feed
  admin/                # Admin panel (restricted)
  login/                # Google Auth login
  onboarding/           # New user setup
components/             # Reusable UI components
lib/                    # Firebase, Razorpay, utility functions
store/                  # Zustand state management
types/                  # TypeScript interfaces
public/                 # Static assets

## Environment Variables

Create a .env.local file in the root with these variables:

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_ADMIN_EMAIL=

## Getting Started

Install dependencies:
npm install

Run development server:
npm run dev

Build for production:
npm run build

Open http://localhost:3000 to view the app.

## Roadmap

- [ ] PWA support — installable on mobile
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Weekly auto-reset Cloud Function
- [ ] WeClout Foundation NGO integration
- [ ] CSR partnerships with MNCs
- [ ] Play Store launch via Capacitor
- [ ] Anonymous Reveal feature
- [ ] Refer and Rise referral system
- [ ] State War live events
- [ ] Clout Auction

## Contributing

This is a private project currently in beta. Contact the maintainer for access.

## License

Private — All rights reserved. WeClout 2026
