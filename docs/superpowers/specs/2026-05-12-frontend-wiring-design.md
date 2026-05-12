# Frontend Wiring Design
_Date: 2026-05-12_

## Goal

Wire the static homepage to the existing backend API. The current `page.tsx` is a hardcoded wireframe with no event handlers. This spec covers converting it into a fully functional multi-project app.

---

## Routing Structure

| Route | Purpose |
|---|---|
| `/` | Project list (unauthenticated → sign-in card; authenticated → project cards + new project form) |
| `/projects/[id]` | Project editor — scene editor, file uploads, generation, export |

---

## Auth

- Remove `pages: { signIn: "/" }` from `src/auth.ts` so NextAuth serves its own Google sign-in page at `/api/auth/signin`
- Add `SessionProvider` to `src/app/layout.tsx`
- Homepage checks session server-side: redirect unauthenticated users to `/api/auth/signin`
- Client components use `useSession()` from `next-auth/react`

---

## Homepage (`/`) — Project List

**Unauthenticated:** centered card with "Sign in with Google" button.

**Authenticated:**
- Header with "YouTube Creator" branding and "Sign out" button
- "New project" button → opens slide-in form panel
- Grid of project cards, each showing: title, status badge, created date, "Open" link to `/projects/[id]`
- Empty state message if no projects exist
- Data: `GET /api/projects`

**New project form fields:**

| Label | Schema field | Notes |
|---|---|---|
| Topic | `topic` | Required, 3–200 chars |
| Bullet notes | `outline` | Required, 10–12000 chars |
| Audience | `audience` | New field — "Who is this video for?" |
| Call to action | `callToAction` | New field — "What should viewers do?" |
| Duration | `targetLengthMin` | Toggle: 3 or 5 min |
| Voice | `ttsVoice` | "Warm female"→nova, "Clear male"→onyx, "Calm narrator"→shimmer |
| Tone | `tone` | Existing dropdown |
| Title | `title` | Auto-derived from topic, user-editable |

On submit: `POST /api/projects` → on success redirect to `/projects/[id]`.

---

## New API Route

**`GET /api/projects/[projectId]`** — fetch single project with scenes, assets, latest job, and scripts. Required because the editor needs to load one project by ID.

---

## Project Editor (`/projects/[id]`)

### Left panel — Settings

- Topic, notes, audience, CTA, duration, voice, tone pre-filled from project
- Read-only after generation has started (status !== "draft")
- Four upload tiles (Photos, Clips, Intro image, Outro image):
  - Click → hidden `<input type="file">` picker
  - On file selected → `POST /api/projects/[id]/assets` with `FormData { file, type }`
  - Show upload count badge per type after success
- **"Create draft" button:**
  - `POST /api/projects/[id]/generate`
  - Transitions to a progress panel showing % and `currentStep` message
  - Polls `GET /api/jobs/[jobId]/status` every 3 seconds
  - On complete/failed: reload project data and show scenes or error

### Right panel — Draft progress + Scene editor

**Draft progress tracker:** 5 steps (Upload notes, Add media, Create draft, Review scenes, Export) — active step highlighted based on `project.status`.

**Scene editor** (visible once generation complete):
- Real `Scene` records from DB (replacing hardcoded sample data)
- Each scene card shows: thumbnail type, title, caption, duration, status badge
- **Edit words** → inline textarea for `narrationText` and `captionText`, Save button → `PATCH /api/projects/[id]/scenes/[sceneId]`
- **Swap media** → file picker → uploads asset, then patches scene `assetId`
- **Approve** → `POST /api/projects/[id]/scenes/[sceneId]/approve` — only enabled when scene status is "ready"
- **Regenerate selected scene** → selectable scenes, `POST /api/projects/[id]/generate` (scene_regeneration type)

**Export panel:**
- "Export after approval" → `POST /api/projects/[id]/export`
- Disabled until all scenes have status "approved"
- On success: show download link for the ZIP

**YouTube upload panel:**
- "Upload to YouTube" → `POST /api/projects/[id]/youtube-upload`
- Disabled until export exists

---

## Worker Infrastructure Note

Generation (`POST /api/projects/[id]/generate`) queues a `pg-boss` job. The worker in `src/worker.ts` must run as a persistent process to execute jobs. **This will not run on Vercel serverless.** The UI will show a clear notice: _"Generation is queued. Run the worker process to process it."_ A separate deployment (Railway, Render, or Fly.io) is needed to run `npm run worker`.

---

## Component Structure

```
src/
  app/
    layout.tsx              ← add SessionProvider
    page.tsx                ← project list (server component)
    projects/
      [id]/
        page.tsx            ← project editor (server component shell)
  components/
    ProjectCard.tsx         ← single project card
    NewProjectForm.tsx      ← slide-in creation form
    ProjectEditor.tsx       ← full editor (client component)
    SceneCard.tsx           ← individual scene with edit/swap/approve
    UploadTile.tsx          ← file upload tile with hidden input
    DraftProgress.tsx       ← 5-step progress tracker
    GenerationPoller.tsx    ← polls job status, shows progress
```

---

## Error Handling

- All API calls show inline error messages (not alerts)
- 401 responses redirect to sign-in
- Upload failures show per-tile error text
- Generation failures show error message in progress panel with a "Try again" button

---

## Out of Scope

- YouTube OAuth connection flow (already has its own route, leave as-is)
- Worker deployment setup
- Pagination of project list
