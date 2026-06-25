import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { SearchParams, TripResult, TransportMode } from '../types'
import { matchDestination, generateTripPlan } from '../utils/matching'
import { hasAIKey, generateAIPlan } from '../utils/ai'

type Phase = 'generating' | 'shaking' | 'opening' | 'revealing' | 'done'

export default function RevealPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [phase, setPhase] = useState<Phase>('generating')
  const [result, setResult] = useState<TripResult | null>(null)
  const [statusText, setStatusText] = useState('正在为你准备盲盒...')
  const resultRef = useRef<TripResult | null>(null)

  useEffect(() => {
    const params: SearchParams = {
      departureCity: searchParams.get('city') || '',
      budget: Number(searchParams.get('budget')) || 3000,
      days: Number(searchParams.get('days')) || 3,
      people: Number(searchParams.get('people')) || 1,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      transportMode: (searchParams.get('transport') as TransportMode) || 'highspeed',
    }

    async function run() {
      // Step 1: Generate result
      if (hasAIKey()) {
        setStatusText('🤖 AI正在为你挑选目的地...')
        try {
          resultRef.current = await generateAIPlan(params)
        } catch {
          const destination = matchDestination(params)
          const plan = generateTripPlan(destination, params)
          resultRef.current = {
            id: `${destination.id}-${Date.now()}`,
            plan,
            createdAt: new Date().toISOString(),
            tags: params.tags,
          }
        }
      } else {
        const destination = matchDestination(params)
        const plan = generateTripPlan(destination, params)
        resultRef.current = {
          id: `${destination.id}-${Date.now()}`,
          plan,
          createdAt: new Date().toISOString(),
          tags: params.tags,
        }
      }

      // Result is ready — show it immediately and play animation
      setResult(resultRef.current)
      setPhase('shaking')
      setStatusText('🔮 正在开启盲盒...')

      // Play animation then navigate
      setTimeout(() => setPhase('opening'), 1200)
      setTimeout(() => {
        setPhase('revealing')
        setStatusText('📋 正在生成旅行方案...')
      }, 2200)
      setTimeout(() => {
        setPhase('done')
        if (resultRef.current) navigate('/result', { state: resultRef.current })
      }, 3400)
    }

    run()
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/30 pointer-events-none"
          style={{ left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%` }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      {/* 3D Box */}
      <div className="perspective-1000 mb-10">
        <motion.div
          className="relative w-44 h-44"
          style={{ transformStyle: 'preserve-3d' }}
          animate={
            phase === 'generating'
              ? { rotateY: [0, 360] }
              : phase === 'shaking'
                ? {
                    rotateX: [0, -5, 5, -8, 8, -3, 3, 0],
                    rotateY: [0, 8, -8, 12, -12, 5, -5, 0],
                    y: [0, -8, 0, -6, 0, -3, 0],
                  }
                : phase === 'opening'
                  ? { rotateX: 90, rotateY: 30, scale: 1.15, y: -30 }
                  : { rotateX: 180, rotateY: 360, scale: 0.2, opacity: 0, y: -120 }
          }
          transition={
            phase === 'generating'
              ? { duration: 2, repeat: Infinity, ease: 'linear' }
              : phase === 'shaking'
                ? { duration: 1.5, ease: 'easeInOut' }
                : phase === 'opening'
                  ? { duration: 1.1, ease: 'easeInOut' }
                  : { duration: 1.5, ease: 'easeIn' }
          }
        >
          {(['front', 'back', 'left', 'right', 'top', 'bottom'] as const).map((face, i) => (
            <div
              key={face}
              className={`box-face box-${face} flex items-center justify-center`}
              style={{
                width: 176, height: 176,
                background: i < 4
                  ? 'linear-gradient(135deg, #ff5e7a 0%, #e04e68 50%, #b33a50 100%)'
                  : 'linear-gradient(135deg, #ff8fa3 0%, #ff5e7a 100%)',
                borderRadius: 20,
                border: '2px solid rgba(240,184,72,0.35)',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)',
              }}
            >
              {face === 'top' && <span className="text-5xl select-none">🎁</span>}
              {face !== 'top' && face !== 'bottom' && (
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <span className="text-gold text-xl">?</span>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Opening particles */}
      <AnimatePresence>
        {phase === 'opening' && (
          <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${35 + Math.random() * 30}%`,
                  top: `${38 + Math.random() * 15}%`,
                  width: `${4 + Math.random() * 6}px`,
                  height: `${4 + Math.random() * 6}px`,
                  background: Math.random() > 0.5 ? '#f0b848' : '#ff5e7a',
                }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0, x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 }}
                transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal text */}
      <AnimatePresence>
        {(phase === 'revealing' || phase === 'opening' || phase === 'shaking') && result && (
          <motion.div
            className="text-center relative z-10"
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
          >
            <motion.p
              className="text-gold/80 text-sm tracking-widest mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {hasAIKey() ? '🤖 AI为你推荐' : '✨ 恭喜抽中'}
            </motion.p>
            <motion.h2
              className="text-5xl font-black text-white mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {result.plan.destination.name}
            </motion.h2>
            <motion.p
              className="text-text-muted text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {result.plan.destination.province} · {result.plan.destination.description}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <motion.p
        className="absolute bottom-16 text-text-muted text-sm"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {statusText}
      </motion.p>
    </div>
  )
}
