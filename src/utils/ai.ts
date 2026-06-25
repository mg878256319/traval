import type { TripPlan, TripResult, TransportMode } from '../types'
import type { Destination } from '../types'

export interface AISettings {
  provider: 'anthropic' | 'openai'
  apiKey: string
  model: string
  baseUrl: string
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  apiKey: '',
  model: 'deepseek-v4-pro',
  baseUrl: 'https://api.deepseek.com',
}

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem('ai-settings')
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    let changed = false
    if (parsed.model === 'deepseek-chat') { parsed.model = 'deepseek-v4-pro'; changed = true }
    if (parsed.baseUrl === 'https://api.deepseek.com/v1') { parsed.baseUrl = 'https://api.deepseek.com'; changed = true }
    if (changed) localStorage.setItem('ai-settings', JSON.stringify(parsed))
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveAISettings(s: AISettings): void {
  localStorage.setItem('ai-settings', JSON.stringify(s))
}

export function hasAIKey(): boolean {
  return getAISettings().apiKey.length > 0
}

const TRANSPORT_NAMES: Record<TransportMode, string> = {
  flight: '飞机',
  highspeed: '高铁',
  train: '火车',
  selfdrive: '自驾',
}

function buildPrompt(params: SearchParams): string {
  const now = new Date()
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const tagRequirement = params.tags.length > 0
    ? `用户选择了标签：${params.tags.join('、')}。你推荐的城市必须高度匹配这些标签！例如用户选了"美食"，必须推荐以美食闻名的城市；选了"海滩"，必须是沿海城市；选了"历史"，必须是历史名城。标签匹配度是最重要的筛选条件。`
    : ''

  const isMultiDay = params.days >= 5

  return `你是资深中国旅行规划师。现在是${monthNames[now.getMonth()]}，请根据用户需求生成详细旅行方案。

${isMultiDay ? `**重要**：用户选择了${params.days}天行程，这是一个多日深度游。你应该推荐一条旅行线路（2-3个相近的城市/景点组成的区域环线），而不是只待在一个城市。例如：5天可推荐"成都+都江堰+青城山"，7天可推荐"大理+丽江+香格里拉"或"张家界+凤凰古城"，10天可推荐"云南大环线"或"西北青甘环线"。每天移动到下一个目的地，酒店也跟着换。` : `用户选择了${params.days}天行程，推荐一个城市及周边深度游玩。`}

## 硬性约束（必须满足，否则方案无效）
${tagRequirement}
1. **预算严格匹配（第一优先）**：总预算${params.budget}元是${params.people}个人的全部费用上限。预算充足时大胆花——优先公务舱/头等舱、五星级酒店、高档餐厅、专车包车；预算紧张时自动降级。必须精确计算到不超过预算
2. **天数完整（第二优先）**：用户选了${params.days}天，dailyPlan必须恰好${params.days}个元素，每天都要有完整的上/下午/晚上安排，不能偷懒跳过任何一天
3. **标签匹配**：推荐城市必须和用户选择的偏好标签高度吻合
4. **季节合适**：必须是${monthNames[now.getMonth()]}适合去的城市
5. **不能推荐${params.departureCity}**

## 用户需求
- 从${params.departureCity}出发，${params.people}人，${params.days}天
- 出行方式：${TRANSPORT_NAMES[params.transportMode]}
- 总预算：${params.budget}元（硬上限，不可超）

## 丰俭由人 — 预算决定一切，不设消费上限
${params.people}人${params.days}天总计${params.budget}元。核心理念：**有多少钱办多大事，预算内尽可能花到位**。

费用规则：住宿=${params.people}人住${Math.ceil(params.people / 2)}间房；交通按${params.people}人(自驾按1车)；餐饮门票按${params.people}人。

**所有消费只以总预算${params.budget}元为上限，不设单项限制。预算充裕就大胆花——公务舱头等舱、五星级酒店、黑珍珠米其林、VIP包车导览都要安排上。预算紧张就精打细算。各项费用加起来不超过${params.budget}元即可。**

## 预算分配参考
- 交通约占总预算的${Math.round(params.transportMode === 'flight' ? 40 : params.transportMode === 'highspeed' ? 30 : params.transportMode === 'selfdrive' ? 20 : 15)}%
- 住宿约占总预算的${Math.round(params.transportMode === 'flight' ? 30 : 35)}%
- 餐饮约占总预算的20%
- 门票+其他约占总预算的${Math.round(params.transportMode === 'flight' ? 10 : 15)}%
- **如果某项费用导致超预算，必须调整方案直到控制在预算内**
- **费用计算规则**：${params.people}人出行${isMultiDay ? '，跨城交通费=各段高铁/大巴费用总和×${params.people}人' : ''}，交通费=单人票价×${params.people}（自驾则不分人数），住宿费=每间房价格×入住天数（${params.people}人住${Math.ceil(params.people / 2)}间），餐饮费=人均餐费×${params.people}×餐数，门票费=单人票价×${params.people}，total必须≤${params.budget}

## 方案质量要求
### 每日行程（必须非常详细，每个活动至少50字描述）
- 每天必须分三个时段：上午（含出发时间）、下午、晚上
- 每个时段写清楚：几点出发、去哪个景点、怎么去（步行/公交/打车+耗时）、玩多久、门票多少钱、有什么亮点
- 每个景点至少写2-3句话描述具体玩什么、看什么
- 每天推荐2餐当地美食：具体菜名、人均价格、为什么推荐、推荐哪家店或哪个区域
- 行程节奏合理，景点间的衔接要自然流畅
- **dailyPlan必须恰好${params.days}天**，每一天都要有详细的上/下午/晚上安排${isMultiDay ? '，每天标注当前所在城市，不同城市之间写明交通方式（高铁/大巴/自驾）和耗时' : ''}，不能合并天数、不能偷懒、不能最后一天只写"返程"不安排活动

- **酒店就近原则**：每天推荐的酒店必须靠近当天最后一个景点${isMultiDay ? '。多日跨城线路每天换一个城市，酒店自然跟着换' : '。如果第二天仍在10公里内可续住，跨区域就换'}
- 酒店档次按每间每晚预算匹配：豪华型≥1000元 | 舒适型500-1000元 | 经济型250-500元 | 实惠型<250元
- 示例格式："上午8:30从酒店步行10分钟到达XXX景点（门票¥XX），建议游玩2-3小时。这里以XXX闻名，可以参观XXX、XXX。中午12:00在附近的XXX路吃午餐。"

### ⚠️ 数据来源要求（必须真实可靠）
你必须像专业旅行规划师一样，从以下权威渠道获取信息来制定方案：
- **交通票价**：参考12306或携程/去哪儿的实际票价。必须标注舱位/座席类型（如经济舱/头等舱、二等座/一等座/商务座、硬卧/软卧）。预算充裕可选头等舱/商务座，但要在行程里写清楚，让人明白为什么交通费高
- **酒店价格**：参考携程/美团/飞猪上该城市的实际酒店挂牌价
- **餐饮价格**：参考大众点评/美团上该城市餐厅的实际人均消费
- **景点门票**：参考各景区官网或携程/美团上标注的官方票价
- **景点信息**：优先推荐该城市的大众认可景点（马蜂窝/小红书/携程热门榜单上的），包含官方景区和网红打卡地，不得虚构
- **美食信息**：推荐该城市大众认可的美食（大众点评必吃榜/美团热门/小红书/本地人推荐），包含传统老字号和网红人气店

**不确定时**：标注"约XX元（请以实际为准）"，宁愿低估不虚高
**预算硬约束**：所有费用合计必须 ≤ ${params.budget}元，如预算紧张优先选免费景点和实惠住宿

### 城市信息
- description写2-3句完整介绍，包含城市特色、适合${monthNames[now.getMonth()]}去的原因
- tags必须和用户标签高度相关
- attractions推荐4-5个最有代表性的景点

请返回JSON（不要markdown标记）：
{
  "destination": {
    "name": "${isMultiDay ? '线路名称如"成都+九寨沟4日环线"' : '城市名'}",
    "province": "${isMultiDay ? '途经省份' : '省份'}",
    "description": "${isMultiDay ? '线路亮点介绍（涵盖各城市特色）' : '2-3句完整介绍'}",
    "tags": ["标签"],
    "bestSeason": "最佳季节",
    "attractions": [{"name":"景点","description":"介绍","duration":"时长"}],
    "foods": ["美食1","美食2","美食3","美食4","美食5"],
    "accommodation": {"budget":"经济型 价格/晚","comfort":"舒适型 价格/晚"}
  },
  "costBreakdown": {"transport":数字,"transportNote":"经济舱/高铁二等座等说明","accommodation":数字,"food":数字,"attractions":数字,"total":数字},
  "dailyPlan": [
    {"day":1,"title":"第1天主题","activities":["上午：...","下午：...","晚上：..."],"meals":["午餐：...","晚餐：..."],"hotel":"酒店名 ￥XX/晚 距XX景点步行X分钟 推荐理由"}
  ],
  "tips": "一句话"
}`
}

