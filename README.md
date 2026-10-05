# Lifepath v0.3

Track everything you're working on, in folders, with progress that feels good to log.

Works fully offline. Sign in with Google to back up and sync across your phone and the web.

## New in v0.3

- **Sign in with Google** (You tab) to back up everything and sync between devices and the web
- **Offline first:** the app works without internet and syncs when it's back (after changes, when you open the app, and every minute)
- **Your data comes with you:** what's already on the phone is uploaded on first sign-in; a new device downloads it all
- **Sync status** on the You tab: synced, syncing, offline, or a problem
- Conflicts are handled per item; XP, Sparks, best streak and achievements never go backwards

### One-time cloud setup (Supabase + Google)

1. **Database:** Supabase → SQL Editor → New query → paste [`supabase/migrations/0001_records.sql`](supabase/migrations/0001_records.sql) → Run.
2. **Google OAuth client:** in [Google Cloud Console](https://console.cloud.google.com) create a project, set up the OAuth consent screen (External), then Credentials → Create OAuth client ID → **Web application** with authorized redirect URI `https://lpfqevtdhedhanmncbov.supabase.co/auth/v1/callback`.
3. **Supabase Google provider:** Authentication → Sign In / Providers → Google → enable, paste the Client ID and Client Secret.
4. **Redirect URLs:** Authentication → URL Configuration → add `lifepath://**` and `http://localhost:8081/**`.
5. **Rebuild the development app once** (Google sign-in adds a native package): `npx eas-cli@latest build --profile development --platform android`.

## New in v0.2

- **Plan tab:** month calendar with colored dots for days you logged and rings for planned sessions; tap a day to see its logs and plans
- **Planned sessions:** plan what you'll work on, on which day, at what time, with a note; logging that task on the day checks the plan off automatically
- **Task reminders:** pick a time and days (e.g. weekdays at 9:30 PM) on any task
- **Evening streak nudge:** an optional reminder only on days you haven't logged anything
- **Tap a notification** to jump straight to that task
- **Planned today** section on the Today screen
- Example data now includes a reading reminder and two planned gym sessions

## What's in v0.1

- **Life Map:** your folders as colorful tiles, each with its own progress ring
- **9 folder templates:** Reading, Gym, Languages, Study, Running, Creative, Money, Wellness, Custom
- **4 ways to measure progress:** amount (pages, km), time (minutes), sessions (workouts), milestones (checklist)
- **Tasks** with targets, optional deadlines, milestones, and a resources shelf (apps, books, links)
- **Quick logging** in a bottom sheet: stepper, quick-pick chips, notes
- **Today screen:** daily XP goal ring, streak, level, a daily quest, and what's left today
- **Pace forecast:** "at this pace you finish on Nov 14" and "need 12 pages/day" against a deadline
- **XP, levels, Sparks, streaks with freezes, 10 achievements**
- **Celebrations:** XP toasts, confetti on completion, level-ups, haptics
- **Light and dark mode**, and a web layout that centers on wide screens
- Data saved on the device; survives app restarts

## Run it on your phone

You need [Node.js](https://nodejs.org) (LTS) on your computer and the **Expo Go** app on your phone (App Store or Google Play).

```bash
cd lifepath
npm install
npm run setup
npx expo install --fix
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android). Your phone and computer must be on the same Wi-Fi.

- Press `w` in the terminal to open the web version in your browser.
- On first launch, tap **Load example data** to see Reading, Gym, and Languages filled in.

**Already ran v0.1?** Pull the update, then run `npm install` and `npx expo start --clear`. Your existing data is kept and upgraded automatically.

**Reminders in Expo Go:** on iPhone, reminders work in Expo Go (use **You → Send a test notification**). On Android, Expo Go doesn't support notifications at all, so the app skips them there and tells you; your reminders and plans are still saved. To get real reminders on Android you need a development build of the app.

**If `npm install` fails with a peer-dependency error**, run `npm install --legacy-peer-deps` and continue from `npm run setup`.

**If Expo Go says the project's SDK is not supported**, update Expo Go from the app store, then run `npx expo install --fix` again.

## Development build (real reminders on Android)

Expo Go can't show notifications on Android. A development build is your own installable Lifepath app that works like Expo Go but supports everything. You only rebuild it when a native package is added; normal code changes still load instantly.

One-time setup (free Expo account at https://expo.dev):

```bash
npm install -g eas-cli
npx expo install expo-dev-client
eas login
eas init
eas build --profile development --platform android
```

When the build finishes (about 10–20 minutes on the free plan), open the link it prints on your phone, download the APK and install it (allow "install unknown apps" if Android asks). Then:

```bash
npx expo start --dev-client
```

Open the **Lifepath** app on your phone and scan the QR code. Commit the changes `eas init` and `expo install` make to `app.json` and `package.json`.

## Test the core logic

```bash
npm run test:logic
```

Checks XP, levels, streaks and freezes, progress math, the pace forecast, the calendar grid, which reminders get scheduled, and how sync merges changes between devices.

## Project structure

```
app/                    screens (file-based routing with expo-router)
  (tabs)/index.tsx      Today
  (tabs)/plan.tsx       Plan: calendar, planned sessions, reminders
  (tabs)/map.tsx        Life Map
  (tabs)/me.tsx         You: stats, achievements, settings
  folder/[id].tsx       Folder detail
  task/[id].tsx         Task detail: progress, forecast, milestones, resources, history
  new-folder.tsx        Create folder (template → customize)
  new-task.tsx          Create task
  plan-session.tsx      Plan a session
src/
  store.ts              all app state and actions, saved on device
  notifications.ts      schedules local reminders from app data
  sync.ts               Google sign-in and cloud sync engine
  lib/syncPlan.ts       pure merge rules for sync (tested)
supabase/migrations/    database schema to run in Supabase
  theme.ts              colors, type scale, light/dark
  lib/                  pure logic: types, progress, XP & streaks, templates, dates
  components/           buttons, progress bars & rings, log sheet, celebrations
```

## Roadmap: step by step to the full version

| Version | Adds |
|---|---|
| 0.1 | Folders, tasks, logging, XP, streaks, achievements, local storage |
| 0.2 | Reminders, evening streak nudge, calendar view, planned sessions |
| **0.3** (this) | Google sign-in and cloud sync (Supabase) |
| 0.4 | Evidence logs: in-app photo and summary, pending XP, trust tiers |
| 0.5 | **Echo Lite:** simple companion with six attributes that react to your folders |
| 0.6 | Sparks shop and wardrobe (placeholder items) |
| 0.7 | Rankings: friends, local, global, weekly leagues (verified XP only) |
| 0.8 | Plus tier: unlimited folders, AI planner |
| 1.0 | Full Echo with commissioned anime art and Rive animation, life stages, room |

The Echo screen already has a placeholder on the **You** tab, and XP and Sparks are counted from day one, so nothing you log now is lost when the companion arrives.
