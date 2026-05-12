# YouTube Creator

Server-hosted YouTube video creation app for reviewed autism and ABA educational videos.

## What This MVP Includes

- Next.js App Router UI and API routes
- Auth.js with Google OAuth / email magic-link provider configuration
- PostgreSQL schema via Prisma
- Cloudflare R2/S3-compatible asset storage helpers
- YouTube research cache
- Claude script/scene generation service
- OpenAI TTS service
- Direct FFmpeg CLI orchestration
- PostgreSQL-backed job queue using pg-boss
- Scene approval workflow
- Export ZIP generation
- Optional private YouTube upload after final approval

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL`, `NEXTAUTH_SECRET`, provider keys, R2 keys, Anthropic key, OpenAI key, and YouTube API key as needed.
3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Apply database migrations once a Postgres database is available:

```bash
npm run prisma:migrate
```

5. Start the app:

```bash
npm run dev
```

6. Start the worker in a separate process:

```bash
npm run worker
```

## Verification

```bash
npm run lint
npm test
npm run build
```

## Notes

- Videos are rendered from uploaded assets only. The app does not generate AI video footage.
- YouTube upload is private-only and blocked until human review is complete.
- FFmpeg is called directly through `child_process.spawn`; `fluent-ffmpeg` is intentionally not used.
