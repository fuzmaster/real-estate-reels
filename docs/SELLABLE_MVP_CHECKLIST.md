# Sellable MVP checklist

## Must work before you pitch

- [ ] Landing page loads at the Vercel domain.
- [ ] App loads at `/app`.
- [ ] Server dot is green when Render backend is connected.
- [ ] Create listing works.
- [ ] Photo upload works.
- [ ] Headshot upload works.
- [ ] Logo upload works.
- [ ] Just Listed render works.
- [ ] Open House render works.
- [ ] Just Sold render works.
- [ ] Output Gallery shows MP4 files.
- [ ] Download works.
- [ ] Browser refresh does not delete the output gallery.
- [ ] Render redeploy does not delete outputs. This requires persistent disk.

## What to improve next, in order

### 1. Trust and demo improvements

Add a sample demo mode with preloaded listing photos. Agents are busy. Do not make them upload files just to understand the product.

Add a 30-second screen recording to the landing page showing:

1. Upload photos
2. Fill listing details
3. Click render
4. Download MP4

### 2. Product positioning

Make the headline more direct:

```txt
Turn listing photos into ready-to-post real estate reels in minutes.
```

Subheadline:

```txt
Just Listed, Open House, and Just Sold video templates for agents and brokerages that need consistent social content without editing in Premiere.
```

### 3. Pricing

Use simple early pricing:

```txt
Starter: $29/month per agent
Brokerage Pilot: $99/month for up to 5 agents
Done-for-you: $49 per listing pack
```

Do not overbuild the pricing page before you have real conversations.

### 4. Paywall later

Only build Clerk + Stripe after at least 3 people say they would pay.

When ready, add:

- Clerk auth
- Supabase database
- Stripe Checkout
- Monthly render usage table
- Free watermark
- Pro no watermark

### 5. Reliability fixes

Add a render timeout.
Add a max upload count.
Compress huge images before rendering.
Add a queue page that clearly says only one render runs at a time.
Add automatic filename timestamps so files never overwrite each other.

## Biggest warning

This app is not a normal static website. It creates MP4 files. MP4 rendering needs a real server with FFmpeg and storage. Keep Vercel for the website, but run rendering on Render, Railway, a VPS, or your own machine.
