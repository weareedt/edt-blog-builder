'use client'

import { useEffect } from 'react'

/**
 * Restores the interactive parts of a published article.
 *
 * The article's markup is injected into the page, and injected markup never
 * runs its own <script> tags — so the builder strips them at publish time and
 * this component does the same work in React instead. It is a faithful port
 * of the scripts in templates/annotated/*: same selectors, same classes, same
 * thresholds, same reduced-motion behaviour.
 *
 *   reading progress   #progressBar width tracks scroll (scroll templates)
 *   scroll reveals     [data-reveal] gets .revealed once, when it comes into view
 *   table of contents  #tocList links highlight the section in view, and
 *                      scroll to it smoothly; #tocProgress tracks position
 *   roundup entries    [data-entry] gets .is-playing while on screen
 *   flip cards         .flip-card toggles .flipped on click, Enter or Space
 *
 * Everything is queried inside the article container, so nothing here can
 * touch the rest of the site.
 */
export default function ArticleInteractions({ containerId }: { containerId: string }) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cleanups: Array<() => void> = []

    // ---- reading progress (templates 02 and 04) ----
    const progressBar = root.querySelector<HTMLElement>('#progressBar')
    if (progressBar) {
      const update = () => {
        const doc = document.documentElement
        const max = doc.scrollHeight - doc.clientHeight
        progressBar.style.width = `${max > 0 ? (doc.scrollTop / max) * 100 : 0}%`
      }
      document.addEventListener('scroll', update, { passive: true })
      update()
      cleanups.push(() => document.removeEventListener('scroll', update))
    }

    // ---- scroll reveals ----
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (reduceMotion) {
      reveals.forEach((el) => el.classList.add('revealed'))
    } else if (reveals.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          })
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
      )
      reveals.forEach((el) => observer.observe(el))
      cleanups.push(() => observer.disconnect())
    }

    // ---- table of contents (template 03) ----
    const tocLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('#tocList a'))
    if (tocLinks.length > 0) {
      const setActive = (id: string) => {
        tocLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`))
      }

      const onClick = (event: Event) => {
        const link = event.currentTarget as HTMLAnchorElement
        const href = link.getAttribute('href')
        const target = href ? root.querySelector<HTMLElement>(href) : null
        if (!target) return
        event.preventDefault()
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
        setActive(target.id)
      }
      tocLinks.forEach((link) => link.addEventListener('click', onClick))
      cleanups.push(() => tocLinks.forEach((link) => link.removeEventListener('click', onClick)))

      const sections = tocLinks
        .map((link) => {
          const href = link.getAttribute('href')
          return href ? root.querySelector<HTMLElement>(href) : null
        })
        .filter((section): section is HTMLElement => section !== null)

      if (!reduceMotion && sections.length > 0) {
        const spy = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) setActive(entry.target.id)
            })
          },
          { rootMargin: '-15% 0px -70% 0px' }
        )
        sections.forEach((section) => spy.observe(section))
        cleanups.push(() => spy.disconnect())
      }

      const tocProgress = root.querySelector<HTMLElement>('#tocProgress')
      if (tocProgress) {
        const update = () => {
          const doc = document.documentElement
          const max = doc.scrollHeight - doc.clientHeight
          tocProgress.style.width = `${max > 0 ? (doc.scrollTop / max) * 100 : 0}%`
        }
        document.addEventListener('scroll', update, { passive: true })
        update()
        cleanups.push(() => document.removeEventListener('scroll', update))
      }
    }

    // ---- roundup entries (template 01) ----
    const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-entry]'))
    if (!reduceMotion && entries.length > 0) {
      const observer = new IntersectionObserver(
        (items) => {
          items.forEach((item) => item.target.classList.toggle('is-playing', item.isIntersecting))
        },
        { threshold: 0.4 }
      )
      entries.forEach((entry) => observer.observe(entry))
      cleanups.push(() => observer.disconnect())
    }

    // ---- flip cards ----
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.flip-card'))
    const onCardClick = (event: Event) => (event.currentTarget as HTMLElement).classList.toggle('flipped')
    const onCardKey = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
      keyboardEvent.preventDefault()
      ;(event.currentTarget as HTMLElement).classList.toggle('flipped')
    }
    cards.forEach((card) => {
      card.addEventListener('click', onCardClick)
      card.addEventListener('keydown', onCardKey)
    })
    cleanups.push(() =>
      cards.forEach((card) => {
        card.removeEventListener('click', onCardClick)
        card.removeEventListener('keydown', onCardKey)
      })
    )

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [containerId])

  return null
}
