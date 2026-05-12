# Animation Framework Decision

## Use Remotion as the animation engine

Do not use Framer Motion as the main render animation framework for the MP4 output.

Framer Motion is great for web UI. Real Estate Reels is rendering actual video frames. Remotion works best when each visual state is calculated from the current frame number.

Use this stack:

```txt
Core:
- Remotion
- interpolate()
- spring()
- useCurrentFrame()
- useVideoConfig()

Transition layer:
- Custom preset functions first
- @remotion/transitions later if we want full TransitionSeries scenes
```

## Why not a normal browser animation library?

A browser animation library is driven by time in the browser.

A video renderer needs deterministic frame-by-frame animation. Every frame must be reproducible.

## Best next framework to add

When you want deeper transition scenes, use:

```bash
cd remotion
npm install @remotion/transitions@4.0.421 --save-exact
```

Keep the version aligned with your existing Remotion packages.

## V6 transition presets

Free:
- Smart Mix
- Soft Fade
- Slide In
- No Transition

Pro later:
- Zoom Pop
- Slide Up
- Whip Pan
- Flash Cut
- Beat-synced cuts
- Music-reactive CTA pulse
