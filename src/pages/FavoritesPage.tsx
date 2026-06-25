import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { TripResult } from '../types'
import { getFavorites } from '../utils/storage'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<TripResult[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  if (favorites.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <span className="text-6xl mb-4">❤️</span>
        <p className="text-text-muted text-lg mb-2">暂无收藏</p>
        <p className="text-text-muted/50 text-sm mb-6">在旅行方案页点击收藏即可保存</p>
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
      <h1 className="text-xl font-black text-white mb-5">❤️ 我的收藏</h1>

      <div className="grid gap-3">
        {favorites.map((item, i) => {
          const { plan } = item
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate('/result', { state: item })}
              className="w-full bg-bg-card rounded-xl overflow-hidden text-left hover:bg-bg-card-hover transition-colors"
            >
              <div className="flex">
                <img
                  src={plan.destination.image}
                  alt={plan.destination.name}
                  className="w-24 h-24 object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&q=80'
                  }}
                />
                <div className="p-3 flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm">{plan.destination.name}</h3>
                  <p className="text-text-muted text-xs mt-0.5 line-clamp-2">
                    {plan.destination.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-text-muted">{plan.days}天</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-gold font-medium">¥{plan.totalEstimate.total}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
