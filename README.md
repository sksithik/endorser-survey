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

## Environment setup

Create a `.env.local` in the project root and add the following as needed:

- OPENAI_API_KEY=sk-...
- HEYGEN_API_KEY=hg_...
- HEYGEN_BASE_URL=https://api.heygen.com (optional override)
- HEYGEN_VOICE_ID=<voice_id you have access to>
- HEYGEN_STOCK_AVATAR_ID=<optional public avatar id for fallback>
- DID_API_USERNAME=... (optional for D‑ID)
- DID_API_PASSWORD=... (optional for D‑ID)
- NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=service-role-key-with-storage-object-access
- NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key (fallback if service role is not available)

Storage bucket:
- Create a public bucket named `endorser-bucket` in Supabase Storage.
- Our server routes upload selfie data URLs to `endorser-bucket/selfies/...` using the Service Role key (preferred) and then use the public HTTPS URL for vendors.
- If your bucket is not public, use signed URLs and ensure the vendor can fetch them (public HTTPS required). Our route currently assumes the bucket is public and performs a HEAD check.

Vendor endpoints:
- HeyGen:
	- Photo → Talking video uses Upload Asset + AV4 generate: `/v2/video/av4/generate`.
	- AV4 requires API Pro plan or higher. If your plan isn’t sufficient, we automatically fall back to `/v2/video/generate` with a stock avatar.
	- You can control the fallback avatar with `HEYGEN_STOCK_AVATAR_ID`. If not set or not permitted, we auto-pick a public avatar from `/v2/avatars`.
	- List helpers are available:
		- `GET /api/heygen-avatars?publicOnly=true`
		- `GET /api/heygen-voices`
- D‑ID: If enabled, provide either `DID_API_USERNAME`/`DID_API_PASSWORD` or a compatible key as documented by your account.

Security notes:
- Never expose service role keys to the browser; they are used only in server routes.
- Keep `.env.local` out of version control.
