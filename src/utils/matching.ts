import type { Destination, TripPlan, SearchParams, TransportMode } from '../types'
import { destinations } from '../data/destinations'

// City characteristic tags for dynamic generation
const CITY_TAGS: Record<string, string[]> = {
  '北京': ['历史', '文化', '首都', '古迹', '美食'],
  '上海': ['都市', '美食', '购物', '文艺', '夜景'],
  '广州': ['美食', '都市', '购物', '夜生活'],
  '深圳': ['都市', '科技', '购物', '海滩'],
  '杭州': ['自然', '文化', '休闲', '美食', '文艺'],
  '成都': ['美食', '休闲', '文化', '熊猫', '网红打卡'],
  '重庆': ['美食', '夜景', '山城', '网红打卡'],
  '西安': ['历史', '文化', '美食', '古迹'],
  '武汉': ['美食', '历史', '都市'],
  '南京': ['历史', '文化', '美食', '古都'],
  '长沙': ['美食', '夜生活', '网红打卡', '娱乐'],
  '郑州': ['历史', '文化', '美食'],
  '昆明': ['自然', '休闲', '民族风情', '避暑'],
  '济南': ['自然', '历史', '美食', '休闲'],
  '青岛': ['海滩', '美食', '建筑', '休闲'],
  '厦门': ['海岛', '文艺', '美食', '休闲'],
  '沈阳': ['历史', '美食', '都市'],
  '哈尔滨': ['冰雪', '建筑', '美食', '冬季'],
  '大连': ['海滩', '都市', '美食', '休闲'],
  '天津': ['美食', '历史', '都市', '文艺'],
}

export function getCityTags(city: string): string[] {
  return CITY_TAGS[city] || ['美食', '自然', '历史', '休闲']
}

const TRANSPORT_FACTORS: Record<TransportMode, number> = {
  flight: 1.0,
  highspeed: 0.65,
  train: 0.35,
  selfdrive: 0.5,
}

function isGoodSeason(season: string, month: number): boolean {
  // Parse "3-6月, 9-11月" or "全年皆宜" or "12-2月(冰雪), 6-8月(避暑)"
  if (season.includes('全年皆宜')) return true
  const parts = season.split(/[,，]/)
  for (const part of parts) {
    const m = part.match(/(\d+)\s*-\s*(\d+)\s*月/)
    if (m) {
      const start = parseInt(m[1]), end = parseInt(m[2])
      if (start <= end) { if (month >= start && month <= end) return true }
      else { if (month >= start || month <= end) return true } //跨年如12-2月
    }
  }
  return false
}

export function matchDestination(params: SearchParams): Destination {
  const perPersonDaily = params.budget / Math.max(params.people, 1) / Math.max(params.days, 1)
  const currentMonth = new Date().getMonth() + 1

  // Exclude departure city + filter by season + budget
  const candidates = destinations.filter((d) => {
    if (d.name === params.departureCity) return false
    if (!isGoodSeason(d.bestSeason, currentMonth)) return false
    return true
  })

  // Budget filter: prefer destinations where budget fits well
  const budgetOk = candidates.filter((d) => {
    const [low, high] = d.budgetPerDay
    return perPersonDaily >= low * 0.5 && perPersonDaily <= high * 1.5
  })
  // Relaxed filter fallback
  const budgetRelaxed = candidates.filter((d) => {
    const [low, high] = d.budgetPerDay
    return perPersonDaily >= low * 0.3 && perPersonDaily <= high * 2.5
  })

  const pool = budgetOk.length > 0 ? budgetOk : (budgetRelaxed.length > 0 ? budgetRelaxed : (candidates.length > 0 ? candidates : destinations))

  // Weighted random: tag overlap is HEAVILY weighted to ensure relevance
  const scored = pool.map((d) => {
    const tagOverlap = params.tags.length > 0
      ? d.tags.filter((t) => params.tags.includes(t)).length
      : 0
    // If user selected tags, destinations with no tag match get very low weight
    const tagWeight = params.tags.length > 0 && tagOverlap === 0 ? 0.1 : 1
    return { dest: d, weight: tagWeight * (1 + tagOverlap * 5) }
  })

  const totalWeight = scored.reduce((s, x) => s + x.weight, 0)
  let roll = Math.random() * totalWeight
  for (const { dest, weight } of scored) {
    roll -= weight
    if (roll <= 0) return dest
  }
  return scored[scored.length - 1].dest
}

