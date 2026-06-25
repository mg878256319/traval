import type { TripResult } from '../types'

const HISTORY_KEY = 'travel-history'
const FAVORITES_KEY = 'travel-favorites'

export function getHistory(): TripResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToHistory(result: TripResult): void {
  const history = getHistory()
  history.unshift(result)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)))
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

export function getFavorites(): TripResult[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function toggleFavorite(result: TripResult): boolean {
  const favorites = getFavorites()
  const index = favorites.findIndex((f) => f.id === result.id)
  if (index >= 0) {
    favorites.splice(index, 1)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    return false
  } else {
    favorites.unshift(result)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    return true
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((f) => f.id === id)
}
