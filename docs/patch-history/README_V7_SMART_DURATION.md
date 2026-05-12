# Real Estate Reels V7 - Smart Duration

This patch adds Jacob's Smart Duration idea.

Gemini said agents will destroy their own retention if they manually set a long duration for too few photos. The app should recommend a reel length based on photo count, then let the user override it only when needed.

## Formula

- Hero photo: 2.5 seconds
- Each extra photo: 1.5 seconds
- CTA ending: 2.5 seconds
- Minimum: 6 seconds
- Maximum: 30 seconds

Example:

- 3 photos = about 8 seconds
- 5 photos = about 11 seconds
- 8 photos = about 16 seconds
- 10 photos = about 19 seconds
- 15 photos = about 26 seconds

## Install

Copy this ZIP into:

```txt
C:\Sites\RealEstate-Reels-Web
```

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v7-smart-duration.ps1
.\tools\verify\VERIFY_V7.ps1
npm run build
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
node server.js
```

Open:

```txt
http://localhost:3000/app
```

Press Ctrl+F5.

## What to test

Upload a different number of photos and check the Smart Duration card.

Try:

- 3 photos
- 5 photos
- 8 photos
- 10 photos

Make sure the render uses the recommended duration when Auto Length is selected.
