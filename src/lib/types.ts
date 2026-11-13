export type Platform = 'Instagram' | 'TikTok' | 'LinkedIn'
export const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'LinkedIn']

export type ContentType = 'photos' | 'animation' | 'ai' | 'ugc'

export interface Brand {
  website: string
  name: string
  audience: string
  sells: string
  problems: string[]
  messages: string[]
  voice: string[]
}

/** Where the idea for a post came from. */
export type Source =
  | { kind: 'idea'; text: string; link: string }
  | { kind: 'trend'; trendId: string }

/** One version of a post. Which fields are used depends on the content type. */
export interface Version {
  hook: string
  caption: string
  hashtags: string
  /** photos: one entry per slide. animation / ugc: one entry per shot. */
  parts: string[]
  /** ai: the script the presenter reads. ugc: the brief for the creator. */
  script: string
}

export type CreatorStatus = 'Not sent' | 'Sent to creator' | 'Filming' | 'Ready to review'

export interface Post {
  id: string
  title: string
  type: ContentType
  source: Source
  versions: Version[]
  picked: number
  platforms: Platform[]
  status: 'draft' | 'scheduled'
  /** ISO date-time, set when scheduled. */
  when: string | null
  presenter: string
  voice: string
  creatorStatus: CreatorStatus
  createdAt: string
}

export interface Trend {
  id: string
  title: string
  handle: string
  overlay: string
  platform: Platform
  length: string
  views: string
  likes: string
  shares: string
  growth: string
  fit: boolean
  color: string
  /** Suggested content type when remaking this trend. */
  suggestedType: ContentType
}

export const TYPE_INFO: Record<ContentType, { title: string; what: string; tag: string; color: string; mark: string }> = {
  photos: { title: 'Photos & carousels', what: 'We design the images and slides. You change the words and order.', tag: 'No filming', color: 'var(--yellow)', mark: 'P' },
  animation: { title: 'Animation', what: 'An animated video made from your script and brand look.', tag: 'No filming', color: 'var(--green)', mark: 'A' },
  ai: { title: 'AI influencer', what: 'An AI presenter says your script on camera. Pick a face and a voice.', tag: 'No filming', color: 'var(--pink)', mark: 'AI' },
  ugc: { title: 'Real creator (UGC)', what: 'We send a brief to a real person. They film it, you approve it.', tag: 'A real person films it', color: 'var(--blue)', mark: 'R' },
}

export const PLATFORM_COLOR: Record<Platform, string> = {
  Instagram: 'var(--yellow)',
  TikTok: 'var(--pink)',
  LinkedIn: 'var(--blue)',
}
