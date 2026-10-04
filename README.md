# Lifepath v0.1

Track everything you're working on, in folders, with progress that feels good to log.

This first version runs fully on your device: no account, no server, no companion character yet.

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

**If `npm install` fails with a peer-dependency error**, run `npm install --legacy-peer-deps` and continue from `npm run setup`.

**If Expo Go says the project's SDK is not supported**, update Expo Go from the app store, then run `npx expo install --fix` again.

## Test the core logic

```bash
npm run test:logic
```

Checks XP, levels, streaks and freezes, progress math, and the pace forecast.

## Project structure

```
app/                    screens (file-based routing with expo-router)
  (tabs)/index.tsx      Today
  (tabs)/map.tsx        Life Map
  (tabs)/me.tsx         You: stats, achievements, settings
  folder/[id].tsx       Folder detail
  task/[id].tsx         Task detail: progress, forecast, milestones, resources, history
  new-folder.tsx        Create folder (template → customize)
  new-task.tsx          Create task
src/
  store.ts              all app state and actions, saved on device
  theme.ts              colors, type scale, light/dark
  lib/                  pure logic: types, progress, XP & streaks, templates, dates
  components/           buttons, progress bars & rings, log sheet, celebrations
```

## Roadmap: step by step to the full version

| Version | Adds |
|---|---|
| **0.1** (this) | Folders, tasks, logging, XP, streaks, achievements, local storage |
| 0.2 | Reminders (local notifications), calendar view, scheduled sessions |
| 0.3 | Accounts and cloud sync (Supabase), web version polish |
| 0.4 | Evidence logs: in-app photo and summary, pending XP, trust tiers |
| 0.5 | **Echo Lite:** simple companion with six attributes that react to your folders |
| 0.6 | Sparks shop and wardrobe (placeholder items) |
| 0.7 | Rankings: friends, local, global, weekly leagues (verified XP only) |
| 0.8 | Plus tier: unlimited folders, AI planner |
| 1.0 | Full Echo with commissioned anime art and Rive animation, life stages, room |

The Echo screen already has a placeholder on the **You** tab, and XP and Sparks are counted from day one, so nothing you log now is lost when the companion arrives.
# lifepath
