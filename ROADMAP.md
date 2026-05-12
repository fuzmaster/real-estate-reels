# Real Estate Reels — Project Roadmap

## What this app is

A browser-based tool for real estate agents and brokerages to turn listing photos into
branded short-form MP4 videos (Instagram Reels, TikTok, YouTube Shorts). Three templates:
**Just Listed**, **Open House**, **Just Sold**. Renders locally via Remotion + FFmpeg.

**Stack:** React + Vite + TypeScript + TailwindCSS (client) · Node.js + Express + Multer (server) · Remotion (video) · Vercel (frontend hosting)

**Repo:** https://github.com/fuzmaster/real-estate-reels  
**Live URL:** Vercel deployment (frontend only — rendering requires local server)

---

## ✅ Done

### Phase 1 — Core App (complete)
- [x] Converted Genera Reels music app → Real Estate Reels
- [x] `ListingReel.tsx` Remotion composition — 5 scenes: hook → hero+address → stats card → photo montage → agent CTA
- [x] Three composition IDs: `JustListed`, `OpenHouse`, `JustSold` (one component, `mode` prop)
- [x] Ken Burns zoom on listing photos (`PhotoScene`)
- [x] Accent colors per template: white (Just Listed), blue (Open House), gold (Just Sold)
- [x] `CampaignForm.tsx` — full listing form: address, price, beds/baths/sqft, agent info, CTA, open house date/time
- [x] Photo multi-upload grid
- [x] Optional branding assets: headshot, brokerage logo, background music
- [x] Agent profile save/load (localStorage, up to any number — future: gate at 1 free / 5 pro)
- [x] Template selector (Just Listed / Open House / Just Sold checkboxes)
- [x] Duration slider (10–60 seconds)
- [x] Batch queue — add multiple listings, render all at once
- [x] Render console with live SSE log stream and progress bar
- [x] Output gallery with preview, download, bulk select/delete, sort
- [x] Server: Express + Multer upload routes for photos/headshot/logo/music
- [x] Server: `writeConfig()` generates `campaign.config.ts` before each render
- [x] Server: output filenames like `JustListed - 123 Magnolia Lane.mp4`
- [x] Project folder structure: `Projects/{name}/Photos/`, `Headshot/`, `Logo/`, `Music/`
- [x] Settings panel with default templates, auto-switch-to-jobs pref
- [x] Help tab with workflow guide, template descriptions, FAQ

### Phase 1.5 — Deployment + SEO (complete)
- [x] Vercel deployment (frontend static site)
- [x] `vercel.json` — framework null, outputDirectory, SPA rewrites
- [x] `VITE_API_URL` env var — client can point to local server from Vercel UI
- [x] Offline banner — yellow warning when server health check fails (no confusing 503 error)
- [x] Marketing landing page at `/` — hero, how-it-works, template previews, pricing, FAQ
- [x] App moved to `/app` route
- [x] `index.html` — full meta tags: title, description, og:*, twitter:card, JSON-LD schema
- [x] `robots.txt` + `sitemap.xml`
- [x] Brand assets: logo mark, logo wordmark, app icon (favicon), OG image, 3 template screenshots
- [x] README rewritten (removed stale Genera content)

### Bug Fixes
- [x] `.env` fixed — was pointing to nonexistent Genera Reels Dropbox path
- [x] `remotion/public/Projects/` created — server can now store listing assets
- [x] Server auto-creates `remotion/public/` on first startup (bundled path)
- [x] `vite-env.d.ts` added — fixes `import.meta.env` TypeScript error
- [x] Vercel `tsc: command not found` — build now installs client deps first

---

## 🔲 In Progress / Next Up

### Monetization Infrastructure (needed before any paywall)
- [ ] **Auth** — add Clerk (fastest) or Supabase Auth. Google + email sign-in. Needed to identify users and track plan.
- [ ] **Database** — Supabase or PlanetScale. Tables: `users`, `plans`, `render_usage`. Needed to gate features.
- [ ] **Stripe billing** — Stripe Checkout + webhook to flip `plan` in DB on subscribe/cancel.
- [ ] **Usage tracking** — count renders per user per month, store in DB.

### Paywall Gates (build after auth+billing exist)
- [ ] **Render cap** — 3 renders/month on Free, unlimited on Pro
- [ ] **Watermark** — "Made with Real Estate Reels" badge on Free outputs
- [ ] **Template gating** — Free: Just Listed only. Pro: all three.
- [ ] **Profile limit** — Free: 1 saved agent profile. Pro: 5.
- [ ] **Format gating** — Free: 9:16 only. Pro: 1:1 square + 16:9 horizontal.

