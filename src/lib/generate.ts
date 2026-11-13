/**
 * Post writer — STAND-IN VERSION.
 *
 * This file is the one place to plug in real AI later. Everything else in the
 * app calls `writePost` and `nudgeVersion` and waits for the result, so swapping
 * these two functions for real AI calls (for example to Claude) needs no other
 * changes.
 *
 * For now it fills simple templates with the brand profile.
 */
import type { Brand, ContentType, Source, Version } from './types'
import { TRENDS } from './mockData'

export type Nudge = 'Shorter' | 'Funnier' | 'More about price' | 'Add a call to action' | string

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const pick = <T,>(list: T[], i: number): T => list[i % list.length]

function clean(list: string[], fallback: string[]): string[] {
  const out = list.map((s) => s.trim()).filter(Boolean)
  return out.length ? out : fallback
}

function topicOf(source: Source): string {
  if (source.kind === 'trend') {
    return TRENDS.find((t) => t.id === source.trendId)?.title ?? 'a trending post'
  }
  return source.text.trim() || 'your idea'
}

function tagsFor(brand: Brand): string {
  const name = brand.name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'yourbrand'
  return `#${name} #smallbusiness #behindthescenes`
}

export async function writePost(brand: Brand, source: Source, type: ContentType): Promise<Version[]> {
  await wait(700)
  const name = brand.name.trim() || 'your brand'
  const problems = clean(brand.problems, ['the problem your customers have'])
  const messages = clean(brand.messages, ['what makes you different'])
  const topic = topicOf(source)
  const tags = tagsFor(brand)

  return [0, 1, 2].map((i) => {
    const problem = pick(problems, i)
    const message = pick(messages, i)
    const hooks = [
      `POV: ${problem.charAt(0).toLowerCase() + problem.slice(1)} — and then you find ${name}`,
      `Stop scrolling if ${problem.charAt(0).toLowerCase() + problem.slice(1)}`,
      `The thing nobody tells you about ${topic.toLowerCase()}`,
    ]
    const hook = hooks[i]
    const caption = `${message}. ${i === 0 ? 'Come and see for yourself.' : i === 1 ? 'Save this for later.' : 'Tell us what you think below.'}`

    switch (type) {
      case 'photos':
        return {
          hook,
          caption,
          hashtags: tags,
          parts: [hook, `The problem: ${problem}`, `What we do: ${message}`, `Why it matters to you`, `Follow ${name} for more`],
          script: '',
        }
      case 'animation':
        return {
          hook,
          caption,
          hashtags: tags,
          parts: [`Big text on screen: “${hook}”`, `Simple drawing showing: ${problem}`, `Logo pops in with: ${message}`, `End card: Follow ${name}`],
          script: '',
        }
      case 'ai':
        return {
          hook,
          caption,
          hashtags: tags,
          parts: [],
          script: `${hook}. Here’s the thing — ${problem.toLowerCase()}. At ${name}, ${message.charAt(0).toLowerCase() + message.slice(1)}. Follow for more.`,
        }
      case 'ugc':
        return {
          hook,
          caption,
          hashtags: tags,
          parts: ['Open on your face, say the hook straight to camera', `Show the problem: ${problem}`, `Show ${name} in action`, 'End with a genuine reaction'],
          script: `Film a 15–30 second vertical video about ${topic.toLowerCase()}. Keep it natural and unscripted. Mention: ${message}. Tone: ${clean(brand.voice, ['friendly']).join(', ').toLowerCase()}.`,
        }
    }
  })
}

export async function nudgeVersion(v: Version, nudge: Nudge, brand: Brand): Promise<Version> {
  await wait(500)
  const name = brand.name.trim() || 'us'
  const shorten = (s: string) => {
    const first = s.split(/(?<=[.!?])\s/)[0]
    return first.length < s.length ? first : s.split(' ').slice(0, Math.max(6, Math.ceil(s.split(' ').length * 0.6))).join(' ')
  }
  switch (nudge) {
    case 'Shorter':
      return { ...v, hook: shorten(v.hook), caption: shorten(v.caption), script: shorten(v.script), parts: v.parts.slice(0, Math.max(2, v.parts.length - 1)) }
    case 'Funnier':
      return { ...v, hook: `${v.hook} (we’re not crying, you’re crying)`, caption: `${v.caption} ☕️😅` }
    case 'More about price':
      return { ...v, caption: `${v.caption} Better value than you’d think — check our prices.` }
    case 'Add a call to action':
      return { ...v, caption: `${v.caption} Tap the link in our bio to try ${name}.` }
    default:
      return { ...v, caption: `${v.caption} (${nudge})` }
  }
}

/** Stand-in for reading a website. Returns a few starter details. */
export async function readWebsite(url: string): Promise<{ name: string; sells: string }> {
  await wait(800)
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/.]/)[0] || 'brand'
  const name = host.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return { name, sells: '' }
}
