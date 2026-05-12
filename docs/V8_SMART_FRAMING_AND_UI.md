# V8 Smart Framing + Professional UI

## What changed

This patch adds a safer default workflow:

1. Upload photos
2. The app reads each photo's real width and height
3. The app assigns a Smart Framing template
4. Most photos default to full-screen vertical crop
5. Ultra-wide rooms are flagged so the agent can review them
6. The UI is reorganized into numbered production steps
7. The app styling is sharper and more professional, with hard edges instead of rounded cards

## Smart Framing templates

- Exterior Hero
- Vertical Photo
- Square Photo
- Standard MLS
- Wide Room Pan
- Ultra-Wide Room
- Detail Shot

## Product rule

Default to full-screen vertical. Do not letterbox by default. Fit-to-screen should only be used when a very wide room becomes impossible to understand.

## Next best feature

Use these Smart Framing labels in a true side-by-side live Remotion preview so agents can see the exact final crop before rendering.