### New Features (Pro tier)
- [ ] **Multiple aspect ratios** — register 1080×1080 and 1920×1080 Remotion compositions. Format selector in form.
- [ ] **QR code on outro slide** — render QR from `mlsLink` field using `qrcode` npm package + Remotion `<Img>`
- [ ] **Bulk ZIP download** — "Download all" button per campaign in Output Gallery
- [ ] **Output filename deduplication** — add timestamp suffix to prevent silent overwrites
- [ ] **Photo drag-to-reorder** — control hero shot + montage order with `@dnd-kit/core`
- [ ] **Live Remotion Player preview** — embed `@remotion/player` in side panel, updates as form changes

### Brokerage Tier Features
- [ ] **Multi-agent seats** — multiple users under one brokerage account
- [ ] **Shared brand kit** — logo, accent color, music shared across all agents in an office
- [ ] **White-label** — remove all "Real Estate Reels" branding from output
- [ ] **CSV import** — bulk listing data entry
- [ ] **Bulk render** — render all agents' pending listings at once

### SEO / Content
- [ ] **Real domain** — buy domain, point to Vercel, update canonical/og URLs in `index.html`
- [ ] **OG image** — current one is a PNG mockup, ideal is a proper 1200×630 designed graphic
- [ ] **Google Search Console** — submit sitemap once domain is live
- [ ] **Blog** — articles targeting: "real estate reel ideas", "how to make just listed videos", "Instagram reels for real estate agents 2026"

### Infrastructure
- [ ] **Full-stack deployment** — move to Railway or Render.com so rendering works from the web (not just local). Vercel can't run FFmpeg.
- [ ] **Image compression** — template preview PNGs are ~1.8MB each. Run through `sharp` before shipping.
- [ ] **`.env.example`** — update to reflect new Real Estate Reels paths (currently shows old Genera defaults)

---

## Pricing Plan

| Tier | Price | Key limits |
|------|-------|-----------|
| **Free** | $0 | 3 renders/mo, Just Listed only, 9:16 only, 1 profile, watermark |
| **Pro** | $29/agent/mo | Unlimited renders, all 3 templates, all formats, 5 profiles, no watermark, QR, ZIP download |
| **Brokerage** | $99/mo | Everything Pro + multi-seat, shared brand kit, white-label, bulk render, CSV import |

---

## File Structure (key files)

```
RealEstate-Reels-Web/
├── server.js                        # Express API server (uploads, render queue, SSE)
├── .env                             # Local paths (gitignored) — ASSETS_ROOT, REMOTION_PROJECT
├── vercel.json                      # Vercel build config (static frontend only)
├── client/
│   ├── index.html                   # Meta tags, OG, JSON-LD, favicon
│   ├── public/                      # Static assets served at root
│   │   ├── og-image.png
│   │   ├── logo-mark.png
│   │   ├── logo-wordmark.png
│   │   ├── icon-512.png
│   │   ├── template-just-listed.png
│   │   ├── template-open-house.png
│   │   ├── template-just-sold.png
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   └── src/
│       ├── main.tsx                 # Path router: / = Landing, /app = App
│       ├── App.tsx                  # Main app shell, server health ping, nav tabs
│       ├── api.ts                   # All fetch calls, API_BASE from VITE_API_URL
│       ├── types.ts                 # CampaignFormData, ReelTemplate, OutputCampaign
│       ├── pages/
│       │   └── Landing.tsx          # Marketing landing page
│       └── components/
│           ├── CampaignForm.tsx     # New listing form (all fields + uploads)
│           ├── BatchQueue.tsx       # Queue view
│           ├── RenderConsole.tsx    # SSE log stream + progress
│           ├── OutputGallery.tsx    # Output preview/download/delete
│           ├── Help.tsx
│           └── Settings.tsx
└── remotion/
    ├── src/
    │   ├── Root.tsx                 # Registers JustListed, OpenHouse, JustSold
    │   ├── ListingReel.tsx          # Single component, mode prop drives all 3 templates
    │   └── campaign.config.ts       # Auto-generated by server before each render
    └── public/
        └── Projects/                # Listing asset storage (photos, headshot, logo, music)
```

---

## How local dev works

```bash
# Terminal 1
node server.js        # API server at http://localhost:3000

# Terminal 2
cd client && npm run dev   # Vite dev server at http://localhost:5173
                           # Proxies /api/* → localhost:3000 automatically
```

The `.env` file must exist with correct local paths. The `VITE_API_URL` env var is
only needed in production (Vercel) to point the deployed UI at a running server.

---

## Account & Profile System (planned)

Currently: agent profiles saved to localStorage (per-browser, per-device, no account needed).

Planned:
- Users sign in with Clerk (Google/email)
- Profiles saved to database, accessible from any device
- Plan tracked in DB — free vs pro vs brokerage
- Stripe webhook flips plan on subscribe/cancel
- All API routes check `req.user.plan` before gating features
