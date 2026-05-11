# Field Notes

A construction field book PWA for inspectors. **This repository is currently the foundation phase only** — Firebase auth, protected routing, mobile-first app shell, and PWA installability. No app features yet.

## Stack

- React 19 + Vite (JavaScript only, no TypeScript)
- React Router (HashRouter for GitHub Pages)
- Firebase (Authentication only at this phase)
- Vanilla CSS with CSS variables (mobile-first)
- `vite-plugin-pwa` for installability

## Project structure

```text
field-notes/
├── .github/workflows/deploy.yml
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── assets/
│   ├── components/
│   ├── css/
│   │   ├── globals.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   └── variables.css
│   ├── firebase/
│   │   └── firebase.js
│   ├── layouts/
│   │   └── AppLayout.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── LoginPage.jsx
│   ├── routes/
│   │   └── ProtectedRoute.jsx
│   ├── utils/
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project**
   - Go to [console.firebase.google.com](https://console.firebase.google.com), create a new project.
   - In **Authentication → Sign-in method**, enable **Google**.
   - In **Project settings → General → Your apps**, register a Web App and copy the config values.
   - In **Authentication → Settings → Authorized domains**, add `localhost` (already there) and your GitHub Pages domain (e.g. `your-username.github.io`).

3. **Add environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values from the Firebase web app config. Required variables (all prefixed `VITE_` so Vite exposes them to the client):

   | Variable | Used in |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `src/firebase/firebase.js` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `src/firebase/firebase.js` |
   | `VITE_FIREBASE_PROJECT_ID` | `src/firebase/firebase.js` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `src/firebase/firebase.js` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `src/firebase/firebase.js` |
   | `VITE_FIREBASE_APP_ID` | `src/firebase/firebase.js` |

## Running locally

```bash
npm run dev
```

Open the URL Vite prints (defaults to `http://localhost:5173`).

## Building

```bash
npm run build
```

Output goes to `dist/`. Preview the production build with:

```bash
npm run preview
```

## Deploying to GitHub Pages

Two paths are wired up. **Pick one.**

### Option A — GitHub Actions (recommended)

1. Push the repo to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions**, add the six `VITE_FIREBASE_*` secrets matching `.env.example`.
4. Push to `main`. The `.github/workflows/deploy.yml` workflow builds and deploys.

### Option B — `gh-pages` branch (manual)

```bash
npm run deploy
```

This runs `vite build` then publishes `dist/` to the `gh-pages` branch via the `gh-pages` package. In **Settings → Pages**, set **Source** to **Deploy from a branch**, branch `gh-pages` / `(root)`.

### Why HashRouter?

GitHub Pages serves static files and 404s on unknown paths, so client-side routes like `/login` would break on refresh. `HashRouter` puts routes after `#` (e.g. `/#/login`), which the static server ignores and the client handles. Required at this phase; can swap to `BrowserRouter` later when moving to Cloudflare Pages.

### `base: './'`

Vite is configured with `base: './'` so the build works whether GitHub Pages serves at `username.github.io` or `username.github.io/repo-name/` without further config.

## PWA

The app is installable on mobile and desktop. The service worker is registered with `registerType: 'autoUpdate'`. **No offline data caching, sync queues, or IndexedDB** are configured at this phase — only basic installability.

To test installability locally, run `npm run build && npm run preview` and open the preview URL in Chrome — you should see the install prompt in the address bar.

The icons in `public/icons/` are placeholder PNGs. Replace them with branded artwork before shipping.

## Phase 2 — Job Management

Authenticated users can create, list, view, edit, and delete jobs. Job documents live in a single Firestore `jobs` collection.

### Firestore setup