export async function generateAIPlan(params: SearchParams): Promise<TripResult> {
  const settings = getAISettings()
  const prompt = buildPrompt(params)

  let content: string

  try {
    if (settings.provider === 'anthropic') {
      content = await callAnthropic(settings, prompt)
    } else {
      content = await callOpenAI(settings, prompt)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查API地址和网络连接')
    }
    throw err
  }

  // Extract JSON
  let jsonStr = ''
  const mdMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) {
    jsonStr = mdMatch[1].trim()
  } else {
    const start = content.indexOf('{')
    if (start === -1) throw new Error(`AI未返回JSON。响应: ${content.slice(0, 300)}`)
    let depth = 0
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++
      if (content[i] === '}') depth--
      if (depth === 0) { jsonStr = content.slice(start, i + 1); break }
    }
  }
  if (!jsonStr) throw new Error(`无法解析JSON。响应: ${content.slice(0, 300)}`)

  let aiResult: any
  try { aiResult = JSON.parse(jsonStr) } catch {
    throw new Error(`JSON解析失败: ${jsonStr.slice(0, 300)}`)
  }

  // Build destination from AI response
  const d = aiResult.destination || {}
  const destination: Destination = {
    id: d.name || 'unknown',
    name: d.name || '神秘城市',
    province: d.province || '',
    description: d.description || '',
    image: `https://source.unsplash.com/800x400/?${encodeURIComponent(d.name || 'china')},landmark,scenery,attraction`,
    tags: Array.isArray(d.tags) ? d.tags : [],
    budgetPerDay: [100, 1000],
    bestSeason: d.bestSeason || '全年皆宜',
    attractions: Array.isArray(d.attractions) ? d.attractions : [],
    foods: Array.isArray(d.foods) ? d.foods : [],
    accommodation: d.accommodation || { budget: '', comfort: '' },
  }

  const dp = Array.isArray(aiResult.dailyPlan) ? aiResult.dailyPlan : []
  const people = Math.max(params.people, 1)
  const totalDays = Math.max(params.days, 1)

  // Use AI's cost breakdown (must match itinerary), fallback to calculation
  const cb = aiResult.costBreakdown || {}
  const transportCost = Number(cb.transport || aiResult.transportCost) || 0
  const accCost = Number(cb.accommodation) || Math.round(params.budget / totalDays * 0.35 * totalDays)
  const foodCost = Number(cb.food) || Math.round(params.budget / totalDays * 0.25 * totalDays)
  const attrCost = Number(cb.attractions) || Math.round((d.attractions?.length || 3) * 80 * people)
  const totalCost = Number(cb.total) || (transportCost + accCost + foodCost + attrCost)

  const plan: TripPlan = {
    destination,
    departureCity: params.departureCity,
    budget: params.budget,
    days: totalDays,
    people,
    transportMode: params.transportMode,
    transportNote: cb.transportNote || undefined,
    dailyPlan: dp.map((d: any) => ({
      day: d.day || 1,
      title: d.title || '',
      activities: Array.isArray(d.activities) ? d.activities : [],
      meals: Array.isArray(d.meals) ? d.meals : [],
      hotel: d.hotel || undefined,
    })),
    totalEstimate: {
      transport: transportCost,
      accommodation: accCost,
      food: foodCost,
      attractions: attrCost,
      total: totalCost,
    },
  }

  return {
    id: `${destination.name}-${Date.now()}`,
    plan,
    createdAt: new Date().toISOString(),
    tags: params.tags,
  }
}

async function callAnthropic(settings: AISettings, prompt: string): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: settings.model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!resp.ok) { const err = await resp.text().catch(() => ''); throw new Error(`API ${resp.status}: ${err.slice(0, 200)}`) }
  const data = await resp.json()
  return data.content[0].text
}

async function callOpenAI(settings: AISettings, prompt: string): Promise<string> {
  const baseUrl = settings.baseUrl.replace(/\/+$/, '')
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!resp.ok) { const err = await resp.text().catch(() => ''); throw new Error(`API ${resp.status}: ${err.slice(0, 300)}`) }
  const data = await resp.json()
  if (!data.choices?.[0]?.message?.content) throw new Error(`返回异常: ${JSON.stringify(data).slice(0, 300)}`)
  return data.choices[0].message.content
}
