import { Event } from './csvParser'

const STORAGE_KEY = 'calendar_valley_bookmarks'
const STORAGE_VERSION = '1.0'

interface StoredBookmarks {
  version: string
  bookmarks: Record<string, Event>
  lastUpdated: string
}

export class BookmarkStorage {
  private static instance: BookmarkStorage
  private cache: Record<string, Event> = {}
  private storageAvailable: boolean = false

  private constructor() {
    this.storageAvailable = this.checkStorageAvailability()
    this.loadFromStorage()
  }

  static getInstance(): BookmarkStorage {
    if (!BookmarkStorage.instance) {
      BookmarkStorage.instance = new BookmarkStorage()
    }
    return BookmarkStorage.instance
  }

  private checkStorageAvailability(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (e) {
      console.warn('LocalStorage not available, using memory storage', e)
      return false
    }
  }

  private loadFromStorage(): void {
    if (!this.storageAvailable) {
      console.warn('Storage not available, bookmarks will not persist')
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        this.cache = {}
        return
      }

      const data: StoredBookmarks = JSON.parse(stored)

      // Validate version
      if (data.version !== STORAGE_VERSION) {
        console.log('Storage version mismatch, migrating data...')
        this.migrateData(data)
        return
      }

      // Restore bookmarks with Date objects
      const restoredBookmarks: Record<string, Event> = {}
      Object.entries(data.bookmarks).forEach(([url, event]) => {
        restoredBookmarks[url] = {
          ...event,
          date: new Date(event.date)
        }
      })

      this.cache = restoredBookmarks
      console.log(`Loaded ${Object.keys(this.cache).length} bookmarks from storage`)
    } catch (error) {
      console.error('Error loading bookmarks from storage:', error)

      // Try to recover from old format
      try {
        const oldFormat = localStorage.getItem('bookmarks')
        if (oldFormat) {
          const oldData = JSON.parse(oldFormat)
          const restoredBookmarks: Record<string, Event> = {}
          Object.entries(oldData).forEach(([url, event]: [string, any]) => {
            restoredBookmarks[url] = {
              ...event,
              date: new Date(event.date)
            }
          })
          this.cache = restoredBookmarks
          this.saveToStorage() // Save in new format
          localStorage.removeItem('bookmarks') // Clean up old format
          console.log('Migrated bookmarks from old format')
        }
      } catch (migrationError) {
        console.error('Could not migrate old bookmarks:', migrationError)
        this.cache = {}
      }
    }
  }

  private migrateData(oldData: any): void {
    try {
      // Handle different versions or formats here
      const restoredBookmarks: Record<string, Event> = {}

      if (oldData.bookmarks) {
        Object.entries(oldData.bookmarks).forEach(([url, event]: [string, any]) => {
          restoredBookmarks[url] = {
            ...event,
            date: new Date(event.date)
          }
        })
      } else if (typeof oldData === 'object') {
        // Direct object format
        Object.entries(oldData).forEach(([url, event]: [string, any]) => {
          if (event && event.title) {
            restoredBookmarks[url] = {
              ...event,
              date: new Date(event.date)
            }
          }
        })
      }

      this.cache = restoredBookmarks
      this.saveToStorage()
      console.log('Data migration completed')
    } catch (error) {
      console.error('Migration failed:', error)
      this.cache = {}
    }
  }

  private saveToStorage(): void {
    if (!this.storageAvailable) {
      console.warn('Cannot save: Storage not available')
      return
    }

    try {
      const data: StoredBookmarks = {
        version: STORAGE_VERSION,
        bookmarks: this.cache,
        lastUpdated: new Date().toISOString()
      }

      const serialized = JSON.stringify(data)

      // Check storage quota
      const estimatedSize = new Blob([serialized]).size
      if (estimatedSize > 5 * 1024 * 1024) { // 5MB limit
        console.warn('Bookmark data exceeds 5MB, consider cleanup')
      }

      localStorage.setItem(STORAGE_KEY, serialized)

      // Also keep a backup in sessionStorage for recovery
      try {
        sessionStorage.setItem(STORAGE_KEY + '_backup', serialized)
      } catch (e) {
        // SessionStorage might also be full or unavailable
      }
    } catch (error) {
      console.error('Error saving bookmarks to storage:', error)

      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Attempting cleanup...')
        this.cleanupOldData()
      }
    }
  }

  private cleanupOldData(): void {
    try {
      // Remove events older than 6 months
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const cleaned: Record<string, Event> = {}
      let removedCount = 0

      Object.entries(this.cache).forEach(([url, event]) => {
        if (event.date > sixMonthsAgo) {
          cleaned[url] = event
        } else {
          removedCount++
        }
      })

      if (removedCount > 0) {
        console.log(`Removed ${removedCount} old bookmarks`)
        this.cache = cleaned
        this.saveToStorage()
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }

  getAll(): Record<string, Event> {
    return { ...this.cache }
  }

  add(event: Event): void {
    this.cache[event.url] = event
    this.saveToStorage()
  }

  remove(url: string): void {
    delete this.cache[url]
    this.saveToStorage()
  }

  has(url: string): boolean {
    return url in this.cache
  }

  clear(): void {
    this.cache = {}
    this.saveToStorage()
  }

  count(): number {
    return Object.keys(this.cache).length
  }

  // Export bookmarks as JSON for backup
  exportAsJSON(): string {
    return JSON.stringify({
      version: STORAGE_VERSION,
      bookmarks: this.cache,
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  // Import bookmarks from JSON backup
  importFromJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      const imported: Record<string, Event> = {}

      const bookmarks = data.bookmarks || data
      Object.entries(bookmarks).forEach(([url, event]: [string, any]) => {
        if (event && event.title && event.date) {
          imported[url] = {
            ...event,
            date: new Date(event.date)
          }
        }
      })

      // Merge with existing bookmarks
      this.cache = { ...this.cache, ...imported }
      this.saveToStorage()
      return true
    } catch (error) {
      console.error('Import failed:', error)
      return false
    }
  }

  // Attempt to recover from sessionStorage backup
  attemptRecovery(): boolean {
    if (!this.storageAvailable) return false

    try {
      const backup = sessionStorage.getItem(STORAGE_KEY + '_backup')
      if (backup) {
        const data: StoredBookmarks = JSON.parse(backup)
        const restoredBookmarks: Record<string, Event> = {}

        Object.entries(data.bookmarks).forEach(([url, event]) => {
          restoredBookmarks[url] = {
            ...event,
            date: new Date(event.date)
          }
        })

        this.cache = restoredBookmarks
        this.saveToStorage()
        console.log('Recovered bookmarks from backup')
        return true
      }
    } catch (error) {
      console.error('Recovery failed:', error)
    }
    return false
  }
}

// Export singleton instance
export const bookmarkStorage = BookmarkStorage.getInstance()