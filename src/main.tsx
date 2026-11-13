import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './styles.css'
import { StoreProvider } from './lib/store'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Brand from './pages/Brand'
import Trends from './pages/Trends'
import NewPost from './pages/NewPost'
import Create from './pages/Create'
import Schedule from './pages/Schedule'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <div className="shell">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/brand" element={<Brand />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/new" element={<NewPost />} />
              <Route path="/create/:id" element={<Create />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)