export function generateTripPlan(
  destination: Destination,
  params: SearchParams,
): TripPlan {
  const people = Math.max(params.people, 1)
  const perPersonDaily = params.budget / people / Math.max(params.days, 1)
  const maxAttractions = params.days === 1 ? 1 : Math.min(params.days + 1, destination.attractions.length)
  const selectedAttractions = shuffle([...destination.attractions]).slice(0, maxAttractions)

  const dailyPlan = []
  const totalDays = Math.max(params.days, 1)

  // Distribute attractions evenly across all days
  // Hotel tier based on per-room budget (2 people share 1 room)
  const perRoomBudget = (params.budget * 0.35) / Math.ceil(params.people / 2) / Math.max(totalDays - 1, 1)

  for (let d = 0; d < totalDays; d++) {
    let dayAttractions: typeof selectedAttractions
    if (totalDays === 1) {
      dayAttractions = selectedAttractions
    } else {
      // Split into roughly equal chunks per day
      const perDay = Math.ceil(selectedAttractions.length / totalDays)
      const start = d * perDay
      dayAttractions = selectedAttractions.slice(start, start + perDay)
    }

    dailyPlan.push({
      day: d + 1,
      title: getDayTitle(d, totalDays),
      activities: dayAttractions.length > 0
        ? dayAttractions.map((a) => `${a.name}（${a.duration}）：${a.description}`)
        : ['自由探索，感受城市氛围'],
      meals: [
        destination.foods[Math.floor(Math.random() * destination.foods.length)],
        destination.foods[Math.floor(Math.random() * destination.foods.length)],
      ],
      hotel: totalDays > 1 && d < totalDays - 1
        ? (() => {
            const near = dayAttractions.length > 0 ? dayAttractions[dayAttractions.length - 1].name : '市中心'
            // Same hotel if first day or activities in same area, otherwise suggest moving
            const prevDayHasSameArea = d > 0 && dayAttractions.length > 0
            const tag = prevDayHasSameArea ? '（续住，活动范围相近）' : ''
            const hotels = ['如家精选', '汉庭优佳', '全季酒店', '亚朵酒店']
            const name = hotels[d % hotels.length]
            if (perRoomBudget >= 2000) return `${name}(近${near}) 约${Math.round(perRoomBudget)}元/晚${tag}`
            if (perRoomBudget >= 800) return `${name}(近${near}) 约${Math.round(perRoomBudget)}元/晚${tag}`
            return `${name}(近${near}) 约${Math.round(perRoomBudget)}元/晚${tag}`
          })()
        : undefined,
    })
  }

  // Realistic cost estimates based on destination's actual price range
  const [lowBudget, highBudget] = destination.budgetPerDay
  const dailyBase = Math.max(lowBudget, Math.min(perPersonDaily, highBudget))

  // Accommodation: rooms shared (2 people per room), not per-person
  const rooms = Math.ceil(people / 2)
  const accPerNight = Math.round(dailyBase * 0.4)
  const accCost = accPerNight * Math.max(totalDays - 1, 1) * rooms

  // Food: ~30% of daily budget per person
  const foodCost = Math.round(dailyBase * 0.3 * totalDays * people)

  // Transport: per-person for flight/train, shared for self-drive
  const transportPerPerson = getTransportCost(params.departureCity, destination.name, params.transportMode)
  const transportFactor = TRANSPORT_FACTORS[params.transportMode] || 1
  const transportPeople = params.transportMode === 'selfdrive' ? 1 : people
  const transportEstimate = Math.round(transportPerPerson * transportFactor * transportPeople)

  // Attractions: real ticket prices typically 50-200 CNY per attraction
  const ticketPrices: Record<string, number> = {
    '大熊猫繁育研究基地': 55, '都江堰': 80, '宽窄巷子': 0, '锦里古街': 0,
    '洪崖洞': 0, '磁器口古镇': 0, '长江索道': 20, '武隆天生三桥': 135,
    '秦始皇兵马俑': 120, '西安城墙': 54, '回民街': 0, '大唐不夜城': 0,
    '丽江古城': 50, '玉龙雪山': 100, '束河古镇': 0, '泸沽湖': 100,
    '亚龙湾': 0, '蜈支洲岛': 144, '天涯海角': 81, '南山文化旅游区': 129,
    '洱海': 0, '大理古城': 0, '苍山': 40, '喜洲古镇': 0,
    '故宫博物院': 60, '长城(八达岭)': 40, '颐和园': 30, '南锣鼓巷': 0,
    '外滩': 0, '迪士尼乐园': 475, '豫园': 40, '武康路': 0,
    '鼓浪屿': 35, '曾厝垵': 0, '环岛路': 0, '南普陀寺': 0,
    '漓江': 215, '阳朔西街': 0, '龙脊梯田': 80, '象鼻山': 55,
    '西湖': 0, '灵隐寺': 75, '西溪湿地': 80, '宋城': 320,
    '中山陵': 0, '夫子庙-秦淮河': 0, '南京博物院': 0, '明孝陵': 70,
    '橘子洲头': 0, '岳麓山': 0, '太平老街': 0, '湖南省博物馆': 0,
    '栈桥': 0, '八大关': 0, '崂山': 90, '青岛啤酒博物馆': 60,
    '石林': 130, '滇池': 0, '云南民族村': 90, '翠湖公园': 0,
    '冰雪大世界': 330, '中央大街': 0, '圣索菲亚教堂': 20, '太阳岛': 30,
    '张家界国家森林公园': 228, '天门山': 278, '玻璃栈道': 0, '黄龙洞': 100,
    '黄河风情线': 0, '白塔山': 0, '甘肃省博物馆': 0, '正宁路夜市': 0,
  }
  let attrCost = 0
  selectedAttractions.forEach((a) => {
    attrCost += (ticketPrices[a.name] ?? 80) * people
  })
  attrCost = Math.round(attrCost)

  const total = transportEstimate + accCost + foodCost + attrCost

  return {
    destination,
    departureCity: params.departureCity,
    budget: params.budget,
    days: totalDays,
    people,
    transportMode: params.transportMode,
    dailyPlan,
    totalEstimate: {
      transport: transportEstimate,
      accommodation: Math.round(accCost),
      food: Math.round(foodCost),
      attractions: Math.round(attrCost),
      total: Math.round(total),
    },
  }
}

