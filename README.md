# AI Talking Wizard (Next.js 14)

Survey ➜ selfie ➜ auto-notes ➜ talking video. Mobile-first, modern UI with animations.

## Quick Start
```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:3000
```
## Build
```bash
pnpm build && pnpm start
```

## What you get
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + tasteful glassmorphism + motion
- 5 random survey questions (from a pool)
- Camera-based selfie capture (client only)
- Script generation from answers (local, simple)
- Local "AI talking" recording: canvas animation + mic → WebM download
- Pluggable /api/vendor-demo route to wire D-ID / HeyGen etc (server-side)

## Notes
- The local generator records your mic (permission required).
- For a true AI avatar, put your vendor call in `app/api/vendor-demo/route.ts`.
- Keep API keys in env vars. Handle webhooks to retrieve a final video URL.
