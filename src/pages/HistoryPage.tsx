import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { TripResult } from '../types'
import { getHistory, clearHistory } from '../utils/storage'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<TripResult[]>([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  function handleClear() {
    clearHistory()
    setHistory([])
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <span className="text-6xl mb-4">📋</span>
        <p className="text-text-muted text-lg mb-2">暂无历史记录</p>
        <p className="text-text-muted/50 text-sm mb-6">快去开个盲盒吧！</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-brand rounded-xl text-white font-bold"
        >
          🎁 开启旅行盲盒
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black text-white">📋 开盒历史</h1>
        <button
          onClick={handleClear}
          className="text-xs text-text-muted hover:text-brand transition-colors"
        >
          清空记录
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item, i) => {
          const { plan } = item
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate('/result', { state: item })}
              className="w-full bg-bg-card rounded-xl p-4 text-left hover:bg-bg-card-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={plan.destination.image}
                  alt={plan.destination.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=80&q=80'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm">{plan.destination.name}</h3>
                  <p className="text-text-muted text-xs mt-0.5">
                    {plan.departureCity}出发 · {plan.days}天 · ¥{plan.totalEstimate.total}
                  </p>
                </div>
                <span className="text-text-muted text-xs shrink-0">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
