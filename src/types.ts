export type TransportMode = 'flight' | 'train' | 'highspeed' | 'selfdrive'

export interface Destination {
  id: string
  name: string
  province: string
  description: string
  image: string
  tags: string[]
  budgetPerDay: [number, number]
  bestSeason: string
  attractions: { name: string; description: string; duration: string }[]
  foods: string[]
  accommodation: { budget: string; comfort: string }
}

export interface TripPlan {
  destination: Destination
  departureCity: string
  budget: number
  days: number
  people: number
  transportMode: TransportMode
  transportNote?: string
  dailyPlan: { day: number; title: string; activities: string[]; meals: string[]; hotel?: string }[]
  totalEstimate: {
    transport: number
    accommodation: number
    food: number
    attractions: number
    total: number
  }
}

export interface TripResult {
  id: string
  plan: TripPlan
  createdAt: string
  tags: string[]
}

export interface SearchParams {
  departureCity: string
  budget: number
  days: number
  people: number
  tags: string[]
  transportMode: TransportMode
}
