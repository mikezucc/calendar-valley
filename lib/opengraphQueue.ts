import { Event } from './csvParser'

interface QueueItem {
  url: string
  priority: number
  timestamp: number
}

interface OpenGraphData {
  title?: string
  description?: string
  image?: string
  site_name?: string
  url?: string
}

class OpenGraphQueue {
  private queue: QueueItem[] = []
  private processing = false
  private cache = new Map<string, OpenGraphData>()
  private concurrentRequests = 3
  private requestDelay = 100
  private listeners = new Map<string, Set<(data: OpenGraphData | null) => void>>()

  constructor() {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('og_cache')
      if (cached) {
        try {
          const entries = JSON.parse(cached)
          this.cache = new Map(entries)
        } catch (e) {
          console.error('Failed to restore cache:', e)
        }
      }
    }
  }

  private saveCache() {
    if (typeof window !== 'undefined') {
      try {
        const entries = Array.from(this.cache.entries())
        sessionStorage.setItem('og_cache', JSON.stringify(entries))
      } catch (e) {
        console.error('Failed to save cache:', e)
      }
    }
  }

  addToQueue(url: string, priority: number = 0) {
    // Skip if already cached
    if (this.cache.has(url)) {
      this.notifyListeners(url, this.cache.get(url)!)
      return
    }

    // Skip if already in queue, but update priority if higher
    const existing = this.queue.findIndex(item => item.url === url)
    if (existing !== -1) {
      if (this.queue[existing].priority < priority) {
        this.queue[existing].priority = priority
        this.sortQueue()
      }
      return
    }

    this.queue.push({
      url,
      priority,
      timestamp: Date.now()
    })

    this.sortQueue()

    if (!this.processing) {
      this.processQueue()
    }
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.timestamp - b.timestamp
    })
  }

  subscribe(url: string, callback: (data: OpenGraphData | null) => void) {
    if (!this.listeners.has(url)) {
      this.listeners.set(url, new Set())
    }
    this.listeners.get(url)!.add(callback)

    if (this.cache.has(url)) {
      callback(this.cache.get(url)!)
    }
  }

  unsubscribe(url: string, callback: (data: OpenGraphData | null) => void) {
    const callbacks = this.listeners.get(url)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(url)
      }
    }
  }

  private notifyListeners(url: string, data: OpenGraphData | null) {
    const callbacks = this.listeners.get(url)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true

    const batch = this.queue.splice(0, this.concurrentRequests)

    await Promise.all(
      batch.map(async (item) => {
        try {
          const data = await this.fetchOpenGraph(item.url)
          this.cache.set(item.url, data)
          this.notifyListeners(item.url, data)
        } catch (error) {
          console.error(`Failed to fetch OG data for ${item.url}:`, error)
          this.notifyListeners(item.url, null)
        }
      })
    )

    this.saveCache()

    if (this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      this.processQueue()
    } else {
      this.processing = false
    }
  }

  private async fetchOpenGraph(url: string): Promise<OpenGraphData> {
    try {
      const response = await fetch(`/api/opengraph?url=${encodeURIComponent(url)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching OpenGraph data:', error)
      return {
        url
      }
    }
  }

  getCached(url: string): OpenGraphData | undefined {
    return this.cache.get(url)
  }

  clear() {
    this.queue = []
    this.cache.clear()
    this.listeners.clear()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('og_cache')
    }
  }
}

export const ogQueue = new OpenGraphQueue()

export function prioritizeEvents(events: Event[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = a.date.getTime()
    const bTime = b.date.getTime()
    const todayTime = today.getTime()
    
    const aIsFuture = aTime >= todayTime
    const bIsFuture = bTime >= todayTime
    
    // Future events come first
    if (aIsFuture && !bIsFuture) return -1
    if (!aIsFuture && bIsFuture) return 1
    
    // Among future events, sort by closest to today
    if (aIsFuture && bIsFuture) {
      return aTime - bTime
    }
    
    // Among past events, sort by most recent first
    return bTime - aTime
  })
  
  sortedEvents.forEach((event, index) => {
    const priority = sortedEvents.length - index
    // Only add to queue if not already cached
    if (!ogQueue.getCached(event.url)) {
      ogQueue.addToQueue(event.url, priority)
    }
  })
}