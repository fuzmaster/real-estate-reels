# Claude Code prompt

Use this if you want Claude Code to review and apply the patch carefully instead of running the PowerShell script blindly.

```txt
You are working in C:\Sites\RealEstate-Reels-Web.

Goal: Prepare this Real Estate Reels app for a sellable hosted MVP.

Context:
- Frontend is already deployed on Vercel.
- Backend is Express + Multer + Remotion + FFmpeg.
- Vercel should stay as frontend hosting only.
- Backend should be deployable on Render/Railway using Docker.
- Uploaded listing assets and rendered MP4 outputs must use persistent storage.
- The app currently renders locally and has a VITE_API_URL option.

Tasks:
1. Add Dockerfile, .dockerignore, render.yaml, and update .env.example.
2. Patch server.js:
   - Add CORS controlled by CORS_ORIGIN.
   - Use DATA_ROOT, ASSETS_ROOT, OUTPUT_ROOT, REMOTION_PROJECT env vars.
   - Create ASSETS_ROOT/Projects, OUTPUT_ROOT, and remotion/public/Projects automatically.
   - Store output MP4s in OUTPUT_ROOT instead of remotion/out when hosted.
   - Sanitize project folder names to avoid path traversal.
   - Use spawn without shell string quoting. Use npx.cmd on Windows and npx on Linux.
   - Disable auto-opening the browser when DISABLE_AUTO_OPEN=1 or hosted.
3. Patch client/src/api.ts:
   - Trim trailing slash from VITE_API_URL.
   - Encode file URLs without breaking folder slashes.
4. Patch client/src/App.tsx:
   - Change the offline warning so it tells me to point Vercel VITE_API_URL at the hosted Render/Railway API URL, not my local machine IP.
5. Fix start.bat branding from Genera Reels to Real Estate Reels.
6. Run:
   npm install
   npm install --prefix client
   npm install --prefix remotion
   npm run build
   node -c server.js
7. Show me exactly what changed and any errors.

Do not add Clerk, Stripe, or a database yet. This phase is only hosted rendering MVP.
```
