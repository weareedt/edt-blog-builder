import type { Metadata } from 'next'
import Link from 'next/link'
import FormspreeForm from '@/components/FormspreeForm'
import { listPublishedSummaries } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog | EDT',
  description:
    'Insights, case studies and guides on AR, VR, MR, AI avatars and immersive experience design in Malaysia — from the team that builds them.',
  alternates: {
    canonical: '/blog',
    languages: { 'en-MY': '/blog', 'x-default': '/blog' },
  },
}

// Published articles change rarely; serve from cache and re-check every
// 5 minutes so publishing shows up without a redeploy.
export const revalidate = 300

const CATEGORY_COLOUR: Record<string, string> = {
  Guides: 'text-edt-blue',
  'Case Studies': 'text-green-400',
  Products: 'text-purple-400',
  Insights: 'text-pink-400',
}

export default async function BlogPage() {
  const posts = await listPublishedSummaries()

  return (
    <main className="bg-edt-black text-white">
      {/* HERO */}
      <section className="bg-edt-black pt-20 pb-24 lg:pt-28 lg:pb-32 border-b border-white/10 pixel-grid">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
          <span className="edt-badge mb-6 inline-block">EDT Blog</span>
          <h1 className="display-xl font-display uppercase mb-6">
            Insights, Case Studies &amp; The Work Behind It
          </h1>
          <p className="text-xl text-edt-grey max-w-2xl leading-relaxed">
            Guides for planning immersive activations, breakdowns of what we actually shipped, and
            what we&apos;ve learned building AR, VR and interactive experiences across Malaysia.
          </p>
        </div>
      </section>

      {/* POSTS */}
      <section className="bg-edt-black py-20 lg:py-24 border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
          <div className="flex items-end justify-between gap-6 mb-12">
            <h2 className="display-md font-display uppercase">Latest</h2>
            {posts.length > 0 && (
              <span className="text-edt-grey text-sm">
                {posts.length} {posts.length === 1 ? 'article' : 'articles'}
              </span>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="bg-surface border border-white/10 p-10 lg:p-14 max-w-2xl">
              <h3 className="display-sm font-display uppercase mb-4">Coming Soon</h3>
              <p className="text-edt-grey leading-relaxed">
                We&apos;re putting the finishing touches on the first articles. Subscribe below and
                we&apos;ll send them the day they go live.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="bg-surface border border-white/10 hover:border-edt-blue transition-colors group flex flex-col"
                >
                  {post.coverImageUrl && (
                    // Deliberately a plain <img>: these are Firebase Storage URLs,
                    // and next/image would need that host allow-listed in
                    // next.config.ts. Swap it in there if you'd rather optimise.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt={post.coverImageAlt ?? ''}
                      className="w-full aspect-[16/10] object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-8 flex flex-col flex-1">
                    <span
                      className={`text-xs uppercase tracking-widest font-semibold mb-4 block ${
                        CATEGORY_COLOUR[post.category] ?? 'text-edt-blue'
                      }`}
                    >
                      {post.category}
                    </span>
                    <h3 className="text-white font-semibold text-lg leading-tight mb-3 group-hover:text-edt-blue transition-colors">
                      {post.title}
                    </h3>
                    <p className="font-sans text-[14px] text-edt-grey leading-relaxed mb-6 line-clamp-3">
                      {post.dek}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-xs text-edt-grey">
                      <span>{post.readTimeMinutes ? `${post.readTimeMinutes} min read` : 'Read'}</span>
                      <span className="text-edt-blue">↗</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-surface py-24 border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="display-md font-display uppercase mb-6">Stay in the Loop</h2>
              <p className="text-edt-grey text-lg leading-relaxed">
                New case studies, guides, and what we&apos;re watching — straight to your inbox,
                roughly twice a month.
              </p>
            </div>
            <div>
              <FormspreeForm
                endpoint="https://formspree.io/f/xqenejyp"
                thankYouType="newsletter"
                className="flex gap-0"
              >
                <input type="hidden" name="_subject" value="New newsletter subscriber — EDT" />
                <input
                  type="text"
                  name="_gotcha"
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 bg-edt-black border border-white/20 text-white px-6 py-4 text-sm placeholder:text-edt-grey focus:outline-none focus:border-edt-blue"
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  Subscribe
                </button>
              </FormspreeForm>
              <p className="text-edt-grey text-xs mt-3">No spam. Unsubscribe any time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-edt-blue py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20 text-center">
          <h2 className="display-lg font-display uppercase text-white mb-6">
            Ready to Build Something?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
            Reading about immersive tech is one thing. Deploying it for your brand, event, or
            institution is another. Let&apos;s talk about your project.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-secondary border-white text-white">
              Get in Touch
            </Link>
            <Link href="/work" className="btn-ghost border-white text-white">
              View Our Work
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
