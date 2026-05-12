# Real Estate Reels V8 — Smart Framing + Professional UI

Copy these files into:

C:\Sites\RealEstate-Reels-Web

Then run:

```powershell
cd C:\Sites\RealEstate-Reels-Web
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\tools\patches\apply-v8-smart-framing-pro-ui.ps1
.\tools\verify\VERIFY_V8.ps1
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

## What this patch is trying to improve

- Adds Smart Framing templates based on photo ratio.
- Defaults uploaded photos to full-screen vertical framing.
- Flags ultra-wide photos instead of automatically letterboxing everything.
- Adds a Smart Framing panel.
- Reorganizes the form section titles into numbered production steps.
- Makes the app UI sharper and more professional.
- Reduces rounded corners across the app UI.

## Important

If the build fails, send the exact terminal output back.
