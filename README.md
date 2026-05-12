# Real Estate Reels

Create branded short-form listing videos for Instagram Reels, TikTok, and YouTube Shorts in minutes — without a video editor.

## Who it's for

- Real estate agents who need fast social content for new listings
- Brokerage marketing teams producing reels at scale
- Agent coordinators handling repeat listing video workflows

## What it does

- Generates polished 1080×1920 MP4 videos from listing photos, agent headshot, and brokerage logo
- Three templates: **Just Listed**, **Open House**, and **Just Sold**
- Ken Burns zoom on listing photos, animated stats card, agent CTA outro
- Batch queue — prepare many listings and render all at once
- Live render progress, output gallery with preview and download

## Typical workflow

1. Create a listing project and upload your photos, headshot, and logo
2. Fill in the listing details — address, price, beds, baths, agent info, CTA
3. Choose Just Listed, Open House, or Just Sold
4. Render and download the MP4

## Tech stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + Multer
- **Video rendering**: [Remotion](https://remotion.dev) (requires local server)
- **Deployment**: Vercel (UI) — rendering requires the local server

## Local development

```bash
npm install
npm install --prefix client
npm run dev
```

The app runs at `http://localhost:5173`, the API server at `http://localhost:3000`.

## Rendering

Rendering requires the local Express server (`node server.js`) plus Remotion and FFmpeg installed. The Vercel deployment hosts the UI only — all video processing happens on your machine.
