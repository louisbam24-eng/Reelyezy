import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TRENDS } from '../lib/mockData'
import { TYPE_INFO } from '../lib/types'
import type { ContentType, Post, Source } from '../lib/types'
import { newId, useStore } from '../lib/store'
import { writePost } from '../lib/generate'
import { ArrowIcon, UploadIcon } from '../components/Icons'

const TYPES = Object.keys(TYPE_INFO) as ContentType[]

export default function NewPost() {
  const [params] = useSearchParams()
  const fromTrend = TRENDS.find((t) => t.id === params.get('trend'))
  const { brand, addPost } = useStore()
  const navigate = useNavigate()

  const [route, setRoute] = useState<'idea' | 'trends'>(fromTrend ? 'trends' : 'idea')
  const [idea, setIdea] = useState('')
  const [link, setLink] = useState('')
  const [file, setFile] = useState<string>('')
  const [trendId, setTrendId] = useState(fromTrend?.id ?? TRENDS.find((t) => t.fit)!.id)
  const [type, setType] = useState<ContentType>(fromTrend?.suggestedType ?? 'photos')
  const [busy, setBusy] = useState(false)

  const trendChoices = [...TRENDS.filter((t) => t.fit)]
  if (fromTrend && !fromTrend.fit) trendChoices.unshift(fromTrend)
  const trend = TRENDS.find((t) => t.id === trendId)!

  const ready = route === 'trends' || idea.trim() || link.trim() || file
  const startLabel = route === 'idea' ? 'Your idea' : `Trend: ${trend.title}`

  async function make() {
    if (!ready) return
    setBusy(true)
    const source: Source =
      route === 'idea'
        ? { kind: 'idea', text: [idea.trim(), file && `(from upload: ${file})`].filter(Boolean).join(' '), link: link.trim() }
        : { kind: 'trend', trendId }
    const versions = await writePost(brand, source, type)
    const post: Post = {
      id: newId(),
      title: route === 'idea' ? idea.trim().slice(0, 60) || 'New post' : trend.title,
      type,
      source,
      versions,
      picked: 0,
      platforms: route === 'trends' ? [trend.platform] : ['Instagram'],
      status: 'draft',
      when: null,
      presenter: 'Maya',
      voice: 'Friendly',
      creatorStatus: 'Not sent',
      createdAt: new Date().toISOString(),
    }
    addPost(post)
    navigate(`/create/${post.id}`)
  }

  return (
    <>
      <header className="stack" style={{ gap: 8 }}>
        <h1>New post</h1>
        <p className="muted" style={{ margin: 0, fontSize: 18 }}>Two quick choices, then we'll make it.</p>
      </header>

      <section className="stack" style={{ gap: 16 }} aria-labelledby="s1">
        <h2 id="s1" className="step-title"><span className="num" aria-hidden="true">1</span>How do you want to start?</h2>
        <div className="choice-grid">
          <button className="choice" aria-pressed={route === 'idea'} style={{ background: route === 'idea' ? 'var(--yellow)' : undefined }} onClick={() => setRoute('idea')}>
            <span className="big">I have an idea</span>
            <span>Describe it, paste a link, or upload a video to copy.</span>
          </button>
          <button className="choice" aria-pressed={route === 'trends'} style={{ background: route === 'trends' ? 'var(--pink)' : undefined }} onClick={() => setRoute('trends')}>
            <span className="big">Show me what's trending</span>
            <span>Pick a trending video and we'll remake it for your brand.</span>
          </button>
        </div>

        {route === 'idea' ? (
          <div className="card stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="idea">Describe your idea</label>
              <textarea id="idea" className="input" rows={3} placeholder="e.g. A quick video showing how we roast beans, set to an upbeat sound" value={idea} onChange={(e) => setIdea(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: '2 1 300px' }}>
                <label htmlFor="link">Link to a post you want to copy <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <input id="link" className="input" placeholder="Link from TikTok, Instagram or LinkedIn" value={link} onChange={(e) => setLink(e.target.value)} />
              </div>
              <label className="btn dashed" style={{ flex: '1 1 220px', background: 'var(--bg)' }}>
                <UploadIcon />
                {file ? file : 'Upload a video or image'}
                <input type="file" accept="video/*,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? '')} />
              </label>
            </div>
          </div>
        ) : (
          <div className="card stack" style={{ gap: 14 }}>
            <div className="spread">
              <b>Good fits for your brand right now</b>
              <Link to="/trends" style={{ fontWeight: 700 }}>See all trends</Link>
            </div>
            <div role="group" aria-label="Pick a trend" className="choice-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {trendChoices.map((t) => (
                <button key={t.id} className="choice" aria-pressed={t.id === trendId} style={{ padding: 14, borderRadius: 16, gap: 4, background: t.id === trendId ? 'var(--yellow)' : 'var(--bg)' }} onClick={() => { setTrendId(t.id); setType(t.suggestedType) }}>
                  <b>{t.title}</b>
                  <span style={{ fontSize: 14 }}>{t.platform} · {t.views} views</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="stack" style={{ gap: 16 }} aria-labelledby="s2">
        <h2 id="s2" className="step-title"><span className="num" aria-hidden="true">2</span>What kind of content?</h2>
        <div role="group" aria-label="Content type" className="choice-grid">
          {TYPES.map((t) => {
            const info = TYPE_INFO[t]
            return (
              <button key={t} className="choice" aria-pressed={type === t} style={{ minHeight: 250, background: type === t ? info.color : undefined }} onClick={() => setType(t)}>
                <span className="mark" aria-hidden="true">{info.mark}</span>
                <span className="big">{info.title}</span>
                <span>{info.what}</span>
                <span className="tag" style={{ marginTop: 'auto', background: 'var(--white)', border: '1.5px solid var(--ink)' }}>{info.tag}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="summary-bar">
        <span style={{ fontSize: 18 }}><b>Your post:</b> {startLabel} → {TYPE_INFO[type].title}</span>
        <button className="btn primary" style={{ border: '2px solid var(--white)', minHeight: 52 }} disabled={!ready || busy} onClick={make}>
          {busy ? 'Making it…' : 'Make it'} <ArrowIcon />
        </button>
      </div>
      {!ready && <p className="muted" style={{ margin: '-16px 0 0' }}>Add a description, a link or an upload to start from your idea.</p>}
    </>
  )
}
