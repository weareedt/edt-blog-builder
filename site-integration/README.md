# Blog integration — files for the EDT website repo

Drop-in files that make `/blog` real on the EDT site
(`farizhanapiah/edtwebsite2026` → `web-repo/edt-website`). Everything the
pages render is written by the blog builder's **Publish** button.

Nothing here has been compiled: these files reference `next`, `react` and the
site's `@/` alias, none of which exist in this repo. Treat them as a starting
point to review in the site repo, not as verified code.

## Where the files go

| This repo | The site repo |
|---|---|
| `lib/firebase-admin.ts` | `web-repo/edt-website/lib/firebase-admin.ts` |
| `lib/blog.ts` | `web-repo/edt-website/lib/blog.ts` |
| `components/blog/ArticleInteractions.tsx` | `web-repo/edt-website/components/blog/ArticleInteractions.tsx` |
| `app/blog/page.tsx` | replaces the "coming soon" `app/blog/page.tsx` |
| `app/blog/[slug]/page.tsx` | replaces the placeholder `app/blog/[slug]/page.tsx` |

## Setup

1. **Dependency:** `npm install firebase-admin` in `web-repo/edt-website`.
2. **Environment variable:** `FIREBASE_SERVICE_ACCOUNT` — the Firebase service
   account JSON on one line (Firebase console → Project settings → Service
   accounts → Generate new private key). Raw JSON or base64 both work. It is a
   server-only secret, exactly like `SUPABASE_SERVICE_ROLE_KEY`; there is no
   `NEXT_PUBLIC_` Firebase config because the browser never talks to Firebase.
3. **Sitemap:** `app/sitemap.ts` lists routes by hand. To include articles:

   ```ts
   import { listPublishedSummaries } from '@/lib/blog'

   const posts = await listPublishedSummaries()
   const blogRoutes = posts.map((post) => ({
     url: `${SITE_URL}/blog/${post.slug}`,
     lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
     changeFrequency: 'monthly' as const,
     priority: 0.7,
   }))
   ```

   (`sitemap()` has to become `async` for this.)

## How it fits together

- The builder publishes to a Firestore collection, `publishedArticles`, one
  document per article, keyed by slug.
- Each document carries everything a page needs: title, dek, category, read
  time, cover image URL, the article's CSS and its markup. The feed is one
  query with no joins.
- Photos are Firebase Storage URLs, not packed into the page. A five-photo
  article is a ~28KB document instead of a ~1.3MB file.
- Pages revalidate every 5 minutes, so publishing appears without a redeploy.
- Drafts never leave the builder: only published articles are written to this
  collection, and it's read with a server-side service account.

## Two things to check in review

- **CSS.** The article's styles are scoped to `.edt-article` before they're
  stored, so they can't collide with Tailwind in either direction. If an
  article should blend further into the site (type scale, spacing), adjust it
  in the blog builder's templates rather than overriding here — every future
  article then inherits it.
- **Interactions.** `ArticleInteractions` is a port of the scripts in the
  builder's templates: reading progress, scroll reveals, TOC scrollspy, entry
  autoplay and flip cards. If a template's script changes there, change it
  here too.

## Not included

- Moving the builder UI itself into `/admin` (the agreed end state).
- Category filtering, pagination and related-article links on the feed.
- The "What EDT Is Watching" news section from the mockup, deliberately
  dropped.
