# EDT Blog Builder — integration handoff

**Prepared for:** the person taking over integration and Firebase billing
**Date:** 17 September 2026
**Builder repo:** `weareedt/edt-blog-builder` — `main` @ `aec6680`
**Website repo:** `farizhanapiah/edtwebsite2026` — **not modified**; read only

---

## 1. What this is

An internal tool for EDT. You write a brief, pick one of four article
templates and optionally a photo gallery, upload photos and a video, and
Claude generates a complete, on-brand article. You can then edit it, rearrange
its sections, download it as a self-contained `.html` file, and publish it to
the EDT website's blog.

Everything below has been built and tested against the **Firebase Emulator
Suite on a laptop**. Nothing is deployed. No production Firebase resources
have been created or billed.

---

## 2. How the pieces fit

| Piece | What it is | Where it runs today |
|---|---|---|
| Builder UI | React + Vite app | Local dev server |
| Generation | Cloud Function calling the Anthropic API | Local Functions emulator |
| Articles, photos | Firestore + Firebase Storage | Local emulators |
| Publishing | Cloud Function writing a `publishedArticles` record | Local emulators |
| Blog pages | Next.js pages for the EDT site | Written, not yet in the site repo |

The EDT website runs Next.js 16 on Vercel and uses Supabase for its own data
(admin login, pitch decks, applicants). **The blog is the one part that uses
Firebase.** The site reads it server-side with a Firebase service account, so
the browser never talks to Firebase, no Firebase keys are exposed publicly,
and unpublished drafts are never readable from the site.

---

## 3. What is left before this can go live

Ordered. Items 1–4 are yours; item 5 needs a developer on the website repo.

### 3.1 Turn on Firebase billing (Blaze) — **blocker**

Cloud Functions and Cloud Storage both require the Blaze (pay-as-you-go)
plan. Without it, nothing server-side can deploy.

- Firebase project: `edt-blog-builder` (already exists; aliased as
  `production` in `.firebaserc`).
- Worth setting a **budget alert** on the linked billing account.

**Expected running cost:** the Anthropic API call per generated article is the
real cost; Functions and Storage traffic for an internal tool of this size is
small. There is no per-seat cost.

### 3.2 Put the Anthropic API key in Firebase — **blocker**