function getTransportCost(from: string, to: string, mode: TransportMode): number {
  const key = `${from}-${to}`
  const estimates: Record<string, number> = {
    '北京-上海': 1200, '上海-北京': 1200,
    '北京-成都': 1500, '成都-北京': 1500,
    '北京-西安': 1000, '西安-北京': 1000,
    '上海-成都': 1400, '成都-上海': 1400,
    '上海-厦门': 800, '厦门-上海': 800,
    '上海-杭州': 300, '杭州-上海': 300,
    '成都-重庆': 300, '重庆-成都': 300,
    '成都-丽江': 800, '丽江-成都': 800,
    '北京-哈尔滨': 900, '哈尔滨-北京': 900,
    '广州-三亚': 600, '深圳-三亚': 500,
    '上海-三亚': 1200, '北京-三亚': 1500,
    '成都-大理': 700, '大理-成都': 700,
    '北京-南京': 800, '南京-北京': 800,
    '上海-南京': 300, '南京-上海': 300,
    '北京-青岛': 600, '上海-青岛': 700,
    '成都-长沙': 800, '长沙-成都': 800,
    '北京-长沙': 1000, '上海-长沙': 900,
    '成都-昆明': 600, '昆明-成都': 600,
    '北京-桂林': 1200, '上海-桂林': 1000,
    '成都-桂林': 700, '桂林-成都': 700,
    '北京-张家界': 1100, '上海-张家界': 1000,
    '长沙-张家界': 300, '张家界-长沙': 300,
    '北京-兰州': 1000, '兰州-北京': 1000,
    '西安-兰州': 400, '兰州-西安': 400,
    '上海-西安': 1000, '西安-上海': 1000,
    '成都-西安': 600, '西安-成都': 600,
  }

  const base = estimates[key] ?? Math.round(500 + Math.random() * 800)

  // Adjust for transport mode
  switch (mode) {
    case 'highspeed': return Math.round(base * 0.7)
    case 'train': return Math.round(base * 0.4)
    case 'selfdrive': return Math.round(base * 0.5)
    default: return base
  }
}

function getDayTitle(day: number, total: number): string {
  if (total === 1) return '一日游'
  if (day === 0) return '第1天 · 抵达探索'
  if (day === total - 1) return `第${total}天 · 深度游玩+返程`
  return `第${day + 1}天`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
