# AI盲盒旅行机 — 设计文档

## 概述

一个纯前端网页应用。用户输入出发城市、预算、天数和偏好标签，点击按钮触发盲盒开启动画，随机揭晓一个匹配条件的国内旅行目的地，并展示完整的旅行方案。支持历史记录、收藏和分享。

## 技术栈

React 18 + Vite + TypeScript + Tailwind CSS + framer-motion

## 路由

- `/` — 首页（输入表单）
- `/reveal` — 盲盒开启动画页
- `/result` — 旅行方案结果页
- `/history` — 历史记录
- `/favorites` — 收藏列表

## 数据层

~18个国内热门城市，每个预置以下数据结构：

```ts
interface Destination {
  id: string
  name: string
  province: string
  description: string
  image: string // unsplash remote URL
  tags: string[]
  budgetPerDay: [number, number] // 每日人均预算范围
  bestSeason: string
  attractions: { name: string; description: string }[]
  foods: string[]
  accommodation: { budget: string; comfort: string }
  dailyPlanTemplate: string[] // 每日行程描述
}
```

智能匹配逻辑：预算/天数筛选出候选池 → 偏好标签交集加权 → 从加权池中随机抽取。

## 核心流程

1. 首页填表 → 校验 → 跳转 `/reveal?data=<encoded>`
2. RevealPage 播放动画：盲盒抖动 → 翻转 → 光效 → 目的地名称淡入
3. 动画结束 → 生成旅行方案 → 跳转 `/result`
4. ResultPage 展示方案，提供收藏、分享、再来一次、查看历史

## 组件树

```
App (BrowserRouter)
├── Layout (底部导航栏)
├── HomePage
│   ├── CityInput (出发城市，含自动补全)
│   ├── BudgetSlider (预算范围滑块)
│   ├── DaySelector (天数选择 2-7天)
│   ├── TagSelector (偏好标签多选)
│   └── OpenButton ("开启旅行盲盒" CTA)
├── RevealPage
│   ├── BlindBoxAnimation (3D盒子CSS动画)
│   └── DestinationReveal (目的地揭晓过渡)
├── ResultPage
│   ├── HeroImage (目的地头图)
│   ├── TripOverview (概览卡片)
│   ├── DayPlanList (每日行程折叠)
│   ├── BudgetBreakdown (预算明细)
│   └── ActionBar (收藏/分享/再来一次)
├── HistoryPage
└── FavoritesPage
```

## 持久化

localStorage 存储：
- `travel-history` — 最近10次开盒结果
- `travel-favorites` — 收藏的目的地ID列表

## 非功能需求

- 动画流畅，60fps
- 移动端优先，响应式布局
- 首屏加载 < 3s
