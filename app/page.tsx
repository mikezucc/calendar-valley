'use client'

import React, { useState, useEffect, useRef } from 'react'
import CalendarWeek from '@/components/CalendarWeek'
import BookmarksList from '@/components/BookmarksList'
import MonthNav from '@/components/MonthNav'
import EventPreview from '@/components/EventPreview'
import { parseCSV, getWeekNumber, getWeekStart, Event } from '@/lib/csvParser'
import styles from './page.module.css'

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [bookmarks, setBookmarks] = useState<Record<string, Event>>({})
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [minimizedPanes, setMinimizedPanes] = useState<Record<string, boolean>>({
    calendar: false,
    event: false,
    bookmarks: false
  })
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCSV()
    const saved = localStorage.getItem('bookmarks')
    if (saved) {
      setBookmarks(JSON.parse(saved))
    }
  }, [])

  const loadCSV = async () => {
    try {
      const response = await fetch('/events.csv')
      const text = await response.text()
      const parsedEvents = parseCSV(text)
      setEvents(parsedEvents)
    } catch (error) {
      console.error('Error loading CSV:', error)
    }
  }

  const selectEvent = (event: Event) => {
    setSelectedEvent(event)
    
    if (!bookmarks[event.url]) {
      setTimeout(() => {
        if (confirm(`Save "${event.title}" for later?`)) {
          const newBookmarks = { ...bookmarks, [event.url]: event }
          setBookmarks(newBookmarks)
          localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
        }
      }, 500)
    }
  }

  const removeBookmark = (url: string) => {
    const newBookmarks = { ...bookmarks }
    delete newBookmarks[url]
    setBookmarks(newBookmarks)
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
  }

  const scrollToMonth = (monthIndex: number) => {
    const targetDate = new Date(2025, monthIndex, 1)
    const weekNum = getWeekNumber(targetDate)
    const weekEl = document.getElementById(`week-${weekNum}`)
    
    if (weekEl && calendarRef.current) {
      const container = calendarRef.current.closest('.pane-content')
      if (container) {
        const top = weekEl.offsetTop - container.scrollTop - 100
        container.scrollTo({ top, behavior: 'smooth' })
      }
    }
    
    setActiveMonth(monthIndex)
  }

  const togglePane = (pane: 'calendar' | 'event' | 'bookmarks') => {
    setMinimizedPanes(prev => ({ ...prev, [pane]: !prev[pane] }))
  }

  const groupEventsByWeek = () => {
    const weeks: Record<number, { start: Date; events: Event[] }> = {}
    
    events.forEach(event => {
      const weekNum = getWeekNumber(event.date)
      if (!weeks[weekNum]) {
        weeks[weekNum] = {
          start: getWeekStart(event.date),
          events: []
        }
      }
      weeks[weekNum].events.push(event)
    })
    
    return weeks
  }

  const weeks = groupEventsByWeek()

  return (
    <div className={styles.appContainer}>
      <div className={`${styles.pane} ${minimizedPanes.calendar ? styles.minimized : ''}`} id="calendar-pane">
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>2025 AI Events</span>
          <div className={styles.paneControls}>
            <button className={styles.minimizeBtn} onClick={() => togglePane('calendar')}>
              {minimizedPanes.calendar ? '+' : '−'}
            </button>
          </div>
        </div>
        {!minimizedPanes.calendar && (
          <>
            <MonthNav activeMonth={activeMonth} onMonthClick={scrollToMonth} />
            <div className={styles.paneContent}>
              <div className={styles.calendarWeeks} ref={calendarRef}>
                {[...Array(52)].map((_, weekNum) => {
                  const week = weeks[weekNum + 1] || {
                    start: new Date(2025, 0, weekNum * 7 + 1),
                    events: []
                  }
                  
                  return (
                    <CalendarWeek
                      key={weekNum + 1}
                      weekNum={weekNum + 1}
                      weekStart={week.start}
                      events={week.events}
                      bookmarks={bookmarks}
                      onEventClick={selectEvent}
                    />
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`${styles.pane} ${styles.eventPane} ${minimizedPanes.event ? styles.minimized : ''}`} id="event-pane">
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>Event Details</span>
          <div className={styles.paneControls}>
            <button className={styles.minimizeBtn} onClick={() => togglePane('event')}>
              {minimizedPanes.event ? '+' : '−'}
            </button>
          </div>
        </div>
        {!minimizedPanes.event && (
          <div className={styles.paneContent}>
            <EventPreview event={selectedEvent} />
          </div>
        )}
      </div>

      <div className={`${styles.pane} ${minimizedPanes.bookmarks ? styles.minimized : ''}`} id="bookmarks-pane">
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>Saved Events</span>
          <div className={styles.paneControls}>
            <button className={styles.minimizeBtn} onClick={() => togglePane('bookmarks')}>
              {minimizedPanes.bookmarks ? '+' : '−'}
            </button>
          </div>
        </div>
        {!minimizedPanes.bookmarks && (
          <div className={styles.paneContent}>
            <BookmarksList 
              bookmarks={bookmarks}
              onEventClick={selectEvent}
              onRemoveBookmark={removeBookmark}
            />
          </div>
        )}
      </div>
    </div>
  )
}