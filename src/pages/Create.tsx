import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PLATFORMS, TYPE_INFO } from '../lib/types'
import type { CreatorStatus, Post, Version } from '../lib/types'
import { AI_VOICES, PRESENTERS, TRENDS } from '../lib/mockData'
import { nudgeVersion, writePost } from '../lib/generate'
import { addDays, atTime, dateInput, timeOf } from '../lib/dates'
import { BackIcon, CalendarIcon, XIcon } from '../components/Icons'
import { useToast } from '../components/Toast'

const NUDGES = ['Shorter', 'Funnier', 'More about price', 'Add a call to action']
const CREATOR_STEPS: CreatorStatus[] = ['Not sent', 'Sent to creator', 'Filming', 'Ready to review']

export default function Create() {
  const { id } = useParams()
  const { posts } = useStore()
  const post = posts.find((p) => p.id === id)
  if (!post) {
    return (
      <div className="stack">
        <h1>Post not found</h1>
        <Link className="btn" style={{ alignSelf: 'flex-start' }} to="/new">Start a new post</Link>
      </div>
    )
  }
  return <Editor key={post.id} post={post} />
}

function PartsEditor({ label, parts, onChange }: { label: string; parts: string[]; onChange: (p: string[]) => void }) {
  return (
    <>
      <div className="parts">
        {parts.map((text, i) => (
          <div className="part" key={i} style={{ background: ['var(--yellow-soft)', 'var(--green-soft)', 'var(--pink-soft)', 'var(--blue-soft)'][i % 4] }}>
            <div className="part-head">
              <span>{label} {i + 1}</span>
              {parts.length > 1 && (
                <button className="x" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(parts.filter((_, j) => j !== i))}><XIcon /></button>
              )}
            </div>
            <textarea aria-label={`${label} ${i + 1}`} value={text} onChange={(e) => onChange(parts.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
        ))}
      </div>
      <button className="btn dashed small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...parts, ''])}>+ Add {label.toLowerCase()}</button>
    </>
  )
}

function Editor({ post }: { post: Post }) {
  const { brand, updatePost, deletePost } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [ask, setAsk] = useState('')
  const [toast, show] = useToast()
  const initial = post.when ? new Date(post.when) : atTime(addDays(new Date(), 1), '12:00')
  const [day, setDay] = useState(dateInput(initial))
  const [time, setTime] = useState(timeOf(initial))

  const v = post.versions[post.picked]
  const info = TYPE_INFO[post.type]
  const set = (patch: Partial<Post>) => updatePost(post.id, patch)
  const setV = (patch: Partial<Version>) => set({ versions: post.versions.map((x, i) => (i === post.picked ? { ...x, ...patch } : x)) })
  const trend = post.source.kind === 'trend' ? TRENDS.find((t) => t.id === (post.source as { trendId: string }).trendId) : null

  async function nudge(n: string) {
    if (!n.trim()) return
    setBusy(n)
    const next = await nudgeVersion(v, n, brand)
    setV(next)
    setBusy(null)
    setAsk('')
  }

  async function rewrite() {
    setBusy('rewrite')
    const versions = await writePost(brand, post.source, post.type)
    set({ versions, picked: 0 })
    setBusy(null)
  }

  function schedule() {
    if (!post.platforms.length) return show('Pick at least one platform')
    const when = atTime(new Date(day + 'T00:00'), time)
    set({ status: 'scheduled', when: when.toISOString() })
    navigate('/schedule', { state: { week: when.toISOString() } })
  }

  return (
    <>
      <header className="spread" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 8, flex: '1 1 400px', minWidth: 0 }}>
          <Link to={trend ? '/trends' : '/schedule'} style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BackIcon size={18} /> {trend ? `Trends / ${trend.title}` : 'Back to schedule'}
          </Link>
          <label htmlFor="title" className="sr-only">Post name</label>
          <input id="title" value={post.title} onChange={(e) => set({ title: e.target.value })} style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 40, border: 'none', background: 'transparent', padding: 0, width: '100%' }} />
          <span><span className="tag" style={{ background: info.color, border: '1.5px solid var(--ink)' }}>{info.title}</span> {post.status === 'scheduled' && <span className="tag" style={{ background: 'var(--green)' }}>Scheduled</span>}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => confirm('Delete this post?') && (deletePost(post.id), navigate('/schedule'))}>Delete</button>
          <button className="btn" onClick={() => { set({ status: 'draft', when: null }); show('Saved as a draft') }}>Save draft</button>
        </div>
      </header>

      <div className="row" style={{ gap: 28 }}>
        <div className="stack" style={{ flex: '3 1 520px', minWidth: 0, gap: 20 }}>
          <div className="spread">
            <div role="group" aria-label="Pick a version" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {post.versions.map((_, i) => (
                <button key={i} className="pill" aria-pressed={i === post.picked} onClick={() => set({ picked: i })}>Version {String.fromCharCode(65 + i)}</button>
              ))}
            </div>
            <button className="btn small" disabled={!!busy} onClick={rewrite}>{busy === 'rewrite' ? 'Writing…' : 'Write new versions'}</button>
          </div>

          {post.type === 'ai' && (
            <section className="card stack" aria-labelledby="pres">
              <h2 id="pres" className="section-label">Presenter</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {PRESENTERS.map((p) => (
                  <button key={p} className="pill warm" aria-pressed={post.presenter === p} onClick={() => set({ presenter: p })}>{p}</button>
                ))}
              </div>
              <div className="field" style={{ maxWidth: 280 }}>
                <label htmlFor="voice">Voice</label>
                <select id="voice" className="input" value={post.voice} onChange={(e) => set({ voice: e.target.value })}>
                  {AI_VOICES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
            </section>
          )}

          <section className="card stack" aria-labelledby="hook">
            <h2 id="hook" className="section-label">{post.type === 'photos' ? 'Headline' : 'The hook · first 2 seconds'}</h2>
            <textarea aria-labelledby="hook" className="input" rows={2} style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }} value={v.hook} onChange={(e) => setV({ hook: e.target.value })} />
          </section>

          {post.type === 'photos' && (
            <section className="card stack" aria-labelledby="slides">
              <h2 id="slides" className="section-label">Slides</h2>
              <PartsEditor label="Slide" parts={v.parts} onChange={(parts) => setV({ parts })} />
            </section>
          )}

          {post.type === 'animation' && (
            <section className="card stack" aria-labelledby="scenes">
              <h2 id="scenes" className="section-label">Scenes</h2>
              <PartsEditor label="Scene" parts={v.parts} onChange={(parts) => setV({ parts })} />
            </section>
          )}

          {post.type === 'ai' && (
            <section className="card stack" aria-labelledby="script">
              <h2 id="script" className="section-label">What {post.presenter} says</h2>
              <textarea aria-labelledby="script" className="input" rows={5} value={v.script} onChange={(e) => setV({ script: e.target.value })} />
            </section>
          )}

          {post.type === 'ugc' && (
            <>
              <section className="card stack" aria-labelledby="brief">
                <h2 id="brief" className="section-label">Brief for the creator</h2>
                <textarea aria-labelledby="brief" className="input" rows={4} value={v.script} onChange={(e) => setV({ script: e.target.value })} />
              </section>
              <section className="card stack" aria-labelledby="shots">
                <h2 id="shots" className="section-label">Shots to film</h2>
                <PartsEditor label="Shot" parts={v.parts} onChange={(parts) => setV({ parts })} />
              </section>
              <section className="card stack" aria-labelledby="creator">
                <h2 id="creator" className="section-label">Creator</h2>
                <div className="status-track">
                  {CREATOR_STEPS.map((s, i) => (
                    <span key={s} className={i <= CREATOR_STEPS.indexOf(post.creatorStatus) ? 'done' : ''}>{s}</span>
                  ))}
                </div>
                {post.creatorStatus !== 'Ready to review' && (
                  <button
                    className="btn dark"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => set({ creatorStatus: CREATOR_STEPS[CREATOR_STEPS.indexOf(post.creatorStatus) + 1] })}
                  >
                    {post.creatorStatus === 'Not sent' ? 'Send brief to a creator' : 'Mark next step (demo)'}
                  </button>
                )}
              </section>
            </>
          )}

          <section className="card stack" aria-labelledby="cap">
            <h2 id="cap" className="section-label">Caption</h2>
            <textarea aria-labelledby="cap" className="input" rows={3} value={v.caption} onChange={(e) => setV({ caption: e.target.value })} />
            <label htmlFor="tags" className="sr-only">Hashtags</label>
            <input id="tags" className="input" value={v.hashtags} onChange={(e) => setV({ hashtags: e.target.value })} />
          </section>

          <section className="card lift stack" style={{ background: 'var(--yellow)', gap: 14 }} aria-labelledby="nudge">
            <h2 id="nudge">Give it a nudge</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {NUDGES.map((n) => (
                <button key={n} className="pill" disabled={!!busy} aria-pressed={false} onClick={() => nudge(n)}>{busy === n ? '…' : n}</button>
              ))}
            </div>
            <form style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); nudge(ask) }}>
              <label htmlFor="ask" className="sr-only">Ask for a change</label>
              <input id="ask" className="input" style={{ flex: '1 1 260px', width: 'auto' }} placeholder="Or tell us what to change…" value={ask} onChange={(e) => setAsk(e.target.value)} />
              <button className="btn dark" disabled={!!busy || !ask.trim()}>Redo it</button>
            </form>
          </section>
        </div>

        <aside className="stack" style={{ flex: '1 1 320px', minWidth: 0, alignItems: 'center', gap: 20 }} aria-label="Preview and schedule">
          <b>Preview</b>
          <div className="phone">
            <div className="phone-screen" style={{ background: info.color }}>
              {post.type === 'ai' && <span className="thumb-chip" style={{ left: 14, background: 'var(--white)', border: '2px solid var(--ink)' }}>AI · {post.presenter}</span>}
              {post.type === 'ugc' && <span className="thumb-chip" style={{ left: 14, background: 'var(--white)', border: '2px solid var(--ink)' }}>Creator video</span>}
              <p className="phone-hook">{post.type === 'photos' ? v.parts[0] || v.hook : v.hook}</p>
              {post.type === 'photos' && (
                <div className="slide-dots" aria-hidden="true">{v.parts.map((_, i) => <span key={i} />)}</div>
              )}
              <div className="phone-cap">
                <b>@{(brand.name || 'yourbrand').replace(/[^a-z0-9]/gi, '').toLowerCase()}</b>
                <span>{v.caption}</span>
              </div>
            </div>
          </div>

          <div className="card stack" style={{ width: '100%', maxWidth: 340, gap: 14 }}>
            <b>Post to</b>
            {PLATFORMS.map((p) => (
              <label className="check" key={p}>
                <input
                  type="checkbox"
                  checked={post.platforms.includes(p)}
                  onChange={() => set({ platforms: post.platforms.includes(p) ? post.platforms.filter((x) => x !== p) : [...post.platforms, p] })}
                />
                {p}
              </label>
            ))}
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field"><label htmlFor="day">Day</label><input id="day" type="date" className="input" style={{ padding: '0 8px' }} value={day} onChange={(e) => setDay(e.target.value)} /></div>
              <div className="field"><label htmlFor="time">Time</label><input id="time" type="time" className="input" style={{ padding: '0 8px' }} value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <button className="btn primary" disabled={!day || !time} onClick={schedule}>
              <CalendarIcon /> {post.status === 'scheduled' ? 'Update schedule' : 'Schedule it'}
            </button>
          </div>
        </aside>
      </div>
      {toast}
    </>
  )
}
