# Gemini V2 Reel Testing Notes

## Why we are doing this

Gemini said the current output is not sellable because it feels like a proof-of-concept slideshow instead of a premium social video.

The biggest problems it called out:

1. Black/static opening
2. Slow 4-second holds
3. Bad phone safe zones
4. No persistent agent branding
5. Flat Ken Burns motion
6. No strong social hook
7. No useful controls for different listing styles

## What this patch tests

This is not the final SaaS. This is a better video engine test.

We are testing whether agents would pay for the output once the default reel is more polished.

## Test checklist

Render one reel with:

```txt
Duration: 15 seconds
Video Style: Social Punchy
Pacing: Fast Cuts
Safe Zones: ON
Auto-Enhance: ON
Persistent Branding: ON
Progress Bar: ON
```

Then render again with:

```txt
Duration: 15 seconds
Video Style: Luxury Cinematic
Pacing: Cinematic
Safe Zones: ON
Auto-Enhance: ON
Persistent Branding: ON
Progress Bar: OFF
```

Compare them.

## What still needs to be built after this

- Better photo ordering controls
- Drag-to-reorder photos
- Room labels
- QR code end card
- True beat sync
- Better font loading
- More templates: Price Drop, Coming Soon, Market Update, Luxury Listing
- Authentication
- Database
- Stripe
- Render usage limits
- Real user accounts
