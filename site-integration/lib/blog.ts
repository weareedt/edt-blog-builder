import { blogDb } from './firebase-admin'

/**
 * One published article, exactly as the blog builder writes it.
 *
 * Everything a page needs is on the row — no joins, no second fetch. The
 * article's markup and CSS arrive ready to embed: the CSS is already scoped
 * to `.edt-article` so it can't collide with the site's Tailwind, and the
 * markup carries no <script> (see ArticleInteractions for why).
 */
export type BlogPost = {
  slug: string
  title: string
  dek: string
  category: 'Guides' | 'Case Studies' | 'Products' | 'Insights'
  readTimeMinutes: number | null
  coverImageUrl: string | null
  coverImageAlt: string | null
  templateId: string
  styleCss: string
  bodyHtml: string
  publishedAt: string | null
}

const COLLECTION = 'publishedArticles'

function toPost(data: FirebaseFirestore.DocumentData): BlogPost {
  return {
    slug: data.slug,
    title: data.title,
    dek: data.dek,
    category: data.category,
    readTimeMinutes: data.readTimeMinutes ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    coverImageAlt: data.coverImageAlt ?? null,
    templateId: data.templateId,
    styleCss: data.styleCss ?? '',
    bodyHtml: data.bodyHtml ?? '',
    // Firestore Timestamp -> ISO, so the value survives into a client component.
    publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? null,
  }
}

/** Newest first. Used by the feed and the sitemap. */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  const snapshot = await blogDb().collection(COLLECTION).orderBy('publishedAt', 'desc').get()
  return snapshot.docs.map((doc) => toPost(doc.data()))
}

/** Feed-sized fields only — skips the article body, which the index never shows. */
export async function listPublishedSummaries(): Promise<Omit<BlogPost, 'styleCss' | 'bodyHtml'>[]> {
  const posts = await listPublishedPosts()
  return posts.map(({ styleCss: _css, bodyHtml: _body, ...summary }) => summary)
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const doc = await blogDb().collection(COLLECTION).doc(slug).get()
  return doc.exists ? toPost(doc.data()!) : null
}
