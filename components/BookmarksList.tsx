import React from 'react'
import { Event } from '@/lib/csvParser'
import styles from './BookmarksList.module.css'

interface BookmarksListProps {
  bookmarks: Record<string, Event>
  onEventClick: (event: Event) => void
  onRemoveBookmark: (url: string) => void
}

export default function BookmarksList({ bookmarks, onEventClick, onRemoveBookmark }: BookmarksListProps) {
  const bookmarksList = Object.values(bookmarks)

  if (bookmarksList.length === 0) {
    return (
      <div className={styles.emptyState}>
        No saved events yet
      </div>
    )
  }

  return (
    <div className={styles.bookmarksList}>
      {bookmarksList.map(event => (
        <div 
          key={event.url} 
          className={styles.bookmarkItem}
          onClick={() => onEventClick(event)}
        >
          <div className={styles.bookmarkTitle}>{event.title}</div>
          <div className={styles.bookmarkMeta}>
            {event.dateStr} • {event.location}
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
  )
}