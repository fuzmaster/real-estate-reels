# Real Estate Reels V9 - Vibe Presets + Debug System

Copy the contents of this ZIP into:

```txt
C:\Sites\RealEstate-Reels-Web
```

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v9-vibe-debug.ps1
Get-Content .\docs\V9_TEST_GUIDE.md
npm run build
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
node server.js
```

Open:

```txt
http://localhost:3000/app
```

Press:

```txt
Ctrl + F5
```

## What you should see

A new **Choose Reel Vibe** card in the listing form.

A new **Debug** tab in the top menu.

## Vibes added

- Clean Professional
- Warm & Inviting
- Luxury Cinematic
- Fast Social
- Price Drop / Urgent

## Debug features added

- Server status
- Assets folder check
- Remotion folder check
- Project count
- Output count
- Job counts
- Generated config health
- Duplicate export detection
- Reset generated config button

## After testing

You can run:

```powershell
.\dev-check.ps1
```

This checks the build, server syntax, and duplicate generated config exports.
