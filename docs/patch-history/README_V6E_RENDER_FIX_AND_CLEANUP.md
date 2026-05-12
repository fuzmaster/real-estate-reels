# Real Estate Reels V6E Render Fix + Safe Cleanup

This fixes the render crash:

```txt
safeTransition is not defined
```

It also gives you a safe cleanup script for the messy project root.

## What happened

The transition UI finally appeared, but the server render crashed because `server.js` was trying to write `PHOTO_TRANSITION` using `safeTransition` before that variable existed.

There was also a second problem: Node can crash if an EventEmitter emits `"error"` before the browser is listening to the render stream. This patch adds a no-op listener so render errors show in the UI instead of killing the whole server.

## Install

Copy these files into:

```txt
C:\Sites\RealEstate-Reels-Web
```

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v6e-render-fix-and-cleanup.ps1
.\tools\verify\VERIFY_V6E.ps1
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

Try rendering again.

## Clean up the messy folder

Only after the app builds and renders again, run:

```powershell
.\tools\maintenance\CLEAN_PROJECT_ROOT_SAFE.ps1
```

This does not delete files. It moves old patch scripts and backups into an archive folder like:

```txt
_archive_patch_junk_20260512-163000
```

Keep that archive for a few days. Delete it later only after you know the app still works.
