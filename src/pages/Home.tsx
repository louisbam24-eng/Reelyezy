import { Link } from 'react-router-dom'
import { CalendarIcon, FlameIcon, SparkIcon } from '../components/Icons'
import { useStore } from '../lib/store'
import { WEEK_STATS } from '../lib/mockData'
import { DAY_NAMES, addDays, startOfWeek, timeOf } from '../lib/dates'
import { PLATFORM_COLOR } from '../lib/types'

export default function Home() {
  const { posts, brand } = useStore()
  const monday = startOfWeek(new Date())
  const nextMonday = addDays(monday, 7)
  const now = new Date()

  const scheduled = posts
    .filter((p) => p.status === 'scheduled' && p.when)
    .map((p) => ({ ...p, date: new Date(p.when!) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const thisWeek = scheduled.filter((p) => p.date >= monday && p.date < nextMonday)
  const upcoming = scheduled.filter((p) => p.date >= now).slice(0, 4)
  const max = Math.max(...WEEK_STATS.viewsByDay)

  return (
    <>
      {!brand.name.trim() && (
        <div className="card spread" style={{ background: 'var(--yellow-soft)' }}>
          <b>Tell us about your brand first, so your posts sound like you.</b>
          <Link className="btn dark small" to="/brand">Set up my brand</Link>
        </div>
      )}

      <section className="steps" aria-label="Make a post in three steps">
        <Link className="step" to="/trends" style={{ background: 'var(--yellow)' }}><FlameIcon size={34} />1. Discover</Link>
        <Link className="step" to="/new" style={{ background: 'var(--green)' }}><SparkIcon size={34} />2. Create</Link>
        <Link className="step" to="/schedule" style={{ background: 'var(--pink)' }}><CalendarIcon size={34} />3. Schedule</Link>
      </section>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <section className="card lift stack" style={{ flex: '2 1 480px', minWidth: 0, gap: 24, padding: 28 }} aria-labelledby="stats">
          <h2 id="stats">This week</h2>
          <div className="stats">
            <div className="stat" style={{ background: 'var(--yellow-soft)' }}><b>{thisWeek.length}</b>Posts</div>
            <div className="stat" style={{ background: 'var(--green-soft)' }}><b>{WEEK_STATS.views}</b>Views</div>
            <div className="stat" style={{ background: 'var(--pink-soft)' }}><b>{WEEK_STATS.likes}</b>Likes</div>
            <div className="stat" style={{ background: 'var(--blue-soft)' }}><b>{WEEK_STATS.followers}</b>Followers</div>
          </div>
          <div className="bars" role="img" aria-label="Views per day this week">
            {WEEK_STATS.viewsByDay.map((v, i) => (
              <div className="bar-col" key={i}>
                <div className="bar" style={{ height: `${(v / max) * 100}%`, background: v === max ? 'var(--orange)' : undefined }} />
                {DAY_NAMES[i]}
              </div>
            ))}
          </div>
        </section>

        <section className="card lift stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 16, padding: 28 }} aria-labelledby="sched">
          <div className="spread">
            <h2 id="sched">Scheduled</h2>
            <Link to="/schedule" style={{ fontWeight: 700 }}>See all</Link>
          </div>
          {upcoming.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing coming up yet.</p>}
          {upcoming.map((p) => (
            <Link className="list-item" key={p.id} to={`/create/${p.id}`}>
              <div className="datebox" style={{ background: PLATFORM_COLOR[p.platforms[0]] }}>
                {DAY_NAMES[(p.date.getDay() + 6) % 7]}
                <br />
                {timeOf(p.date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <b>{p.title}</b>
                <span className="muted" style={{ fontSize: 14 }}>{p.platforms.join(', ')}</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </>
  )
}
