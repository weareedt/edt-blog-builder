import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArticleInteractions from '@/components/blog/ArticleInteractions'
import { getPublishedPost, listPublishedSummaries } from '@/lib/blog'

export const revalidate = 300

const ARTICLE_CONTAINER_ID = 'edt-article-root'

export async function generateStaticParams() {
  const posts = await listPublishedSummaries()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug)
  if (!post) return { title: 'Article not found | EDT' }

  return {
    title: `${post.title} | EDT`,
    description: post.dek,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.dek,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPublishedPost(slug)
  if (!post) notFound()

  return (
    <main className="bg-edt-black text-white">
      {/*
        The article's own CSS, already scoped to .edt-article by the builder,
        so it can't reach the rest of the page and Tailwind can't reach into
        it. See scopeArticleCss in the blog builder.
      */}
      <style dangerouslySetInnerHTML={{ __html: post.styleCss }} />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 pt-10">
        <Link href="/blog" className="text-edt-grey text-sm hover:text-white transition-colors">
          ← Back to Blog
        </Link>
      </div>

      {/*
        The article markup. It arrives without <script> tags — injected markup
        never runs them — so ArticleInteractions re-implements the behaviour.
      */}
      <div
        id={ARTICLE_CONTAINER_ID}
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
      <ArticleInteractions containerId={ARTICLE_CONTAINER_ID} />

      <section className="bg-edt-blue py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20 text-center">
          <h2 className="display-lg font-display uppercase text-white mb-6">
            Build Your Next Immersive Experience
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
            EDT delivers AR, VR, AI and interactive installation projects across Malaysia and
            Southeast Asia. Let&apos;s talk about yours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-secondary border-white text-white">
              Get in Touch
            </Link>
            <Link href="/blog" className="btn-ghost border-white text-white">
              More Articles
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
