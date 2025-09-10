import React from 'react'
import { Event } from '@/lib/csvParser'
import styles from './BookmarksList.module.css'

interface BookmarksListProps {
  bookmarks: Record<string, Event>
  onEventClick: (event: Event) => void
  onRemoveBookmark: (url: string) => void
}

interface GroupedBookmarks {
  [month: string]: {
    [dayOfWeek: string]: Event[]
  }
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 
               'July', 'August', 'September', 'October', 'November', 'December']

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function BookmarksList({ bookmarks, onEventClick, onRemoveBookmark }: BookmarksListProps) {
  const bookmarksList = Object.values(bookmarks)

  if (bookmarksList.length === 0) {
    return (
      <div className={styles.emptyState}>
        No saved events yet
      </div>
    )
  }

  // Sort bookmarks by date first
  const sortedBookmarks = [...bookmarksList].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Group bookmarks by month and day of week
  const groupedBookmarks: GroupedBookmarks = {}

  sortedBookmarks.forEach(event => {
    const monthName = months[event.date.getMonth()]
    const dayName = daysOfWeek[event.date.getDay()]
    
    if (!groupedBookmarks[monthName]) {
      groupedBookmarks[monthName] = {}
    }
    
    if (!groupedBookmarks[monthName][dayName]) {
      groupedBookmarks[monthName][dayName] = []
    }
    
    groupedBookmarks[monthName][dayName].push(event)
  })

  return (
    <div className={styles.bookmarksList}>
      {Object.entries(groupedBookmarks).map(([month, days]) => (
        <div key={month} className={styles.monthGroup}>
          <div className={styles.monthHeader}>{month} 2025</div>
          {Object.entries(days).map(([dayOfWeek, events]) => (
            <div key={`${month}-${dayOfWeek}`} className={styles.dayGroup}>
              <div className={styles.dayHeader}>
                {dayOfWeek}
                <span className={styles.dayCount}>{events.length}</span>
              </div>
              {events.map(event => (
                <div 
                  key={event.url} 
                  className={styles.bookmarkItem}
                  onClick={() => onEventClick(event)}
                >
                  <div className={styles.bookmarkDate}>
                    {event.date.getDate()}
                  </div>
                  <div className={styles.bookmarkContent}>
                    <div className={styles.bookmarkTitle}>{event.title}</div>
                    <div className={styles.bookmarkMeta}>
                      {event.time} • {event.location}
                    </div>
                  </div>
                  <button 
                    className={styles.bookmarkRemove}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveBookmark(event.url)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}