import { useState } from 'react'
import type { DragEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { BEST_TIMES } from '../lib/mockData'
import { PLATFORM_COLOR, TYPE_INFO } from '../lib/types'
import type { Post } from '../lib/types'
import { DAY_NAMES, addDays, atTime, sameDay, shortDate, startOfWeek, timeOf, weekday } from '../lib/dates'
import { BackIcon, ArrowIcon } from '../components/Icons'
import { useToast } from '../components/Toast'

const SHORT = { Instagram: 'IG', TikTok: 'TT', LinkedIn: 'in' } as const

export default function Schedule() {
  const { posts, updatePost } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const jump = (location.state as { week?: string } | null)?.week
  const [monday, setMonday] = useState(startOfWeek(jump ? new Date(jump) : new Date()))
  const [view, setView] = useState<'Week' | 'Month'>('Week')
  const [showBest, setShowBest] = useState(true)
  const [over, setOver] = useState<number | null>(null)
  const [toast, show] = useToast()
  const today = new Date()

  const scheduled = posts.filter((p) => p.status === 'scheduled' && p.when)
  const drafts = posts.filter((p) => p.status === 'draft')
  const onDay = (d: Date) =>
    scheduled.filter((p) => sameDay(new Date(p.when!), d)).sort((a, b) => a.when!.localeCompare(b.when!))

  function moveTo(id: string, day: Date) {
    const p = posts.find((x) => x.id === id)
    if (!p) return
    const time = p.when ? timeOf(new Date(p.when)) : BEST_TIMES[weekday(day)] ?? '12:00'
    updatePost(id, { status: 'scheduled', when: atTime(day, time).toISOString() })
    show(`Moved to ${DAY_NAMES[weekday(day)]} ${time}`)
  }

  function fillWeek() {
    const free = drafts.slice()
    if (!free.length) return show('No drafts to add — make a post first')
    let added = 0
    const todayStart = atTime(today, '00:00')
    for (let i = 0; i < 7 && free.length; i++) {
      const day = addDays(monday, i)
      if (day < todayStart) continue
      if (onDay(day).length) continue
      const p = free.shift()!
      updatePost(p.id, { status: 'scheduled', when: atTime(day, BEST_TIMES[i] ?? '12:00').toISOString() })
      added++
    }
    show(added ? `Added ${added} draft${added > 1 ? 's' : ''} to empty days` : 'No empty days left this week')
  }

  const dragProps = (p: Post) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => e.dataTransfer.setData('text/plain', p.id),
  })
  const dropProps = (i: number, day: Date) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setOver(i)
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setOver(null)
      moveTo(e.dataTransfer.getData('text/plain'), day)
    },
  })

  const weekCount = DAY_NAMES.reduce((n, _, i) => n + onDay(addDays(monday, i)).length, 0)

  // Month view: 6 rows starting on the Monday on/before the 1st.
  const first = new Date(monday.getFullYear(), monday.getMonth(), 1)
  const gridStart = startOfWeek(first)

  return (
    <>
      <header className="spread" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1>{view === 'Week' ? 'Your week' : first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn icon small" aria-label={view === 'Week' ? 'Previous week' : 'Previous month'} onClick={() => setMonday(view === 'Week' ? addDays(monday, -7) : startOfWeek(new Date(first.getFullYear(), first.getMonth() - 1, 1)))}><BackIcon /></button>
            <span className="muted" style={{ fontSize: 18 }}>
              {view === 'Week' ? `${shortDate(monday)} – ${shortDate(addDays(monday, 6))} · ${weekCount} post${weekCount === 1 ? '' : 's'}` : ''}
            </span>
            <button className="btn icon small" aria-label={view === 'Week' ? 'Next week' : 'Next month'} onClick={() => setMonday(view === 'Week' ? addDays(monday, 7) : startOfWeek(new Date(first.getFullYear(), first.getMonth() + 1, 1)))}><ArrowIcon /></button>
            <button className="btn small" onClick={() => setMonday(startOfWeek(today))}>Today</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div className="seg" role="group" aria-label="Calendar view">
            {(['Week', 'Month'] as const).map((x) => (
              <button key={x} aria-pressed={view === x} onClick={() => setView(x)}>{x}</button>
            ))}
          </div>
          {view === 'Week' && (
            <label className="check" style={{ borderRadius: 999 }}>
              <input type="checkbox" checked={showBest} onChange={() => setShowBest(!showBest)} />
              Show best times
            </label>
          )}
          <Link className="btn primary" to="/new">+ New post</Link>
        </div>
      </header>

      {view === 'Week' ? (
        <div className="cal-wrap">
          <div className="cal">
            {DAY_NAMES.map((name, i) => {
              const day = addDays(monday, i)
              const list = onDay(day)
              const best = showBest && !list.length && BEST_TIMES[i]
              return (
                <section key={name} aria-label={`${name} ${shortDate(day)}`} className={'day' + (over === i ? ' over' : '')} {...dropProps(i, day)}>
                  <div className="day-head">
                    <span><b>{name}</b> <span className="muted" style={{ fontSize: 13 }}>{day.getDate()}</span></span>
                    {sameDay(day, today) && <span className="today">Today</span>}
                  </div>
                  {list.map((p) => (
                    <button key={p.id} className="slot" style={{ background: PLATFORM_COLOR[p.platforms[0]] }} onClick={() => navigate(`/create/${p.id}`)} {...dragProps(p)}>
                      <span className="slot-top">
                        {timeOf(new Date(p.when!))}
                        <span className="slot-plat">{p.platforms.length > 1 ? p.platforms.map((x) => SHORT[x]).join(' · ') : p.platforms[0]}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{p.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{TYPE_INFO[p.type].title}</span>
                    </button>
                  ))}
                  {best && (
                    <Link className="best" to="/new">
                      Good time to post · {best}
                      <br />+ Add a post
                    </Link>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="cal-wrap">
          <div className="month">
            {DAY_NAMES.map((n) => <b key={n} style={{ textAlign: 'center' }}>{n}</b>)}
            {Array.from({ length: 42 }, (_, i) => {
              const day = addDays(gridStart, i)
              const list = onDay(day)
              return (
                <div key={i} className={'mday' + (day.getMonth() !== first.getMonth() ? ' other' : '')} style={sameDay(day, today) ? { background: 'var(--yellow-soft)' } : undefined} {...dropProps(100 + i, day)}>
                  <b>{day.getDate()}</b>
                  {list.map((p) => (
                    <Link key={p.id} className="dot" to={`/create/${p.id}`} style={{ background: PLATFORM_COLOR[p.platforms[0]], textDecoration: 'none' }} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}>
                      {timeOf(new Date(p.when!))} {p.title}
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="row">
        <section className="card lift stack" style={{ flex: '2 1 480px', minWidth: 0, gap: 14 }} aria-labelledby="drafts">
          <div className="spread">
            <h2 id="drafts">Drafts waiting</h2>
            <span className="muted">Drag one onto a day</span>
          </div>
          {drafts.length === 0 && <p className="muted" style={{ margin: 0 }}>No drafts. Everything's scheduled.</p>}
          <div className="draft-grid">
            {drafts.map((p) => (
              <div key={p.id} className="draft" {...dragProps(p)}>
                <span className="swatch" style={{ background: TYPE_INFO[p.type].color }} aria-hidden="true">{TYPE_INFO[p.type].mark}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <Link to={`/create/${p.id}`} style={{ fontWeight: 700 }}>{p.title}</Link>
                  <span className="muted" style={{ fontSize: 13 }}>{p.platforms.join(', ')} · {TYPE_INFO[p.type].title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card dark stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 12 }} aria-labelledby="auto">
          <h2 id="auto">Fill my week for me</h2>
          <span>Drops your drafts into the empty days at good times.</span>
          <button className="btn" style={{ alignSelf: 'flex-start', background: 'var(--yellow)' }} onClick={fillWeek}>Fill the gaps</button>
        </section>
      </div>
      {toast}
    </>
  )
}
