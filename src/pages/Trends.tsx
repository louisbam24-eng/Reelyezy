import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TRENDS } from '../lib/mockData'
import { PLATFORMS } from '../lib/types'
import type { Platform } from '../lib/types'
import { PlayIcon } from '../components/Icons'

export default function Trends() {
  const [platform, setPlatform] = useState<'All' | Platform>('All')
  const [fitOnly, setFitOnly] = useState(false)
  const [q, setQ] = useState('')

  const shown = TRENDS.filter(
    (t) =>
      (platform === 'All' || t.platform === platform) &&
      (!fitOnly || t.fit) &&
      (!q.trim() || (t.title + ' ' + t.handle).toLowerCase().includes(q.trim().toLowerCase())),
  )

  return (
    <>
      <header className="spread" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1>What's trending</h1>
          <p className="muted" style={{ margin: 0, fontSize: 18 }}>The videos taking off right now.</p>
        </div>
        <div>
          <label htmlFor="q" className="sr-only">Search trends</label>
          <input id="q" className="input" style={{ width: 260 }} placeholder="Search trends" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <div className="filters">
        <div role="group" aria-label="Platform" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['All', ...PLATFORMS] as const).map((p) => (
            <button key={p} className="pill" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{p}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={fitOnly} onChange={() => setFitOnly(!fitOnly)} style={{ width: 22, height: 22, accentColor: 'var(--ink)' }} />
          Only good fits for my brand
        </label>
      </div>

      {shown.length === 0 && <div className="loading">Nothing here. Try another filter.</div>}

      <div className="trend-grid">
        {shown.map((t) => (
          <article className="trend" key={t.id}>
            <div className="trend-thumb" style={{ background: t.color }}>
              <span className="thumb-chip" style={{ left: 14, background: 'var(--white)', border: '2px solid var(--ink)' }}>{t.platform}</span>
              <span className="thumb-chip" style={{ right: 14, background: 'var(--ink)', color: 'var(--white)' }}>{t.growth}</span>
              <span className="play" aria-hidden="true"><PlayIcon /></span>
              <span className="overlay-text">{t.overlay}</span>
              <span className="length">{t.length}</span>
            </div>
            <div className="trend-body">
              <div>
                <h2 style={{ fontFamily: 'inherit', fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{t.title}</h2>
                <span className="muted" style={{ fontSize: 14 }}>{t.handle}</span>
              </div>
              <div className="mini-stats">
                <div><b>{t.views}</b>Views</div>
                <div><b>{t.likes}</b>Likes</div>
                <div><b>{t.shares}</b>Shares</div>
              </div>
              <Link className="btn primary" style={{ marginTop: 'auto' }} to={`/new?trend=${t.id}`}>Remake this</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
