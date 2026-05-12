# Real Estate Reels V6F Final Transition Render Fix

This patch fixes two current blockers:

1. `npm run build` failing because CampaignForm still compares transition IDs against old values:
   - `smart`
   - `fade`
   - `whip`
   - `flash`

   It changes them to:
   - `smart-mix`
   - `soft-fade`
   - `whip-pan`
   - `flash-cut`

2. Remotion render failing because `campaign.config.ts` has duplicate `PHOTO_TRANSITION` exports.

## Install

Copy these files into:

C:\Sites\RealEstate-Reels-Web

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v6f-final-transition-render-fix.ps1
.\tools\verify\VERIFY_V6F.ps1
npm run build
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
node server.js
```

Open:

http://localhost:3000/app

Press:

Ctrl + F5

Try rendering again.

## Clean the folder

After render works:

```powershell
.\tools\maintenance\CLEAN_PROJECT_ROOT_SAFE_V6F.ps1
```

This moves old patch files/backups into one archive folder. It does not delete them.
