// Fake data for V1. Swap these out for real trend and analytics sources later.
import type { Brand, Trend } from './types'

export const TRENDS: Trend[] = [
  { id: 't1', title: 'POV: you open the café at 6am', handle: '@thecornerbrew', overlay: 'POV: 6am open', platform: 'TikTok', length: '0:14', views: '2.1M', likes: '310k', shares: '18k', growth: '↑ 340%', fit: true, color: 'var(--orange)', suggestedType: 'ugc' },
  { id: 't2', title: '3 mistakes ruining your home coffee', handle: '@beanscience', overlay: '3 mistakes →', platform: 'Instagram', length: '8 slides', views: '840k', likes: '96k', shares: '41k', growth: '↑ 210%', fit: true, color: 'var(--yellow)', suggestedType: 'photos' },
  { id: 't3', title: 'Day in the life of a coffee roaster', handle: '@roastedbyrae', overlay: 'Day in the life', platform: 'TikTok', length: '0:42', views: '1.4M', likes: '188k', shares: '9k', growth: '↑ 175%', fit: true, color: 'var(--green)', suggestedType: 'ugc' },
  { id: 't4', title: 'This or that: oat or whole milk?', handle: '@dailygrind.co', overlay: 'This or that?', platform: 'Instagram', length: '0:09', views: '520k', likes: '44k', shares: '6k', growth: '↑ 120%', fit: true, color: 'var(--blue)', suggestedType: 'animation' },
  { id: 't5', title: 'Before and after: shop makeover', handle: '@smallbizglowup', overlay: 'Before → After', platform: 'TikTok', length: '0:21', views: '3.6M', likes: '420k', shares: '35k', growth: '↑ 95%', fit: false, color: 'var(--pink)', suggestedType: 'ugc' },
  { id: 't6', title: 'Unpopular opinion about loyalty cards', handle: '@retailtalks', overlay: 'Unpopular opinion', platform: 'LinkedIn', length: 'Text post', views: '96k', likes: '3.2k', shares: '410', growth: '↑ 80%', fit: false, color: 'var(--blue-soft)', suggestedType: 'photos' },
  { id: 't7', title: 'Asking customers to rate our new drink', handle: '@sipandsay', overlay: 'Rate it 1–10', platform: 'TikTok', length: '0:27', views: '980k', likes: '120k', shares: '12k', growth: '↑ 260%', fit: true, color: 'var(--yellow-soft)', suggestedType: 'ai' },
  { id: 't8', title: 'How we pack 500 orders a day', handle: '@packedwithlove', overlay: '500 orders', platform: 'Instagram', length: '0:33', views: '670k', likes: '58k', shares: '7k', growth: '↑ 70%', fit: false, color: 'var(--green-soft)', suggestedType: 'animation' },
]

export const WEEK_STATS = {
  views: '12.4k',
  likes: '860',
  followers: '+64',
  viewsByDay: [30, 55, 42, 68, 80, 100, 60],
}

/** Suggested posting times for empty days (Mon = 0). */
export const BEST_TIMES: Record<number, string> = { 0: '08:00', 3: '12:00', 6: '11:00' }

export const EMPTY_BRAND: Brand = {
  website: '',
  name: '',
  audience: '',
  sells: '',
  problems: [''],
  messages: [''],
  voice: [],
}

export const DEMO_BRAND: Brand = {
  website: 'bloomcoffee.example',
  name: 'Bloom Coffee Co.',
  audience: 'Busy locals who love good coffee',
  sells: 'Coffee, fresh beans and a monthly bean subscription',
  problems: [
    'Café coffee is pricey for a daily habit',
    'Brewing at home feels complicated',
    'Hard to know if beans are fairly sourced',
  ],
  messages: [
    'Fresh beans, roasted down the road every week',
    'Great coffee at home doesn’t need fancy kit',
    'We know our farmers by name and pay them fairly',
  ],
  voice: ['Warm', 'Playful', 'Down to earth'],
}

export const VOICES = ['Warm', 'Playful', 'Bold', 'Calm', 'Expert', 'Cheeky', 'Down to earth', 'Inspiring']
export const PRESENTERS = ['Maya', 'Leo', 'Priya', 'Sam']
export const AI_VOICES = ['Friendly', 'Energetic', 'Calm', 'Matter-of-fact']
