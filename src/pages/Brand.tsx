import { useState } from 'react'
import { useStore } from '../lib/store'
import { VOICES } from '../lib/mockData'
import { readWebsite } from '../lib/generate'
import { useToast } from '../components/Toast'
import { XIcon } from '../components/Icons'
import type { Brand as BrandT } from '../lib/types'

function ListEditor({ label, items, color, onChange }: { label: string; items: string[]; color: string; onChange: (v: string[]) => void }) {
  return (
    <>
      {items.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            aria-label={`${label} ${i + 1}`}
            value={v}
            style={{ background: color }}
            placeholder="Write one line…"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {items.length > 1 && (
            <button className="btn icon" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <XIcon />
            </button>
          )}
        </div>
      ))}
      <button className="btn dashed small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...items, ''])}>
        + Add
      </button>
    </>
  )
}

export default function Brand() {
  const { brand, saveBrand } = useStore()
  const [b, setB] = useState<BrandT>(brand)
  // If the saved brand is replaced (e.g. "Load sample data"), show the new one.
  const [seen, setSeen] = useState(brand)
  if (seen !== brand) {
    setSeen(brand)
    setB(brand)
  }
  const [reading, setReading] = useState(false)
  const [toast, show] = useToast()
  const set = (patch: Partial<BrandT>) => setB((x) => ({ ...x, ...patch }))
  const changed = JSON.stringify(b) !== JSON.stringify(brand)

  async function fill() {
    if (!b.website.trim()) return
    setReading(true)
    const found = await readWebsite(b.website)
    setReading(false)
    set({ name: b.name || found.name, sells: b.sells || found.sells })
    show('Filled in what we could — check it over')
  }

  function toggleVoice(v: string) {
    if (b.voice.includes(v)) set({ voice: b.voice.filter((x) => x !== v) })
    else if (b.voice.length < 3) set({ voice: [...b.voice, v] })
  }

  return (
    <div className="stack narrow" style={{ gap: 24 }}>
      <h1>My brand</h1>

      <section className="card lift stack" style={{ background: 'var(--yellow)', gap: 14 }} aria-labelledby="quick">
        <h2 id="quick">Start with your website</h2>
        <form
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            fill()
          }}
        >
          <label htmlFor="site" className="sr-only">Website address</label>
          <input id="site" className="input" style={{ flex: '1 1 280px', width: 'auto' }} placeholder="yourbrand.com" value={b.website} onChange={(e) => set({ website: e.target.value })} />
          <button className="btn dark" disabled={reading || !b.website.trim()}>{reading ? 'Reading…' : 'Fill it in for me'}</button>
        </form>
      </section>

      <section className="card stack" style={{ gap: 16 }} aria-labelledby="about">
        <h2 id="about">About you</h2>
        <div className="grid-2">
          <div className="field"><label htmlFor="bname">Brand name</label><input id="bname" className="input" value={b.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="field"><label htmlFor="who">Who it's for</label><input id="who" className="input" value={b.audience} onChange={(e) => set({ audience: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="sell">What you sell</label><input id="sell" className="input" value={b.sells} onChange={(e) => set({ sells: e.target.value })} /></div>
      </section>

      <section className="card stack" aria-labelledby="pains">
        <h2 id="pains">Problems you solve</h2>
        <ListEditor label="Problem" items={b.problems} color="var(--pink-soft)" onChange={(problems) => set({ problems })} />
      </section>

      <section className="card stack" aria-labelledby="msgs">
        <h2 id="msgs">Key messages</h2>
        <ListEditor label="Message" items={b.messages} color="var(--green-soft)" onChange={(messages) => set({ messages })} />
      </section>

      <section className="card stack" style={{ gap: 14 }} aria-labelledby="voice">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 id="voice">Your voice</h2>
          <span className="muted">Pick up to 3</span>
        </div>
        <div role="group" aria-label="Tone of voice" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {VOICES.map((v) => (
            <button key={v} className="pill warm" aria-pressed={b.voice.includes(v)} onClick={() => toggleVoice(v)}>{v}</button>
          ))}
        </div>
      </section>

      <button
        className="btn primary"
        style={{ alignSelf: 'flex-start', minHeight: 52, padding: '0 28px' }}
        disabled={!changed}
        onClick={() => {
          saveBrand({ ...b, problems: b.problems.length ? b.problems : [''], messages: b.messages.length ? b.messages : [''] })
          show('Saved')
        }}
      >
        {changed ? 'Save' : 'Saved'}
      </button>
      {toast}
    </div>
  )
}