The key currently lives only in a local, git-ignored file
(`functions/.env.local`). It has never been committed, and must not be. Store
it as a Firebase secret before deploying:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY --project production
```

Paste the key when prompted. That is the only step: the code side is already
done — `generateArticle` declares `secrets: ['ANTHROPIC_API_KEY']`, which is
what lets a deployed function actually receive it. Nothing changes locally;
the emulator still reads the key from `functions/.env.local`.

The same key is used for every article, so rotating it later is one
`functions:secrets:set` plus a redeploy.

### 3.3 Deploy

```bash
npm install                                   # repo root
npm run templates:check                       # templates match their sources
npm test                                      # 117 tests
firebase deploy --project production
```

That deploys the Functions, the Firestore and Storage rules, and the builder
UI to Firebase Hosting. Then **smoke-test in this order**: create an article →
generate → edit → download → publish → unpublish.

### 3.4 Add real sign-in before sharing the URL — **important**

Today the builder signs everyone in **anonymously**: anyone who opens the URL
gets an account and can generate articles, which spends EDT's Anthropic
credit. That is fine on a laptop and not fine on a public URL.

Two options:

1. **Preferred, and the agreed end state:** move the builder UI into the
   website's existing `/admin` area, which already has a team login (Supabase)
   and is already blocked from search engines. Anonymous sign-in disappears
   entirely.
2. **Interim:** keep the builder standalone but replace anonymous sign-in with
   Google sign-in restricted to `@weareedt.com`. Until then, do not circulate
   the URL.

Note: because accounts are currently anonymous, articles belong to a *browser*,
not a person. Colleagues cannot see each other's work, and clearing site data
loses it. Proper sign-in fixes this; existing local test articles will not
carry over.

### 3.5 Put the blog pages into the website repo

Five files are ready in the builder repo under **`site-integration/`**, with
their own README. They replace the "coming soon" placeholders.

| From `site-integration/` | To `web-repo/edt-website/` |
|---|---|
| `lib/firebase-admin.ts` | `lib/firebase-admin.ts` |
| `lib/blog.ts` | `lib/blog.ts` |
| `components/blog/ArticleInteractions.tsx` | `components/blog/ArticleInteractions.tsx` |
| `app/blog/page.tsx` | `app/blog/page.tsx` *(replaces placeholder)* |
| `app/blog/[slug]/page.tsx` | `app/blog/[slug]/page.tsx` *(replaces placeholder)* |

Then:

1. `npm install firebase-admin` in `web-repo/edt-website`.
2. Add one Vercel environment variable, **`FIREBASE_SERVICE_ACCOUNT`** — the
   service account JSON on a single line (Firebase console → Project settings
   → Service accounts → Generate new private key). Treat it exactly like
   `SUPABASE_SERVICE_ROLE_KEY`: server-side only, never `NEXT_PUBLIC_`.
3. Optional: add articles to `app/sitemap.ts` (snippet in the README).
4. **Check the interactive parts in a real browser** — see §5.

---

## 4. What is already done and verified

Tested against the local emulator:

- **Generation** from a brief, with photos, a hero photo, a gallery and a
  YouTube or uploaded video.
- **Editorial quality checks** that catch stock AI phrasing, invented figures,
  invented anecdotes, made-up quotes and captions that repeat the alt text,
  with one automatic retry.
- **Editing before download**, including rearranging sections, photos,
  galleries and videos.
- **Publishing:** photo-less and five-photo articles published from the UI;
  all published photo URLs fetched back successfully; unpublishing removes the
  page record and the public photos while leaving the originals untouched.
- **Style isolation:** the article's CSS is scoped so it cannot restyle the
  site, and the site's CSS cannot restyle the article. Confirmed against a
  deliberately hostile stylesheet.
- 117 automated tests pass.

Published articles are small: a five-photo article becomes a ~28KB record with
photos served as image files, instead of the ~1.3MB self-contained download.

---

## 5. Known limits and open risks

1. **The interactive parts are unverified in a live page.** Scroll-in
   animations, the reading-progress bar and the flip-card gallery could not be
   tested in the development environment used (its browser reports every page
   as hidden, which stops those browser features from ever running). The code
   matches the templates' original scripts and the correct CSS is present, but
   **someone must open a published article in a real browser and confirm**.
2. **`!important` wins.** A site CSS rule marked `!important` still overrides
   the article's styling. The site's `globals.css` has one such rule (on
   `.btn-primary`). Everything else is safely isolated.
3. **Blending.** Articles carry their own type scale and spacing. If they
   should sit more seamlessly inside the site's look, change it in the
   builder's templates so every future article inherits it, rather than
   overriding it on the site.
4. **Runtime version.** The Functions are pinned to Node 20, which is near end
   of life. Firebase may require a newer version at deploy time.
5. **Not built:** category filters, pagination and related-article links on the
   blog feed; a preview of unpublished drafts on the site; moving the builder
   UI into `/admin` (§3.4).
6. **Nothing has ever run in production.** Treat the first deploy as a test.

---

## 6. Running it locally

```bash
npm install
cp functions/.env.local.example functions/.env.local   # add ANTHROPIC_API_KEY
npm run dev        # emulators + functions watcher + UI, all together
```

Requires Java for the Firestore and Storage emulators (`brew install openjdk`).
Full notes in the repo `README.md`. Each generation run against a real API key
costs real money; set `USE_FIXTURE_CONTENT=1` in `functions/.env.local` to work
on the UI for free.

---

## 7. Map of the important files

**Builder**

| Path | What it does |
|---|---|
| `app/` | The builder UI (React + Vite) |
| `functions/src/generateArticle.ts` | Generation, start to finish |
| `functions/src/publishArticle.ts` | Publish and unpublish |
| `functions/src/prompt/brandVoice.ts` | EDT voice and editorial rules given to Claude |
| `functions/src/prompt/editorialReview.ts` | Automatic quality checks and fixes |
| `functions/src/render/` | Rendering, CSS scoping, video blocks |
| `templates/annotated/` | The four article templates and two galleries |
| `site-integration/` | The files destined for the website repo |

**Data**

| Collection / path | Contents |
|---|---|
| `articles/{id}` | Every article, draft or ready, with its content |
| `publishedArticles/{slug}` | One record per published article — what the site reads |
| `users/{uid}/uploads/…` | Uploaded photos and videos, private to their owner |
| `public/articles/{slug}/…` | Published photo copies, publicly readable |

---

## 8. Questions

Anything about the builder, the publishing flow or the site files can go back
to whoever maintains this repo. The two things worth settling early are
**§3.2** (storing the API key, which blocks a working deploy) and **§3.4**
(sign-in, which blocks sharing the URL).
