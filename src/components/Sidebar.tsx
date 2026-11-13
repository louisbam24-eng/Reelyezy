import { NavLink, useLocation } from 'react-router-dom'
import { CalendarIcon, FlameIcon, HeartIcon, HomeIcon, SparkIcon } from './Icons'
import { useStore } from '../lib/store'

const links = [
  { to: '/', label: 'Home', icon: <HomeIcon />, end: true },
  { to: '/brand', label: 'My brand', icon: <HeartIcon /> },
  { to: '/trends', label: 'Trends', icon: <FlameIcon /> },
  { to: '/new', label: 'Create', icon: <SparkIcon />, also: '/create' },
  { to: '/schedule', label: 'Schedule', icon: <CalendarIcon /> },
]

export default function Sidebar() {
  const { loadDemo, clearAll } = useStore()
  const location = useLocation()
  return (
    <nav className="nav" aria-label="Main menu">
      <NavLink to="/" className="logo">
        <span className="logo-mark" aria-hidden="true">R</span>
        Reelyezy
      </NavLink>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            'nav-link' + (isActive || (l.also && location.pathname.startsWith(l.also)) ? ' active' : '')
          }
        >
          {l.icon}
          {l.label}
        </NavLink>
      ))}
      <div className="nav-foot">
        <span className="nav-label">Connected</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="nav-chip">Instagram</span>
          <span className="nav-chip">TikTok</span>
          <span className="nav-chip">LinkedIn</span>
        </div>
        <div style={{ display: 'flex', gap: 14, paddingTop: 10 }}>
          <button className="nav-small" onClick={() => confirm('Replace everything with the sample brand and posts?') && loadDemo()}>
            Load sample data
          </button>
          <button className="nav-small" onClick={() => confirm('Clear your brand and all posts?') && clearAll()}>
            Start fresh
          </button>
        </div>
      </div>
    </nav>
  )
}
