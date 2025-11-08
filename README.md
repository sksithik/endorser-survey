# Endorser Survey & Rewards Platform (Next.js 14)

Brain-dead simple flow for happy customers to act: survey → content → share → proof → points.

Core sequence:
1. Invite: `/[org_slug]/invite` welcome video + value bar (1000 pts = $10).
2. Survey: capture experience answers, persist session.
3. Generate assets: draft review, video script, referral email via `/api/endorser/generate`.
4. Actions: edit/review, record/upload video or slideshow, share profile.
5. Submit proof: URLs → evidence (reward events logged).
6. Verification & points: `/api/reward` applies guardrails, awards points, updates balance.
7. Optional referrals: track lead → closed-won, top-up bounty via `/api/referral/closed-won`.
8. Redemption: Gift cards via Giftbit `/api/giftbit/redeem` (points deduction logged).

Admin capabilities:
- Manual point recommendations `/api/admin/recommend-points` (sentiment & quality heuristics).
- Manual awards through `/api/reward` with `source=manual` + `manualPoints`.
- Referral bounty top-ups.

Guardrails (lib/rewards.ts):
- Fixed value: usd_value = points / 1000 * 10.
- Policy flags: allow_google_review_rewards, allow_yelp_review_rewards (often false), allow_public_video_incentives.
- Fraud heuristics: reused URLs, excessive IP activity.
- Budget checks: ensure pending award ≤ org budget.
- Sentiment & quality scoring stubs for multiplier.

Tables (add via SQL migrations in Supabase):
- endorser_users(id, total_points, ...)
- reward_events(id, user_id, action, source, points, usd_value, metadata jsonb, created_at)
- point_transactions(id, user_id, delta, balance_after, reward_event_id, reason, metadata jsonb, created_at)
- endorser_responses(id, user_id, org_slug, survey_session_id, answers jsonb, derived jsonb, created_at)
- referrals(id, referrer_user_id, referral_code, lead_email, lead_status, bounty_points_target, bounty_points_awarded, closed_won_at, metadata jsonb, created_at)

Example SQL (simplified – adjust types/indexes):
```sql
create table reward_events (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz default now(),
	user_id uuid references endorser_users(id) on delete cascade,
	action text not null,
	source text,
	points int not null,
	usd_value numeric,
	metadata jsonb
);
create index on reward_events(user_id);

create table point_transactions (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz default now(),
	user_id uuid references endorser_users(id) on delete cascade,
	delta int not null,
	balance_after int not null,
	reward_event_id uuid references reward_events(id),
	reason text,
	metadata jsonb
);
create index on point_transactions(user_id);

create table endorser_responses (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz default now(),
	user_id uuid references endorser_users(id) on delete cascade,
	org_slug text not null,
	survey_session_id text,
	answers jsonb not null,
	derived jsonb
);
create index on endorser_responses(user_id);

create table referrals (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz default now(),
	referrer_user_id uuid references endorser_users(id) on delete cascade,
	referral_code text unique not null,
	lead_email text,
	lead_status text,
	closed_won_at timestamptz,
	bounty_points_target int,
	bounty_points_awarded int,
	metadata jsonb
);
create index on referrals(referrer_user_id);
```

## Quick Start
```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:3000
```
## Build
```bash
pnpm build && pnpm start
```

## Features
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS UI
- Survey sessions + progress save endpoints
- Asset generation (`/api/endorser/generate`)
- Reward awarding (`/api/reward`) with guardrails + logging
- Gift card redemption (Giftbit) with point transactions
- Manual point recommendation & referral bounty top-up APIs
- Sentiment & quality heuristic stubs (upgrade later with real AI)

## Notes
- Local video/selfie flows remain; integrate testimonial assets with sharing.
- Replace heuristic sentiment with actual AI provider when ready.
- Use RPC/SQL transactions for atomic point updates (currently sequential). Add function: `award_points(_user_id uuid, _delta int, _reason text, _event jsonb)`.

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
- Never expose service role keys to the browser; server routes only.
- Validate proof URLs (domain & reachability) before awarding high-value points.
- Flag suspicious actions via `metadata.guardrailReasons` in `reward_events`.

## API Summary
- `POST /api/endorser/generate` → { draftReview, videoScript, referralEmail }
- `POST /api/reward` → award points (body: action, channel?, proofUrls?, textContent?, manualPoints?, source?)
- `POST /api/admin/recommend-points` → { recommendedRange, sentiment, quality }
- `POST /api/referral/closed-won` → top-up remaining bounty
- `POST /api/giftbit/redeem` → gift card issuance & point deduction

## Point Math
`usd_value = points / 1000 * 10` (fixed, do not vary per org).

## Next Steps / TODO
- Add proof submission endpoint & UI components.
- Endorser profile page to showcase testimonial & share link.
- Referral link generation + tracking pipeline.
- Replace naive heuristics with real AI sentiment/alignment.
- Atomic Supabase SQL functions for awarding & redeeming points.

