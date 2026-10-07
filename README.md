# Lifepath v0.8

Track everything you're working on, in folders, with progress that feels good to log.

Works fully offline. Sign in with Google to back up and sync across your phone and the web.

## New in v0.5 to v0.8

- **v0.4b Photo proof:** take or choose a photo as proof. It is stored on your phone, uploaded to a private cloud bucket when you are signed in, and shown in the log's history on any device. Needs a rebuild (new native package) and `0002_proof_photos.sql`.
- **v0.5 Echo Lite:** a companion you name yourself (You tab → Echo). Six attributes (Wisdom, Strength, Voice, Craft, Fortune, Spirit) grow from your logs; proven logs count in full, one-tap logs 40%. Six stages (Spark → Legend), a mood that follows your day (it only ever rests, never punishes), skin and hair choices, and a placeholder avatar drawn from shapes. The final art replaces `src/components/EchoAvatar.tsx` later.
- **v0.6 Sparks shop:** Echo's wardrobe (Echo → Wardrobe): tops, hats, extras and scenes priced in Sparks, with try-on before buying and a few that unlock at higher stages. Your balance is your earned Sparks minus the price of what you own, so buying on two devices never double-spends.
- **v0.7 Rankings:** global, country and city boards, this week or all time (weeks start Monday 00:00 UTC). Scores are computed on the server from synced logs **with proof**. Off by default; you choose a public display name, country and city. Needs `0003_rankings.sql`.
- **v0.8 Plus and AI planner:** free accounts have 3 folders; Plus is unlimited. The AI planner (task → Plan with AI) turns a goal, deadline and your real pace into calendar sessions. If the AI server is not set up it falls back to an on-device smart planner. Plus status comes from a server table; development builds have a local test switch on the Plus screen. Payments are not built yet. Needs `0004_plus.sql`, and `supabase/functions/plan` for the AI part.

### Setup for v0.4b to v0.8 (one time)

1. **SQL:** in Supabase SQL Editor run, in order, `supabase/migrations/0002_proof_photos.sql`, `0003_rankings.sql`, `0004_plus.sql`.
2. **App:** `git pull`, `npm install` (adds `expo-image-picker`; if npm complains about the version run `npx expo install expo-image-picker`), then rebuild once: `npx eas-cli@latest build --profile development --platform android`.
3. **Give yourself Plus for the AI path** (optional): Authentication → Users → copy your user id, then run the `insert into public.entitlements ...` example at the bottom of `0004_plus.sql`.
4. **AI planner server** (optional): deploy `supabase/functions/plan/index.ts` (Dashboard → Edge Functions → Deploy a new function, or `supabase functions deploy plan`) and add the secret `ANTHROPIC_API_KEY`. Without it the app uses the on-device smart planner.

Known limits: deleting a task or folder leaves its proof photos in storage (deleting a single log removes its photo); friends boards, league promotion tiers and real payments are not built yet.

## New in v0.4: proof for your logs

- **Add proof** when you log: a short summary in your own words (15+ characters) and/or a link. It earns **+25% bonus XP** and releases your **Sparks** right away.
- **One-tap logs still work.** The XP counts at once (levels, streaks), but the Sparks stay **pending for 7 days**. Open the task's History and tap **Add proof** to release them.
- Logs show their state: *Proof added*, *Add proof · N days left*, or *Sparks expired*. Added proof (summary and link) is shown under the log.
- The **You** tab shows how many Sparks are waiting for proof.
- Logs from before v0.4 keep the Sparks they already earned.
- Each log records its trust level, so the later rankings can count only proven XP.
- No new native packages: after `git pull`, the running dev app just reloads. No rebuild needed.
- Photos, AI checks and auto-verified logs (timers, Health, ISBN) come in later versions.

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
  ai-plan.tsx           AI / smart planner (Plus)
  echo.tsx, wardrobe.tsx  Echo companion and Sparks shop
  rankings.tsx          Global, country, city and weekly boards
  plus.tsx              Lifepath Plus
src/
  store.ts              all app state and actions, saved on device
  notifications.ts      schedules local reminders from app data
  sync.ts               Google sign-in and cloud sync engine
  photos.ts             proof photos: pick, upload, show
  aiPlan.ts, plusState.ts  AI planner client, Plus status
  rankingsApi.ts        leaderboard and public profile calls
  lib/echo.ts, wardrobe.ts, evidence.ts, planner.ts, plus.ts, rankings.ts  pure rules (tested)
  lib/syncPlan.ts       pure merge rules for sync (tested)
supabase/migrations/    database schema to run in Supabase (0001 to 0004)
supabase/functions/plan AI planner Edge Function
  theme.ts              colors, type scale, light/dark
  lib/                  pure logic: types, progress, XP & streaks, templates, dates
  components/           buttons, progress bars & rings, log sheet, celebrations
```

## Roadmap: step by step to the full version

| Version | Adds |
|---|---|
| 0.1 | Folders, tasks, logging, XP, streaks, achievements, local storage |
| 0.2 | Reminders, evening streak nudge, calendar view, planned sessions |
| 0.3 | Google sign-in and cloud sync (Supabase) |
| 0.4 | Proof for logs (summary and link), bonus XP, Sparks held until proven, trust tiers |
| 0.4b | Photo proof with private cloud storage |
| 0.5 | **Echo Lite:** companion with six attributes, stages, naming, placeholder avatar |
| 0.6 | Sparks shop and wardrobe (placeholder items) |
| 0.7 | Rankings: global, country, city, weekly (proven XP only) |
| **0.8** (this) | Plus tier (free folder limit), AI planner with on-device fallback |
| later | Payments (App Store / Play), friends boards, AI proof check, auto-verified logs, Apple sign-in |
| 1.0 | Full Echo with commissioned anime art and Rive animation, life stages, room |

Echo's looks are placeholders on purpose: every attribute, stage, item and Spark you earn now carries over when the commissioned art arrives.
