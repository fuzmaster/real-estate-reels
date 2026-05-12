# Online deployment notes

## Recommended setup right now

Use two services:

1. Vercel = frontend website and app UI
2. Render or Railway = backend API and Remotion rendering server

Why: this project needs long-running video rendering, file uploads, FFmpeg, and persistent MP4 output storage. Those are backend/server concerns.

## Environment variables

### Vercel

```txt
VITE_API_URL=https://your-backend-url.onrender.com
```

### Render/Railway backend

```txt
NODE_ENV=production
PORT=3000
DATA_ROOT=/var/data
ASSETS_ROOT=/var/data/assets
OUTPUT_ROOT=/var/data/outputs
REMOTION_PROJECT=/app/remotion
DISABLE_AUTO_OPEN=1
CORS_ORIGIN=https://real-estate-reels.vercel.app
```

## Custom domain later

When you buy a real domain, update these:

1. Vercel domain settings
2. client/index.html canonical URL
3. client/public/sitemap.xml
4. client/public/robots.txt if needed
5. Render CORS_ORIGIN
6. Vercel VITE_API_URL if backend domain changes

## Do not do this yet

Do not build a full multi-tenant SaaS before someone pays or seriously commits.

The fastest way to revenue is:

1. Working demo
2. One brokerage pilot
3. Manual onboarding
4. Then auth/billing/database
