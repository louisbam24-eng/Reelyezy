/**
 * App data, saved in the browser for V1.
 * To move to a real server later, keep this hook's shape and change how it loads and saves.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Brand, Post } from './types'
import { DEMO_BRAND, EMPTY_BRAND } from './mockData'
import { addDays, atTime, startOfWeek } from './dates'

const KEY = 'reelyezy:v1'

interface Data {
  brand: Brand
  posts: Post[]
}

interface Store extends Data {
  saveBrand: (b: Brand) => void
  addPost: (p: Post) => void
  updatePost: (id: string, patch: Partial<Post>) => void
  deletePost: (id: string) => void
  loadDemo: () => void
  clearAll: () => void
}

export const newId = () => Math.random().toString(36).slice(2, 10)

function demoPost(title: string, type: Post['type'], platform: Post['platforms'][number], day: number | null, time: string, hook: string, caption: string): Post {
  const monday = startOfWeek(new Date())
  return {
    id: newId(),
    title,
    type,
    source: { kind: 'idea', text: title, link: '' },
    versions: [{ hook, caption, hashtags: '#bloomcoffee #smallbusiness', parts: type === 'photos' ? [hook, 'Mistake 1: old beans', 'Mistake 2: wrong grind', 'Mistake 3: boiling water', 'Follow for more'] : ['Opening shot', 'Show the problem', 'Show the fix', 'End card'], script: '' }],
    picked: 0,
    platforms: [platform],
    status: day === null ? 'draft' : 'scheduled',
    when: day === null ? null : atTime(addDays(monday, day), time).toISOString(),
    presenter: 'Maya',
    voice: 'Friendly',
    creatorStatus: 'Not sent',
    createdAt: new Date().toISOString(),
  }
}

function demoData(): Data {
  return {
    brand: DEMO_BRAND,
    posts: [
      demoPost('3 mistakes when brewing at home', 'photos', 'Instagram', 1, '09:00', '3 mistakes you’re making with your home coffee', 'Freshness is everything. Save this for your next brew.'),
      demoPost('POV: first coffee of the morning', 'ugc', 'TikTok', 2, '12:30', 'POV: the first coffee of the morning hits different', 'Some mornings start before the sun does.'),
      demoPost('Why we pay our farmers more', 'photos', 'LinkedIn', 3, '18:00', 'Why we pay our farmers more than we have to', 'We know our farmers by name. Here’s why that matters.'),
      demoPost('Weekend menu drop', 'animation', 'Instagram', 4, '17:00', 'New on the menu this weekend', 'Three new drinks. One very good weekend.'),
      demoPost('A day in the life of our roaster', 'ugc', 'TikTok', 5, '10:00', 'A day in the life of a coffee roaster', 'From green beans to your cup.'),
      demoPost('This or that: oat or whole?', 'animation', 'Instagram', null, '', 'This or that: oat or whole milk?', 'Vote in our story!'),
      demoPost('Before and after: our new grinder', 'ugc', 'TikTok', null, '', 'Before and after: our new grinder', 'The difference is wild.'),
    ],
  }
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Data
  } catch {
    /* ignore and fall back to demo data */
  }
  return demoData()
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [data])

  const saveBrand = useCallback((brand: Brand) => setData((d) => ({ ...d, brand })), [])
  const addPost = useCallback((p: Post) => setData((d) => ({ ...d, posts: [...d.posts, p] })), [])
  const updatePost = useCallback(
    (id: string, patch: Partial<Post>) => setData((d) => ({ ...d, posts: d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    [],
  )
  const deletePost = useCallback((id: string) => setData((d) => ({ ...d, posts: d.posts.filter((p) => p.id !== id) })), [])
  const loadDemo = useCallback(() => setData(demoData()), [])
  const clearAll = useCallback(() => setData({ brand: EMPTY_BRAND, posts: [] }), [])

  const value = useMemo(
    () => ({ ...data, saveBrand, addPost, updatePost, deletePost, loadDemo, clearAll }),
    [data, saveBrand, addPost, updatePost, deletePost, loadDemo, clearAll],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}
