import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: '盲盒', icon: '🎁' },
  { path: '/history', label: '历史', icon: '📋' },
  { path: '/favorites', label: '收藏', icon: '❤️' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const hideNav = location.pathname === '/reveal'

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md sm:max-w-lg flex flex-col flex-1">
        <Outlet />
      </div>
      {!hideNav && (
        <nav className="w-full max-w-md sm:max-w-lg bg-bg-card/95 backdrop-blur border-t border-white/10">
          <div className="flex justify-around py-2">
            {tabs.map((t) => {
              const active = t.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(t.path)
              return (
                <button
                  key={t.path}
                  onClick={() => navigate(t.path)}
                  className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-lg transition-colors ${
                    active ? 'text-brand' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
