# V8B Smart Framing Build Fix

This patch fixes the TypeScript build errors introduced by the V8 Smart Framing UI patch.

## Errors fixed

```txt
Cannot find name 'smartFramingBySavedPath'
Cannot find name 'photoSettings'
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
.\tools\patches\apply-v8b-smart-framing-build-fix.ps1
.\tools\verify\VERIFY_V8B.ps1
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

## Important

If `npm run build` fails, do not trust what you see in the browser. The server may still be serving the last successful `client/dist` build.
