# Real Estate Reels V6G - Transition crash fix

This patch fixes the errors caused by repeated transition patches:

```txt
SyntaxError: Identifier 'safeTransition' has already been declared
```

and:

```txt
Multiple exports with the same name "PHOTO_TRANSITION"
```

## Install

Copy these files into:

```txt
C:\Sites\RealEstate-Reels-Web
```

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v6g-dedupe-transition-crash-fix.ps1
.\tools\verify\VERIFY_V6G.ps1
npm run build
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
node server.js
```

Then open:

```txt
http://localhost:3000/app
```

Press:

```txt
Ctrl + F5
```

Render again.

## What this patch does

- Removes duplicate `safeTransition` declarations in `server.js`
- Removes duplicate `PHOTO_TRANSITION` exports in the generated Remotion config template
- Repairs the current `remotion/src/campaign.config.ts`
- Keeps the visible Photo Transition UI
- Keeps canonical transition values:
  - `smart-mix`
  - `soft-fade`
  - `slide-left`
  - `slide-up`
  - `zoom-pop`
  - `whip-pan`
  - `flash-cut`
  - `none`

## Cleanup

Only after the app builds and renders:

```powershell
.\tools\maintenance\CLEAN_PROJECT_ROOT_SAFE_V6G.ps1
```

The cleanup script moves old patch junk into an archive folder. It does not delete anything.
