# Backend stack, plain English

Right now Real Estate Reels uses this stack:

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Hosted on Vercel as a static frontend

This is the website/app UI the agent clicks around in.

## Backend server

- Node.js
- Express
- Multer
- Local filesystem / persistent disk storage

Express handles the API routes for:

- creating listing folders
- uploading photos
- uploading headshots
- uploading brokerage logos
- uploading music
- starting render jobs
- streaming render logs
- listing outputs
- downloading rendered MP4s

Multer is used for file uploads.

## Video rendering engine

- Remotion
- FFmpeg
- Chromium/headless browser, depending on render environment

The Express server writes a `campaign.config.ts` file, then runs Remotion to render the final MP4.

## Deployment direction

Current Vercel deployment is best for the frontend only.

For the backend renderer, use:

- Render.com with Docker, or
- Railway with Docker

Why: Vercel is not the right place for long-running FFmpeg/Remotion video rendering.

## What is NOT added yet

- No Clerk auth yet
- No Supabase database yet
- No Stripe payments yet
- No real user accounts yet
- No usage tracking yet

## Later SaaS stack

Recommended next full SaaS stack:

- Clerk for login
- Supabase for database and user/project records
- Stripe for payments
- Render or Railway for the rendering backend
- Vercel for the frontend
- S3/R2/Supabase Storage later for media files if you outgrow persistent disk
