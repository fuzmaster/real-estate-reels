# V9 Test Guide - Vibe Presets + Debug

## What changed

V9 adds a new **Choose Reel Vibe** section and a new **Debug** tab.

The vibe selector is meant to simplify the menu. Instead of forcing an agent to separately understand video style, pacing, music mood, transition style, auto-enhance, and progress bar settings, the app can choose sensible defaults from one preset.

## Vibes to test

### Warm & Inviting
Best first test for normal homes.

Expected settings:
- balanced pacing
- warm music mood
- smart mix transition
- auto-enhance on
- progress bar on

### Clean Professional
Best for conservative agents or brokerages.

Expected settings:
- brokerage-safe style
- corporate/professional music mood
- softer transitions
- progress bar off

### Luxury Cinematic
Best for higher-end listings.

Expected settings:
- cinematic pacing
- luxury music mood
- soft fade transition
- progress bar off

### Fast Social
Best for TikTok/Reels energy.

Expected settings:
- fast pacing
- high-energy music mood
- smart mix transition
- progress bar on

### Price Drop / Urgent
Best for price drops, back-on-market listings, or urgent promos.

Expected settings:
- fast pacing
- urgent music mood
- flash cut transition
- progress bar on

## Debug tab

Use the Debug tab when rendering fails. It should show:
- Node version
- assets folder
- Remotion folder
- project count
- output count
- job count
- generated campaign config health
- duplicate PHOTO_TRANSITION warnings
- reset generated config button

## Basic test

1. Open `http://localhost:3000/app`
2. Pick **Warm & Inviting**
3. Upload 5 photos
4. Keep Smart Duration on
5. Render Just Listed
6. Open Debug tab and confirm no config issues

## If rendering fails

1. Open Debug
2. Check config issues
3. Click **Reset Generated Config**
4. Render again

