# Read this first

This ZIP has been restructured so you can copy/extract the contents directly into:

```txt
C:\Sites\RealEstate-Reels-Web
```

After extracting, `Dockerfile`, `render.yaml`, `.dockerignore`, and `.env.example` should sit directly inside your project folder. The patcher now lives at `tools/patches/apply-online-mvp.ps1`.

Do **not** leave them inside a nested folder.

---

# Real Estate Reels - step-by-step instructions

## Goal

Get your project from “cool local tool” to “online demo + hosted render backend” so you can start showing it to agents and brokers.

Your current Vercel app is ready, but the real rendering still needs a server. Vercel is fine for the website and app screen. Render or Railway should run the backend because the backend needs Node, Remotion, FFmpeg, file uploads, and generated MP4 storage.

---

## Part 1 - Apply the code pack

### 1. Download and unzip this ZIP

Put the folder somewhere easy, like:

```txt
C:\Users\fuzmaster\Downloads\real-estate-reels-sellable-mvp-pack
```

### 2. Open PowerShell

Press the Windows key, type:

```txt
PowerShell
```

Open it.

### 3. Run this command

Copy and paste this into PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Press Enter.

### 4. Run the patcher

Change this path if you unzipped the folder somewhere else:

```powershell
cd "$env:USERPROFILE\Downloads\real-estate-reels-sellable-mvp-pack"
.\tools\patches\apply-online-mvp.ps1 -ProjectRoot "C:\Sites\RealEstate-Reels-Web"
```

The script backs up files before changing them.

---

## Part 2 - Test it on your computer

### 1. Go to your project folder

```powershell
cd "C:\Sites\RealEstate-Reels-Web"
```

### 2. Install everything

Run these one at a time:

```powershell
npm install
npm install --prefix client
npm install --prefix remotion
npm run build
```

### 3. Start the app

```powershell
node server.js
```

### 4. Open the local app

Open this in Chrome:

```txt
http://localhost:3000
```

### 5. Test the basic flow

Make a test listing.
Upload 3-5 photos.
Pick Just Listed.
Click render.
Open the Output Gallery.
Download the MP4.

Do not sell it until this test works at least 3 times in a row.

---

## Part 3 - Push the changes to GitHub

In PowerShell:

```powershell
cd "C:\Sites\RealEstate-Reels-Web"
git status
git add .
git commit -m "Prepare hosted rendering MVP"
git push
```

Vercel will automatically redeploy the frontend after the push.

---

## Part 4 - Deploy the backend on Render

### 1. Go to Render

Open Render in your browser.
Create a new Web Service.
Connect your GitHub repo:

```txt
fuzmaster/real-estate-reels
```

### 2. Choose Docker

When Render asks for runtime or language, choose:

```txt
Docker
```

### 3. Add a persistent disk

Add a disk with:

```txt
Mount path: /var/data
Size: 10 GB
```

This matters. Without the disk, uploaded photos and rendered MP4s can disappear after redeploys.

### 4. Add environment variables

Add these in Render:

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

Replace the CORS_ORIGIN value if you use a custom domain later.

### 5. Deploy

Click Deploy.
Wait for Render to finish.

### 6. Copy your Render URL

It will look something like:

```txt
https://real-estate-reels-api.onrender.com
```

---

## Part 5 - Connect Vercel frontend to Render backend

### 1. Open Vercel

Open your Real Estate Reels project.

### 2. Go to Environment Variables

Add this variable:

```txt
VITE_API_URL=https://your-render-url.onrender.com
```

Use your real Render URL.

### 3. Redeploy Vercel

Go to Deployments.
Click the three dots on the latest deployment.
Click Redeploy.

### 4. Test the live app

Open:

```txt
https://real-estate-reels.vercel.app/app
```

Make a listing.
Upload photos.
Render a video.
Download it.

---

## What to sell first

Do not sell this as a giant SaaS yet.

Sell it as:

```txt
I built a private real estate reel generator that turns listing photos into branded Just Listed, Open House, and Just Sold videos. I can set it up for your brokerage or run it for you as a monthly video service.
```

Best first offer:

```txt
$99 setup + $29/month per agent
```

Or done-for-you:

```txt
$49 per listing video pack
```

Get 3 paying users before building Clerk, Stripe, user accounts, or brokerage seats.