1. In the Firebase Console, open **Build → Firestore Database** and click **Create database**. Pick a region close to your users; **Production mode** is fine.
2. The app writes to a top-level collection named `jobs`. Each document has the shape:

   ```js
   {
     companyId: 'demo-company',  // TEMP — see note below
     jobNumber: 'string',
     jobName: 'string',
     location: 'string',
     description: 'string',
     createdBy: 'firebase-auth-uid',
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

3. **Security rules** (paste into the **Rules** tab — replace the defaults):

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /jobs/{jobId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   This restricts every read and write to authenticated users. Tighten later when real company membership lands.

4. **Composite index** — the jobs list query filters by `companyId` and orders by `createdAt`. Firestore needs a composite index for this. The first time you run `npm run dev` and load `/`, the failed query logs a console error containing a one-click link to create the index. Click it. The index is:

   - Collection: `jobs`
   - Fields: `companyId` Ascending, `createdAt` Descending
   - Query scope: Collection

### Temporary `companyId`

Every job is stamped with `companyId: 'demo-company'` (defined as `TEMP_COMPANY_ID` in [`src/firebase/jobs.js`](src/firebase/jobs.js)). When real company management is built, replace that constant with a value resolved from the authenticated user's profile.

### Routes

| Path | Page |
| --- | --- |
| `/` | Job list (search + create) |
| `/jobs/new` | Create job form |
| `/jobs/:jobId` | Job detail (view, edit, delete) |
| `/jobs/:jobId/edit` | Edit job form |

### How to test

1. `npm run dev`
2. Sign in with Google.
3. Click **New job**, fill in number + name, submit. You land on the detail page.
4. Click **Edit**, change a field, save.
5. Return to the list, search by number or name.
6. Click **Delete** on the detail page and confirm the browser prompt; you return to the list.

## Phase 3 — Daily Entries

Each job can hold one daily entry per date. A daily entry captures contractor, weather, workers, equipment, and a daily summary.

### Firestore setup (daily entries)

The app writes to a top-level collection named `dailyEntries`. Each document:

```js
{
  companyId: 'demo-company',
  jobId: 'string',
  date: 'YYYY-MM-DD',
  contractor: 'string',
  weatherAM: 'string',
  weatherPM: 'string',
  workers: 'string',
  equipment: 'string',
  notes: 'string',
  createdBy: 'firebase-auth-uid',
  createdByName: 'string',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Security rules** — extend the existing rules to cover `dailyEntries`:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId} {
      allow read, write: if request.auth != null;
    }
    match /dailyEntries/{entryId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Composite index** — listing entries for a job uses `where('jobId','==',x)` + `orderBy('date','desc')`. Firestore will need:

- Collection: `dailyEntries`
- Fields: `jobId` Ascending, `date` Descending
- Query scope: Collection

The first time you load a job detail page in dev, Firestore logs a console error containing a one-click create-index link. Click it.

The duplicate-date check (`where('jobId','==',x)` + `where('date','==',y)`) uses two equality filters and is satisfied by the default single-field indexes — no extra composite index required.

### Routes (daily entries)

| Path | Page |
| --- | --- |
| `/jobs/:jobId/daily/new` | Create daily entry |
| `/jobs/:jobId/daily/:dailyEntryId` | Daily entry detail |
| `/jobs/:jobId/daily/:dailyEntryId/edit` | Edit daily entry |

### Duplicate prevention

Creating or editing an entry runs a query for the same `jobId + date` first. If a different document already owns that date, the form rejects with a user-visible message (no duplicate is written). This is a check-then-write, so a true race between two tabs is theoretically possible but vanishingly rare for field use.

### How to test (daily entries)

1. Open a job's detail page → the daily entries section appears below the job actions.
2. Click **New daily entry**. The date defaults to today. Fill in contractor + workers (required) and submit.
3. You land on the daily entry detail page. Two placeholder sections (Field Notes, Survey Setups) sit below the data — those are next phases.
4. Click **Edit** on the entry, change a field, save.
5. Try to create a second entry with the same date — the form rejects with "A daily entry for &lt;date&gt; already exists for this job."
6. Click **Delete** on a daily entry → confirm → return to the job detail page; the entry is gone from the list.

## Phase 4 — Field Notes

Each daily entry has a chronological list of timestamped field notes — quick logbook-style observations from the inspector.

### Firestore setup (field notes)

The app writes to a top-level collection named `fieldNotes`. Each document:

```js
{
  companyId: 'demo-company',
  jobId: 'string',
  dailyEntryId: 'string',
  timestamp: Timestamp,        // captured on the client at create time
  text: 'string',
  createdBy: 'firebase-auth-uid',
  createdByName: 'string',
  createdAt: Timestamp,        // server-assigned
  updatedAt: Timestamp         // server-assigned
}
```

**Security rules** — extend the existing rules to cover `fieldNotes`:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId} {
      allow read, write: if request.auth != null;
    }
    match /dailyEntries/{entryId} {
      allow read, write: if request.auth != null;
    }
    match /fieldNotes/{noteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Composite index** — listing notes for a daily entry uses `where('dailyEntryId','==',x)` + `orderBy('timestamp','asc')`. Firestore needs:

- Collection: `fieldNotes`
- Fields: `dailyEntryId` Ascending, `timestamp` Ascending
- Query scope: Collection

The first time you load a daily entry detail page in dev, Firestore logs a console error containing a one-click create-index link.

### How to test (field notes)

1. Open a daily entry's detail page → the **Field notes** section appears between the entry summary and the Survey placeholder.
2. Empty state shows "No field notes yet". Type in the **New note** textarea and tap **Add note** → the note appends to the list immediately, and the textarea clears.
3. Add several more notes — they remain in chronological (ascending) order.
4. Tap **Edit** on a note → the text becomes a textarea → change it → **Save**.
5. Tap **Delete** on a note → confirm → the note disappears from the list.
6. Reload the page → all notes persist; ordering is preserved.

### Confirmation checklist

- [ ] Notes save to Firestore under `fieldNotes` with the correct `jobId`, `dailyEntryId`, and `companyId`.
- [ ] List loads in chronological order.
- [ ] Add / edit / delete all work end to end.
- [ ] Empty state and loading state both render.
- [ ] No daily-entry, job, or auth functionality regressed.
- [ ] No new top-level systems (photo uploads, search, tagging, etc.) were added.

## Phase 5 — Photo attachments on field notes

Field notes can now hold photo attachments. Each `fieldNotes` document gains an optional `photoUrls: string[]` array; binary data lives in Firebase Storage.

### Firebase Storage setup

1. In the Firebase Console, open **Build → Storage** and click **Get started**. Use the default rules ("start in production mode") — we'll replace them below.
2. **Storage rules** — paste in the **Rules** tab and publish:

   ```text
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /companies/{companyId}/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   This restricts access to authenticated users. Tighten later when real company membership lands.

3. Confirm `VITE_FIREBASE_STORAGE_BUCKET` is set in `.env.local` — it should already be present from Phase 1.

### Storage path

Each upload is stored at:

```text
companies/{companyId}/jobs/{jobId}/dailyEntries/{dailyEntryId}/fieldNotes/{fieldNoteId}/{fileName}
```

`companyId` currently uses the `TEMP_COMPANY_ID = 'demo-company'` constant. The Firestore document at `fieldNotes/{fieldNoteId}` holds the resulting download URLs in `photoUrls`. Storage and Firestore stay in sync via:

- **Upload:** Storage write → Firestore `arrayUnion(url)`. If the Firestore step fails, the just-uploaded Storage object is deleted to avoid an orphan.
- **Delete:** Storage delete → Firestore `arrayRemove(url)`. Storage-first ordering means a partial failure leaves a recoverable state (URL still in Firestore, file still in Storage) rather than an orphan file with no reference.

### How to test (photos)

**Desktop:**

1. Open a daily entry with at least one field note.
2. Click **Add photo** under a note → file picker opens → choose a JPEG/PNG.
3. Button shows **Uploading…** while the upload runs; thumbnail appears immediately on completion.
4. Click the thumbnail → full-size modal opens; click anywhere or the × to close.
5. Click **Delete** under a thumbnail → confirm → thumbnail disappears; the file is gone from Storage and the URL is gone from Firestore.

**Mobile camera capture:**

1. Open the same page on a phone (HTTPS / installed PWA / dev network reachable).
2. Tap **Add photo** → device offers camera (preferred) or gallery.
3. Take a photo → returns to the app, upload progresses, thumbnail appears.
4. Reload — photos persist.

**Backward compatibility:** any existing field note from Phase 4 (no `photoUrls` field) renders cleanly — the gallery shows "No photos." until something is uploaded.

### Confirmation checklist (photos)

- [ ] Upload from desktop file picker works.
- [ ] Upload from phone camera works (`capture="environment"`).
- [ ] Thumbnails display in a responsive grid; click opens full-size modal.
- [ ] Delete removes the file from Storage and the URL from the field note.
- [ ] Field notes from Phase 4 (no `photoUrls`) still render.
- [ ] No orphan files created on upload failure (Storage cleanup runs if Firestore link fails).
- [ ] No new top-level systems introduced (no galleries, no project-wide media, no editing).
- [ ] No regression in jobs / daily entries / field notes / auth flows.

## Phase 6 — Survey / Level Book

A digital HI-method level book inside each daily entry. Two new collections — `surveySetups` (instrument setups) and `surveyShots` (BS/FS/TP readings) — and a pure recompute function that derives HI and elevations on render.

### Firestore setup (survey)

Two new collections:

```js
// surveySetups/{setupId}
{ companyId, jobId, dailyEntryId,
  setupName, initialBenchmarkElevation,   // number or null (null = auto-chain)
  createdAt, updatedAt }

// surveyShots/{shotId}
{ companyId, jobId, dailyEntryId, surveySetupId,
  type,           // "BS" | "FS" | "TP"
  rodReading,     // number
  description,
  orderIndex,     // integer, ascending within a setup
  createdAt, updatedAt }
```

`calculatedHI` and `calculatedElevation` from the spec are intentionally **not stored** — they are derived in a pure function on every render so they never go stale. (Worth changing later if the values need to be queried from other systems.)

**Security rules** — extend the existing rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId}            { allow read, write: if request.auth != null; }
    match /dailyEntries/{entryId}  { allow read, write: if request.auth != null; }
    match /fieldNotes/{noteId}     { allow read, write: if request.auth != null; }
    match /surveySetups/{setupId}  { allow read, write: if request.auth != null; }
    match /surveyShots/{shotId}    { allow read, write: if request.auth != null; }
  }
}
```

**Composite indexes** required:

| Collection | Fields | Used by |
| --- | --- | --- |
| `surveySetups` | `dailyEntryId` ASC + `createdAt` ASC | list setups for a daily entry |
| `surveyShots`  | `surveySetupId` ASC + `orderIndex` ASC | list shots within a setup |

The first time you open the survey section in dev, Firestore will log a console error containing one-click create-index links.

### Calculation logic (HI method)

Implemented in [`computeSetupShots`](src/firebase/survey.js) and [`computeAllSetups`](src/firebase/survey.js). Per setup, iterate shots in `orderIndex` order:

- **BS** — defines or redefines HI for the current rod position.
  - `HI = currentElevation + rodReading`
  - The shot's elevation equals the `currentElevation` it was taken on.
- **FS** — reads off a different point with the same HI.
  - `calculatedElevation = HI - rodReading`
  - `currentElevation` is **not** moved.
- **TP** — same math as FS, but the rod is now on a new point.
  - `calculatedElevation = HI - rodReading`
  - `currentElevation` is moved to that elevation so a subsequent BS chains off it.

**Cross-setup chaining**: when a setup's `initialBenchmarkElevation` is `null` (left blank), the resolver walks backwards through prior setups and uses the most recent TP elevation as the starting point. This implements the spec's "TP acts as BS on next setup" rule without making the user copy values manually. Set the field explicitly to override.

### How to test (survey)

1. Open a daily entry → scroll to **Survey / Level Book**. Empty state shows "No setups yet…".
2. Tap **Add setup** → name it "Setup 1", set **Initial benchmark elevation** = `100.000` → **Create setup**.
3. In the new card, tap **Add shot**:
   - First shot: type **BS**, reading `5.123`, description "BM-1" → **Add shot**.
   - The card header should now show `BM elev: 100.000 · HI: 105.123`.
   - The row shows `Elev: 100.000`.
4. Add a second shot: **FS**, `4.000`, "Stake A" → row shows `Elev: 101.123` (= HI − FS).
5. Add a third shot: **TP**, `3.000`, "TP-1" → row shows `Elev: 102.123`. Setup HI is unchanged.
6. Tap **Add setup** again → leave benchmark blank → **Create setup**. The new card header should show `BM elev: 102.123 (auto-chained)`.
7. Add a **BS** shot of `2.000` in setup 2 → header HI becomes `104.123` (= 102.123 + 2.000).
8. Edit the first setup's BS reading from `5.123` → `5.500`. Setup 1's HI updates to `105.500`, the TP elevation becomes `102.500`, **and setup 2's auto-chained benchmark updates to `102.500`** with HI `104.500` — the dependency propagates.
9. Edit a shot, then delete a shot, then delete a whole setup → confirm prompts appear; data updates in Firestore.

### Confirmation checklist (survey)

- [ ] Add setup with explicit benchmark elevation works.
- [ ] Add second setup with blank benchmark auto-chains from the previous TP.
- [ ] BS shot defines HI; setup header displays current HI.
- [ ] FS shot subtracts from HI without moving currentElevation.
- [ ] TP shot subtracts from HI **and** carries forward to subsequent BS.
- [ ] Editing any shot or setup recalculates the whole chain on render.
- [ ] Deleting a setup cascades and removes all its shots in one batch.
- [ ] Existing jobs / daily entries / field notes / photos still work.

## What's intentionally not here

The following are **deliberately not built** in this phase: survey drawings, topo maps, GIS layers, GPS integration, CAD export, PDF reports, Excel export, advanced geodesy (curvature/refraction), stakeout, alignments, galleries outside field notes, photo tagging or editing, batch uploads, AI labeling, project-wide media libraries, weather APIs, offline sync, dashboards, admin tools, and email/password auth. Those are out of scope for V1.
