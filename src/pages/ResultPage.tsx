import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { TripResult, TransportMode } from '../types'
import { addToHistory, toggleFavorite, isFavorite, getHistory } from '../utils/storage'
import { hasAIKey } from '../utils/ai'

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  flight: '✈️飞机',
  highspeed: '🚄高铁',
  train: '🚂火车',
  selfdrive: '🚗自驾',
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as TripResult | null
  const [faved, setFaved] = useState(false)
  const [expandedDays, setExpandedDays] = useState<number[]>([0])
  const [sharing, setSharing] = useState(false)

  const plan = state?.plan

  useEffect(() => {
    if (!state) { navigate('/'); return }
    const existing = getHistory().some((h) => h.id === state.id)
    if (!existing) addToHistory(state)
    setFaved(isFavorite(state.id))
  }, [])

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted">没有旅行数据，先去开个盲盒吧 🎁</p>
      </div>
    )
  }

  const { destination, totalEstimate, dailyPlan, budget } = plan

  function handleFavorite() {
    if (!state) return
    setFaved(toggleFavorite(state))
  }

  async function handleShare() {
    if (sharing) return
    setSharing(true)

    try {
      const W = 750
      const P = 40
      const CW = W - P * 2
      const BOTTOM_PAD = 80

      // Off-screen canvas for text measurement
      const mc = document.createElement('canvas')
      const mctx = mc.getContext('2d')!

      function textLines(t: string, maxW: number, size: number, lineH: number): { lines: number; height: number } {
        mctx.font = `${size}px "Noto Sans SC", system-ui, sans-serif`
        let line = '', lines = 1
        for (const ch of t) {
          if (mctx.measureText(line + ch).width > maxW) { lines++; line = ch } else { line += ch }
        }
        return { lines, height: lines * lineH }
      }

      // === Calculate ALL heights dynamically ===
      let totalH = P // top padding

      // Header (dynamic)
      mctx.font = '16px "Noto Sans SC", system-ui, sans-serif'
      const headerDesc = `${destination.province} · ${destination.description}`
      let dline = '', dlines = 1
      for (const ch of headerDesc) {
        if (mctx.measureText(dline + ch).width > CW - 60) { dlines++; dline = ch } else { dline += ch }
      }
      const headerH = 20 + 48 + 60 + dlines * 26 + 10 + 20
      totalH += headerH

      // Stats section height
      mctx.font = '13px "Noto Sans SC", system-ui, sans-serif'
      const seasonW = mctx.measureText(destination.bestSeason).width
      const seasonLines = seasonW > CW - 120 ? 2 : 1
      const statsSectionH = 66 + (seasonLines === 2 ? 26 : 22) + 12

      // Divider + Stats
      totalH += 20 + statsSectionH + 20

      // Budget breakdown height (transport + optional wrapped note + 3 other rows + total + status)
      let budgetNoteH = 0
      if (plan.transportNote) {
        const tl = textLines(plan.transportNote, CW - 40, 13, 18)
        budgetNoteH = tl.height + 4
      }
      totalH += 25 + 22 + budgetNoteH + 22 * 3 + 6 + 8 + 22 + 16 + 20

      // Divider
      totalH += 20

      // Daily plan section title
      totalH += 45

      // Daily plan blocks
      const dayBlockHeights: number[] = []
      dailyPlan.forEach((day) => {
        let h = 48 // header (badge + title)
        day.activities.forEach((act) => {
          const tl = textLines(act, CW - 60, 14, 22)
          h += tl.height
        })
        if (day.hotel) h += 26 // hotel line
        h += 20 // bottom padding
        dayBlockHeights.push(h)
        totalH += h + 8 // block + gap
      })
      totalH += 10 + 20 // extra

      // Attractions
      totalH += 45 // title
      const attrHeights: number[] = []
      destination.attractions.forEach((a) => {
        const dl = textLines(a.description, CW - 40, 13, 18)
        let h = 16 + 18 + 14 + dl.height + 16
        attrHeights.push(h)
        totalH += h + 4
      })
      totalH += 5 + 20

      // Accommodation
      totalH += 45 + 76 + 20

      // Foods
      totalH += 45
      let foodRowW = 0, foodRows = 1
      destination.foods.forEach((f) => {
        mctx.font = '15px "Noto Sans SC", system-ui, sans-serif'
        const fw = mctx.measureText(f).width + 28
        if (foodRowW + fw > CW) { foodRows++; foodRowW = 0 }
        foodRowW += fw + 8
      })
      totalH += foodRows * 40 + 20 + 20

      // Footer
      totalH += 50

      // Extra bottom padding
      totalH += BOTTOM_PAD

      // === Create canvas ===
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = totalH
      const ctx = canvas.getContext('2d')!
      ctx.textBaseline = 'middle'

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, totalH)
      bg.addColorStop(0, '#0a0a1a'); bg.addColorStop(0.5, '#080812'); bg.addColorStop(1, '#0a0a1a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, totalH)

      // Top accent
      ctx.fillStyle = '#ff5e7a'; ctx.fillRect(0, 0, W, 3)

      function card(x: number, fy: number, w: number, h: number, r: number, color: string) {
        ctx.fillStyle = color; ctx.beginPath()
        ctx.moveTo(x + r, fy); ctx.lineTo(x + w - r, fy)
        ctx.quadraticCurveTo(x + w, fy, x + w, fy + r); ctx.lineTo(x + w, fy + h - r)
        ctx.quadraticCurveTo(x + w, fy + h, x + w - r, fy + h); ctx.lineTo(x + r, fy + h)
        ctx.quadraticCurveTo(x, fy + h, x, fy + h - r); ctx.lineTo(x, fy + r)
        ctx.quadraticCurveTo(x, fy, x + r, fy); ctx.closePath(); ctx.fill()
      }
      function divider(fy: number) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(P, fy); ctx.lineTo(W - P, fy); ctx.stroke()
      }
      function drawText(t: string, x: number, fy: number, size: number, color: string, weight?: string) {
        ctx.font = `${weight || 'normal'} ${size}px "Noto Sans SC", system-ui, sans-serif`
        ctx.fillStyle = color; ctx.fillText(t, x, fy)
      }
      function drawWrapped(t: string, x: number, fy: number, maxW: number, size: number, lineH: number, color: string): number {
        ctx.font = `${size}px "Noto Sans SC", system-ui, sans-serif`
        ctx.fillStyle = color
        let line = '', ly = fy
        for (const ch of t) {
          if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, ly); line = ch; ly += lineH }
          else { line += ch }
        }
        if (line) ctx.fillText(line, x, ly)
        return ly + lineH - fy // total height used
      }

      // === Render ===
      let y = P
      ctx.textAlign = 'center'

      // Header
      drawText('🎁 AI 盲盒旅行机', W / 2, y, 20, '#f0b848', 'bold')
      y += 48
      drawText(destination.name, W / 2, y, 48, '#ffffff', 'bold')
      y += 60
      // Center-aligned description with manual line wrap
      ctx.textAlign = 'center'
      ctx.font = '16px "Noto Sans SC", system-ui, sans-serif'
      ctx.fillStyle = '#8888a0'
      const desc = `${destination.province} · ${destination.description}`
      const descMaxW = CW - 60
      let descLine = '', descLines: string[] = []
      for (const ch of desc) {
        if (ctx.measureText(descLine + ch).width > descMaxW) { descLines.push(descLine); descLine = ch }
        else { descLine += ch }
      }
      if (descLine) descLines.push(descLine)
      descLines.forEach((line, i) => {
        ctx.fillText(line, W / 2, y + i * 26)
      })
      y += descLines.length * 26 + 10
      divider(y); y += 20

      // Stats row 1: days / people / total cost / transport
      const stats = [
        { v: `${plan.days}天`, l: '行程' },
        { v: `${plan.people}人`, l: '人数' },
        { v: `¥${totalEstimate.total.toLocaleString()}`, l: '预估费用' },
        { v: TRANSPORT_LABELS[plan.transportMode], l: '出行方式' },
      ]
      const sw = CW / 4
      card(P, y, CW, 56, 12, '#ffffff04')
      stats.forEach((s, i) => {
        const sx = P + sw * i + sw / 2
        drawText(s.v, sx, y + 18, 22, '#f0b848', 'bold')
        drawText(s.l, sx, y + 42, 12, '#6b6b80')
      })
      y += 66
      // Stats row 2: best season (full text, wrapped if needed)
      const seasonLabel = '🌸 最佳季节'
      const seasonFull = destination.bestSeason
      const seasonLabelW = mctx.measureText(seasonLabel).width + 20
      ctx.font = '13px "Noto Sans SC", system-ui, sans-serif'
      const seasonFullW = ctx.measureText(seasonFull).width
      if (seasonFullW > CW - seasonLabelW - 20) {
        // Two-line: label on left, wrapped text
        drawText(seasonLabel, P + 8, y + 6, 13, '#6b6b80')
        drawWrapped(seasonFull, P + seasonLabelW, y + 6, CW - seasonLabelW - 10, 13, 18, '#a0a0b8')
        y += 26
      } else {
        // One-line
        drawText(seasonLabel, P + 8, y + 6, 13, '#6b6b80')
        ctx.textAlign = 'right'
        drawText(seasonFull, W - P - 8, y + 6, 13, '#a0a0b8')
        ctx.textAlign = 'left'
        y += 22
      }
      y += 12
      divider(y); y += 25

      // Budget breakdown
      drawText('💰 费用明细', P, y, 22, '#ffffff', 'bold'); y += 40
      // Transport line (with optional note)
      const transportLabel = `${TRANSPORT_LABELS[plan.transportMode]}往返`
      drawText(transportLabel, P + 4, y, 16, '#a0a0b8')
      ctx.textAlign = 'right'
      drawText(`¥${totalEstimate.transport.toLocaleString()}`, W - P, y, 16, '#eaeaef')
      ctx.textAlign = 'left'
      y += 22
      if (plan.transportNote) {
        const noteH = drawWrapped(`${plan.transportNote}`, P + 16, y, CW - 40, 13, 18, '#6b6b80')
        y += noteH + 4
      }
      // Other items
      const otherItems = [
        { l: '住宿', v: totalEstimate.accommodation },
        { l: '餐饮', v: totalEstimate.food },
        { l: '门票活动', v: totalEstimate.attractions },
      ]
      otherItems.forEach((r) => {
        drawText(r.l, P + 4, y, 16, '#a0a0b8')
        ctx.textAlign = 'right'
        drawText(`¥${r.v.toLocaleString()}`, W - P, y, 16, '#eaeaef')
        ctx.textAlign = 'left'
        y += 22
      })
      y += 6
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke()
      y += 8
      drawText('总计', P + 4, y, 18, '#ffffff', 'bold')
      ctx.textAlign = 'right'
      drawText(`¥${totalEstimate.total.toLocaleString()}`, W - P, y, 20, '#f0b848', 'bold')
      ctx.textAlign = 'center'
      y += 28
      const budgetStatus = budget >= totalEstimate.total ? '✅ 预算内' : '⚠️ 略超预算'
      const budgetColor = budget >= totalEstimate.total ? '#4ade80' : '#ff5e7a'
      drawText(budgetStatus, W / 2, y, 15, budgetColor)
      y += 24
      divider(y); y += 25

      // Daily Plan
      drawText('📋 每日行程', P, y, 22, '#ffffff', 'bold'); y += 45
      dailyPlan.forEach((day, di) => {
        const dh = dayBlockHeights[di]
        card(P, y - 4, CW, dh, 14, '#12122a')
        // Badge
        card(P + 12, y + 6, 34, 34, 10, '#ff5e7a')
        ctx.textAlign = 'center'
        drawText(`${day.day}`, P + 29, y + 23, 17, '#ffffff', 'bold')
        ctx.textAlign = 'left'
        drawText(day.title, P + 58, y + 24, 18, '#ffffff', 'bold')
        // Activities
        let ay = y + 54
        day.activities.forEach((act) => {
          drawText('▸', P + 20, ay + 10, 11, '#ff5e7a')
          const usedH = drawWrapped(act, P + 36, ay + 10, CW - 56, 14, 22, '#a0a0b8')
          ay += Math.max(22, usedH)
        })
        // Hotel
        if (day.hotel) {
          drawText('🏨', P + 20, ay + 10, 12, '#f0b848')
          drawWrapped(day.hotel, P + 36, ay + 10, CW - 56, 13, 20, '#f0b848')
        }
        y += dh + 8
      })
      y += 10; divider(y); y += 25

      // Attractions
      drawText('🏛 推荐景点', P, y, 22, '#ffffff', 'bold'); y += 45
      destination.attractions.forEach((a, ai) => {
        const ah = attrHeights[ai]
        card(P, y - 6, CW, ah, 10, '#12122a')
        drawText(a.name, P + 16, y + 10, 16, '#ffffff', 'bold')
        ctx.textAlign = 'right'
        drawText(a.duration, W - P - 12, y + 10, 13, '#ff5e7a')
        ctx.textAlign = 'left'
        drawWrapped(a.description, P + 16, y + 32, CW - 40, 13, 18, '#6b6b80')
        y += ah + 4
      })
      y += 5; divider(y); y += 25

      // Accommodation
      drawText('🏨 住宿参考', P, y, 22, '#ffffff', 'bold'); y += 45
      const bw = CW / 2 - 8
      card(P, y - 6, bw, 56, 10, '#12122a')
      drawText('经济型', P + 16, y + 10, 14, '#6b6b80')
      drawWrapped(destination.accommodation.budget, P + 16, y + 32, bw - 32, 16, 20, '#eaeaef')
      card(P + bw + 16, y - 6, bw, 56, 10, '#12122a')
      drawText('舒适型', P + bw + 32, y + 10, 14, '#6b6b80')
      drawWrapped(destination.accommodation.comfort, P + bw + 32, y + 32, bw - 32, 16, 20, '#eaeaef')
      y += 80; divider(y); y += 25

      // Foods
      drawText('🍜 必吃美食', P, y, 22, '#ffffff', 'bold'); y += 42
      let fx = P
      destination.foods.forEach((f) => {
        ctx.font = '15px "Noto Sans SC", system-ui, sans-serif'
        const fw = ctx.measureText(f).width + 28
        if (fx + fw > W - P) { fx = P; y += 38 }
        card(fx, y - 6, fw, 30, 15, '#12122a')
        drawText(f, fx + 14, y + 9, 15, '#eaeaef')
        fx += fw + 8
      })
      y += 50

      // Footer
      ctx.textAlign = 'center'
      drawText('AI 盲盒旅行机 · 开启你的未知旅行', W / 2, y, 14, '#555568')
      y += 22
      drawText(`${plan.departureCity}出发 · ${plan.days}天${plan.people}人 · 预算¥${budget.toLocaleString()}`, W / 2, y, 12, '#444458')

      // Copy
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('✅ 长图已复制到剪贴板，可直接粘贴发给朋友！')
    } catch (err) {
      console.error(err)
      alert('操作失败，请重试')
    } finally {
      setSharing(false)
    }
  }

  function toggleDay(i: number) {
    setExpandedDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i])
  }

  return (
    <motion.div className="flex-1 px-4 sm:px-5 pt-4 pb-8" variants={container} initial="hidden" animate="show">
      {/* Top glow decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand/8 rounded-full blur-3xl pointer-events-none" />

      {/* Non-AI notice */}
      {!hasAIKey() && (
        <motion.div
          className="mb-4 px-4 py-3 bg-gold/10 border border-gold/20 rounded-xl text-center"
          variants={item}
        >
          <p className="text-gold text-xs">
            💡 当前为本地模板模式，方案仅供参考。配置 AI Key 可获得<span className="font-bold">实时生成的精准方案</span>
          </p>
        </motion.div>
      )}

      {/* Hero */}
      <motion.div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-4" variants={item}>
        <img
          src={destination.image}
          alt={destination.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white">{destination.name}</h1>
          <p className="text-white/50 text-xs sm:text-sm mt-0.5 leading-relaxed">{destination.province} · {destination.description}</p>
        </div>
      </motion.div>

      {/* Quick stats - 4 compact cards */}
      <motion.div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4" variants={item}>
        {[
          { v: `${plan.days}天`, l: '行程', sub: `${TRANSPORT_LABELS[plan.transportMode]}` },
          { v: `${plan.people}人`, l: '人数', sub: `¥${budget.toLocaleString()}` },
          { v: `¥${(totalEstimate.total / 1000).toFixed(1)}k`, l: '预估', sub: `${budget >= totalEstimate.total ? '预算内' : '略超'}` },
          { v: destination.bestSeason.length > 8 ? destination.bestSeason.slice(0, 8) + '…' : destination.bestSeason, l: '最佳季节', sub: destination.province, tip: destination.bestSeason },
        ].map((s) => (
          <div key={s.l + s.sub} className="bg-bg-card/80 rounded-xl py-3 px-1.5 text-center border border-white/5 overflow-hidden" title={'tip' in s ? s.tip : ''}>
            <p className="text-lg sm:text-xl font-bold text-gold truncate">{s.v}</p>
            <p className="text-[10px] sm:text-xs text-text-muted">{s.l}</p>
            <p className="text-[9px] text-text-muted/50 truncate">{s.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Budget breakdown */}
      <motion.div className="bg-bg-card/80 rounded-2xl p-4 sm:p-5 mb-4 border border-white/5" variants={item}>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <span className="w-1 h-4 bg-brand rounded-full" /> 费用明细
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { l: `${TRANSPORT_LABELS[plan.transportMode]}往返${plan.transportNote ? ` (${plan.transportNote})` : ''}`, v: totalEstimate.transport },
            { l: '住宿', v: totalEstimate.accommodation },
            { l: '餐饮', v: totalEstimate.food },
            { l: '门票活动', v: totalEstimate.attractions },
          ].map((r) => (
            <div key={r.l} className="flex justify-between">
              <span className="text-text-muted">{r.l}</span>
              <span className="text-white font-medium">¥{r.v.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-white/5 pt-2.5 mt-2.5 flex justify-between items-center">
            <span className="font-bold text-white">总计</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gold text-lg">¥{totalEstimate.total.toLocaleString()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${budget >= totalEstimate.total ? 'bg-success/15 text-success' : 'bg-brand/15 text-brand'}`}>
                {budget >= totalEstimate.total ? '预算内' : '略超预算'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Daily plan */}
      <motion.div className="mb-4" variants={item}>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <span className="w-1 h-4 bg-brand rounded-full" /> 每日行程
        </h2>
        <div className="space-y-2">
          {dailyPlan.map((day, i) => (
            <div key={day.day} className="bg-bg-card/80 rounded-xl border border-white/5 overflow-hidden">
              <button
                onClick={() => toggleDay(i)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${expandedDays.includes(i) ? 'bg-brand text-white' : 'bg-brand/15 text-brand'}`}>
                    {day.day}
                  </span>
                  <div>
                    <span className="text-white text-sm font-medium">{day.title}</span>
                    <span className="text-text-muted/50 text-xs ml-2">{day.activities.length}个活动 · {day.meals.length}餐推荐</span>
                  </div>
                </div>
                <span className={`text-text-muted text-xs transition-transform duration-200 ${expandedDays.includes(i) ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedDays.includes(i) && (
                <div className="px-4 pb-4 space-y-2">
                  {day.activities.map((act, j) => (
                    <div key={j} className="flex gap-2.5 text-sm bg-bg/50 rounded-lg p-2.5">
                      <span className="text-brand mt-0.5 shrink-0">0{j + 1}</span>
                      <span className="text-text/80 leading-relaxed">{act}</span>
                    </div>
                  ))}
                  {day.hotel && (
                    <div className="flex items-start gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-xs shrink-0 mt-0.5">🏨</span>
                      <span className="text-xs text-gold/80 leading-relaxed">{day.hotel}</span>
                    </div>
                  )}
                  {day.meals.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-text-muted">🍜 推荐美食</span>
                      {day.meals.map((m, j) => (
                        <span key={j} className="text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attractions */}
      <motion.div className="mb-4" variants={item}>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <span className="w-1 h-4 bg-brand rounded-full" /> 推荐景点
        </h2>
        <div className="grid gap-2">
          {destination.attractions.map((a) => (
            <div key={a.name} className="bg-bg-card/80 rounded-xl p-3.5 border border-white/5 flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-lg shrink-0">📍</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-sm font-medium truncate">{a.name}</h3>
                  <span className="text-brand/70 text-xs shrink-0 ml-2">{a.duration}</span>
                </div>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accommodation + Foods in a nice grid */}
      <motion.div className="grid grid-cols-2 gap-2 mb-4" variants={item}>
        <div className="bg-bg-card/80 rounded-xl p-3.5 border border-white/5">
          <p className="text-text-muted text-xs mb-1.5">🏨 经济型住宿</p>
          <p className="text-white text-sm leading-relaxed">{destination.accommodation.budget}</p>
        </div>
        <div className="bg-bg-card/80 rounded-xl p-3.5 border border-white/5">
          <p className="text-text-muted text-xs mb-1.5">🏨 舒适型住宿</p>
          <p className="text-white text-sm leading-relaxed">{destination.accommodation.comfort}</p>
        </div>
      </motion.div>

      {/* Foods */}
      <motion.div className="mb-6" variants={item}>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <span className="w-1 h-4 bg-brand rounded-full" /> 必吃美食
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {destination.foods.map((f) => (
            <span key={f} className="px-3 py-1.5 bg-bg-card/80 rounded-full text-xs sm:text-sm text-text border border-white/5">
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Action bar */}
      <motion.div className="flex gap-2" variants={item}>
        <button
          onClick={handleFavorite}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
            faved
              ? 'bg-gold/10 text-gold border border-gold/20'
              : 'bg-bg-card text-text-muted border border-white/5 hover:bg-bg-card-hover'
          }`}
        >
          {faved ? '❤️ 已收藏' : '🤍 收藏'}
        </button>
        <button onClick={handleShare} disabled={sharing} className="flex-1 py-3 bg-bg-card rounded-xl text-text-muted text-sm font-medium border border-white/5 hover:bg-bg-card-hover transition-colors disabled:opacity-50">
          {sharing ? '⏳ 生成中' : '📸 分享长图'}
        </button>
        <button onClick={() => navigate('/')} className="flex-[1.5] py-3 bg-gradient-to-r from-brand to-brand-light rounded-xl text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98]">
          🎁 再来一次
        </button>
      </motion.div>
    </motion.div>
  )
}
