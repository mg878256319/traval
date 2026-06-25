import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { TransportMode } from '../types'
import { getCityTags } from '../utils/matching'
import { hasAIKey } from '../utils/ai'
import SettingsModal from '../components/SettingsModal'

const CITIES = [
  '北京','上海','广州','深圳','杭州','成都','重庆','西安','武汉','南京',
  '长沙','郑州','昆明','济南','青岛','厦门','沈阳','哈尔滨','大连','天津',
  '珠海','苏州','无锡','宁波','温州','福州','合肥','南昌','南宁','贵阳',
  '兰州','西宁','银川','乌鲁木齐','拉萨','海口','三亚','桂林','丽江',
  '大理','张家界','秦皇岛','烟台','威海','洛阳','开封','太原','呼和浩特',
  '长春','吉林','大庆','徐州','扬州','镇江','绍兴','泉州','漳州','佛山',
  '东莞','中山','惠州','湛江','北海','柳州','遵义','宜昌','襄阳','岳阳',
  '九江','赣州','包头','大同','运城','宝鸡','咸阳','绵阳','南充','宜宾',
  '德阳','乐山','攀枝花','西昌','曲靖','玉溪','安顺','铜仁','凤凰','黄山',
  '泰安','日照','济宁','淄博','潍坊','临沂','菏泽','保定','唐山','邯郸',
]

const TRANSPORT_OPTIONS: { mode: TransportMode; label: string; icon: string }[] = [
  { mode: 'flight', label: '飞机', icon: '✈️' },
  { mode: 'highspeed', label: '高铁', icon: '🚄' },
  { mode: 'train', label: '火车', icon: '🚂' },
  { mode: 'selfdrive', label: '自驾', icon: '🚗' },
]

const DAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10]

const TAG_CATEGORIES: { name: string; icon: string; tags: string[] }[] = [
  { name: '美食', icon: '🍜', tags: ['美食', '夜市', '火锅', '海鲜', '烧烤', '甜品', '早茶', '小吃'] },
  { name: '风景', icon: '🏞️', tags: ['自然', '海滩', '山水', '冰雪', '草原', '沙漠', '森林', '湖泊', '瀑布', '花海'] },
  { name: '人文', icon: '🏛️', tags: ['历史', '文化', '古迹', '古镇', '民族风情', '博物馆', '寺庙', '非遗'] },
  { name: '玩法', icon: '🎯', tags: ['文艺', '摄影', '户外', '网红打卡', '徒步', '骑行', '自驾游', '潜水', '滑雪', '温泉', '露营'] },
  { name: '都市', icon: '🏙️', tags: ['都市', '购物', '夜景', '夜生活', '主题公园', '演出'] },
  { name: '休闲', icon: '⛱️', tags: ['休闲', '避暑', '冬季', '亲子', '蜜月', '养老', '周末游'] },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [budget, setBudget] = useState(3000)
  const [days, setDays] = useState(3)
  const [people, setPeople] = useState(1)
  const [transportMode, setTransportMode] = useState<TransportMode>('highspeed')
  const [tags, setTags] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [vh, setVh] = useState(window.innerHeight)
  const [showSettings, setShowSettings] = useState(false)
  const aiReady = hasAIKey()

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Dynamic suggested tags based on selected city + static fallback
  const cityDynamicTags = useMemo(() => getCityTags(city), [city])

  function handleCityInput(val: string) {
    setCity(val)
    if (val.length > 0) {
      const filtered = CITIES.filter((c) => c.includes(val))
      setCitySuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }
  function addCustomTag() {
    const val = customInput.trim()
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val])
      setCustomInput('')
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!city.trim()) e.city = '请输入出发城市'
    if (budget < 200) e.budget = '预算至少200元'
    if (days < 1 || days > 10) e.days = '天数选择1-10天'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleOpen() {
    if (!validate()) return
    const params = new URLSearchParams({
      city,
      budget: String(budget),
      days: String(days),
      people: String(people),
      tags: tags.join(','),
      transport: transportMode,
    })
    navigate(`/reveal?${params.toString()}`)
  }

  const gap = vh < 650 ? 'gap-y-2' : vh < 800 ? 'gap-y-3' : 'gap-y-4'
  const top = vh < 650 ? 'pt-20' : vh < 800 ? 'pt-36' : 'pt-64'
  const titleSize = vh < 650 ? 'text-2xl' : vh < 800 ? 'text-3xl' : 'text-4xl'
  const formTop = vh < 650 ? 'pt-3' : 'pt-4'
  const inputSize = vh < 650 ? 'py-2 text-sm' : 'py-3'

  return (
    <div className={`flex-1 flex flex-col px-5 ${top}`}>
      {/* Title */}
      <motion.div
        className="text-center pb-3"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={`${titleSize} font-black mb-1`}>
          <motion.span
            className="inline-block text-gold"
            animate={{ filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >AI</motion.span>
          {' '}
          <motion.span
            className="text-white inline-block"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >盲盒旅行机</motion.span>
        </h1>
        <p className="text-text-muted/60 text-xs">输入想法，开启未知旅行</p>
        <button
          onClick={() => setShowSettings(true)}
          className={`mt-2 text-xs px-3 py-1 rounded-full transition-all ${
            aiReady
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-bg-card text-text-muted border border-white/5 hover:bg-bg-card-hover'
          }`}
        >
          {aiReady ? '🤖 AI已就绪' : '⚙️ 配置AI'}
        </button>
      </motion.div>

      {/* Form */}
      <motion.div
        className={`flex flex-col ${formTop} ${gap}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        {/* City */}
        <div className="relative">
          <label className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <span>📍</span>出发城市
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="输入城市名"
            className={`w-full bg-bg-card border border-white/10 rounded-xl ${inputSize} px-4 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-brand/40 transition-all`}
          />
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
              {citySuggestions.map((c) => (
                <button key={c} className="w-full text-left px-4 py-2.5 hover:bg-bg-card-hover transition-colors text-sm text-white"
                  onMouseDown={() => { setCity(c); setShowSuggestions(false) }}>📍 {c}</button>
              ))}
            </div>
          )}
          {errors.city && <p className="text-brand text-xs mt-1">{errors.city}</p>}
        </div>

        {/* Transport mode */}
        <div>
          <label className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5">
            <span>🚀</span>出行方式
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {TRANSPORT_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setTransportMode(opt.mode)}
                className={`py-2.5 rounded-xl transition-all ${
                  transportMode === opt.mode
                    ? 'bg-brand text-white shadow-lg shadow-brand/15'
                    : 'bg-bg-card text-text-muted hover:bg-bg-card-hover hover:text-white'
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="block text-[10px] mt-0.5">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <span>💰</span>预算
            <span className="text-gold font-bold ml-auto">{budget.toLocaleString()} 元</span>
          </label>
          <input type="range" min={200} max={20000} step={100} value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-brand h-2 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-text-muted/40 mt-0.5">
            <span>¥200</span><span>¥20,000</span>
          </div>
          {errors.budget && <p className="text-brand text-xs mt-1">{errors.budget}</p>}
        </div>

        {/* People + Days */}
        <div>
          <label className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5">
            <span>👥</span>人数与天数
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={`p${n}`} onClick={() => setPeople(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  people === n
                    ? 'bg-brand text-white shadow-lg shadow-brand/15'
                    : 'bg-bg-card text-text-muted hover:bg-bg-card-hover hover:text-white'
                }`}>{n}人</button>
            ))}
            <span className="w-px bg-white/10 mx-1 shrink-0" />
            {DAY_OPTIONS.map((d) => (
              <button key={`d${d}`} onClick={() => setDays(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  days === d
                    ? 'bg-brand text-white shadow-lg shadow-brand/15'
                    : 'bg-bg-card text-text-muted hover:bg-bg-card-hover hover:text-white'
                }`}>{d}天</button>
            ))}
          </div>
          {errors.days && <p className="text-brand text-xs mt-1">{errors.days}</p>}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-text-muted text-xs">
              <span>🎯</span>偏好
              <span className="text-text-muted/40 text-[10px]">
                {tags.length > 0 ? `已选${tags.length}个` : city.trim() ? `根据${city}推荐` : '选空随机'}
              </span>
            </label>
            {tags.length > 0 && (
              <button onClick={() => setTags([])} className="text-[10px] text-text-muted hover:text-brand transition-colors">
                清空
              </button>
            )}
          </div>
          {/* Selected tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className="rounded-full text-xs font-medium transition-all px-3 py-1.5 bg-brand text-white shadow-md shadow-brand/15 flex items-center gap-1">
                  {tag} <span className="text-[10px] opacity-60">✕</span>
                </button>
              ))}
            </div>
          )}
          {/* Tag categories */}
          <div className="space-y-1.5 bg-bg-card/50 rounded-xl p-3 border border-white/5">
            {TAG_CATEGORIES.map((cat) => {
              const catTags = cat.tags.filter((t) => {
                if (city.trim()) {
                  return cityDynamicTags.includes(t) || true
                }
                return true
              })
              if (catTags.length === 0) return null
              return (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted/60 w-10 shrink-0">{cat.icon}{cat.name}</span>
                  <div className="flex flex-wrap gap-1">
                    {catTags.map((tag) => {
                      const active = tags.includes(tag)
                      const isDynamic = city.trim() && cityDynamicTags.includes(tag)
                      return (
                        <button key={tag} onClick={() => toggleTag(tag)}
                          className={`rounded-full text-[11px] font-medium transition-all px-2.5 py-1 ${
                            active
                              ? 'bg-brand text-white shadow-md shadow-brand/15'
                              : isDynamic
                                ? 'bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20'
                                : 'bg-bg/60 text-text-muted hover:bg-bg-card-hover hover:text-white'
                          }`}>{tag}</button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {/* Custom tag input */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
              <span className="text-[10px] text-text-muted/60 w-10 shrink-0">自定义</span>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                placeholder="输入标签，回车添加"
                className="flex-1 bg-bg/50 text-white text-[11px] px-2.5 py-1 rounded-full placeholder:text-text-muted/30 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <motion.button
            onClick={handleOpen}
            className="relative w-full rounded-2xl text-white font-bold tracking-wider overflow-hidden group"
            style={{ height: vh < 650 ? 48 : 56 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-brand to-brand-light opacity-90" />
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="absolute -inset-1 rounded-2xl bg-brand/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2 text-lg">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >🎁</motion.span>
              开启旅行盲盒
            </span>
          </motion.button>
          <p className="text-center text-text-muted/30 text-xs mt-2">每次开盒都是一次惊喜</p>
        </div>
      </motion.div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
