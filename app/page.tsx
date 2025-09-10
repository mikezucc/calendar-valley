'use client'

import React, { useState, useEffect, useRef } from 'react'
import CalendarWeek from '@/components/CalendarWeek'
import BookmarksList from '@/components/BookmarksList'
import EventPreview from '@/components/EventPreview'
import MobileWarning from '@/components/MobileWarning'
import { parseCSV, getWeekNumber, getWeekStart, Event } from '@/lib/csvParser'
import { prioritizeEvents } from '@/lib/opengraphQueue'
import styles from './page.module.css'

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [bookmarks, setBookmarks] = useState<Record<string, Event>>({})
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [minimizedPanes, setMinimizedPanes] = useState<Record<string, boolean>>({
    calendar: false,
    event: false,
    bookmarks: false
  })
  const calendarRef = useRef<HTMLDivElement>(null)
  const loadedWeeks = useRef<Set<number>>(new Set())

  useEffect(() => {
    loadCSV()
    const saved = localStorage.getItem('bookmarks')
    if (saved) {
      const parsedBookmarks = JSON.parse(saved)
      // Convert date strings back to Date objects
      const bookmarksWithDates: Record<string, Event> = {}
      Object.entries(parsedBookmarks).forEach(([url, event]: [string, any]) => {
        bookmarksWithDates[url] = {
          ...event,
          date: new Date(event.date)
        }
      })
      setBookmarks(bookmarksWithDates)
    }
  }, [])

  // Handle scroll events with debouncing
  useEffect(() => {
    if (events.length === 0) return
    
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        loadVisibleWeeksData()
      }, 150)
    }
    
    const calendar = calendarRef.current
    if (calendar) {
      calendar.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        calendar.removeEventListener('scroll', handleScroll)
        clearTimeout(scrollTimeout)
      }
    }
  }, [events])

  const loadCSV = async () => {
    try {
      const response = await fetch('/events.csv')
      const text = await response.text()
      // Filter to only show current week and future events
      const parsedEvents = parseCSV(text, true)
      setEvents(parsedEvents)
      
      // Don't load all OpenGraph data at once
      // Will be loaded based on viewport visibility
      
      // Scroll to today on first load
      setTimeout(() => {
        scrollToToday()
        // Load OpenGraph data for initially visible weeks
        loadVisibleWeeksData()
      }, 100)
    } catch (error) {
      console.error('Error loading CSV:', error)
    }
  }

  const loadVisibleWeeksData = () => {
    if (!calendarRef.current || events.length === 0) return
    
    const container = calendarRef.current
    const containerRect = container.getBoundingClientRect()
    const weekElements = container.querySelectorAll('[id^="week-"]')
    
    // Group events by week for lookup
    const eventsByWeek = groupEventsByWeek()
    
    weekElements.forEach((weekEl) => {
      const weekRect = weekEl.getBoundingClientRect()
      
      // Check if week is visible in viewport
      if (weekRect.bottom >= containerRect.top && weekRect.top <= containerRect.bottom) {
        const weekNum = parseInt(weekEl.id.replace('week-', ''))
        
        // Only load data if we haven't already loaded this week
        if (!loadedWeeks.current.has(weekNum)) {
          loadedWeeks.current.add(weekNum)
          
          // Get events for this week and load their OpenGraph data
          const weekEvents = eventsByWeek[weekNum]?.events || []
          weekEvents.forEach((event, index) => {
            // Add to queue with priority based on visibility order
            prioritizeEvents([event])
          })
        }
      }
    })
  }

  const selectEvent = (event: Event) => {
    setSelectedEvent(event)
    // Auto-expand event pane when selecting an event
    setMinimizedPanes(prev => ({ ...prev, event: false }))
  }

  const toggleBookmark = (event: Event) => {
    if (bookmarks[event.url]) {
      removeBookmark(event.url)
    } else {
      const newBookmarks = { ...bookmarks, [event.url]: event }
      setBookmarks(newBookmarks)
      localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
    }
  }

  const removeBookmark = (url: string) => {
    const newBookmarks = { ...bookmarks }
    delete newBookmarks[url]
    setBookmarks(newBookmarks)
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
  }

  const scrollToDate = (targetDate: Date) => {
    const weekNum = getWeekNumber(targetDate)
    const weekEl = document.getElementById(`week-${weekNum}`)
    
    if (weekEl) {
      // Scroll the week into view
      weekEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Also scroll the week's day container to show the target date
      const weekDaysContainer = weekEl.querySelector('.weekDays') as HTMLElement
      if (weekDaysContainer) {
        // Find which day of the week the date is
        const dayOfWeek = targetDate.getDay()
        const dayElements = weekDaysContainer.children
        if (dayElements[dayOfWeek]) {
          const dayEl = dayElements[dayOfWeek] as HTMLElement
          weekDaysContainer.scrollLeft = dayEl.offsetLeft
        }
      }
    }
  }

  const scrollToMonth = (monthIndex: number) => {
    const targetDate = new Date(2025, monthIndex, 1)
    scrollToDate(targetDate)
    setActiveMonth(monthIndex)
    setShowMonthDropdown(false)
  }

  const scrollToToday = () => {
    const today = new Date()
    // Check if today is in 2025
    if (today.getFullYear() === 2025) {
      scrollToDate(today)
      setActiveMonth(today.getMonth())
    } else {
      // If not in 2025, go to closest date (Jan 1 or Dec 31)
      const targetDate = today.getFullYear() < 2025 
        ? new Date(2025, 0, 1)  // Jan 1, 2025
        : new Date(2025, 11, 31) // Dec 31, 2025
      scrollToDate(targetDate)
      setActiveMonth(targetDate.getMonth())
    }
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
  
  // Get current week number to filter out past weeks
  const today = new Date()
  const currentWeekNum = getWeekNumber(today)

  return (
    <>
      <MobileWarning />
      <div className={styles.appContainer}>
        <div className={`${styles.pane} ${minimizedPanes.calendar ? styles.minimized : ''}`} id="calendar-pane">
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>2025 AI Events</span>
          <div className={styles.paneControls}>
            <button 
              className={styles.todayBtn}
              onClick={scrollToToday}
              title="Jump to today"
            >
              Today
            </button>
            <div className={styles.monthDropdown}>
              <button 
                className={styles.dropdownBtn}
                onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              >
                Jump to {activeMonth !== null ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][activeMonth] : 'Month'} ▼
              </button>
              {showMonthDropdown && (
                <div className={styles.dropdownMenu}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <button
                      key={month}
                      className={`${styles.dropdownItem} ${activeMonth === index ? styles.active : ''}`}
                      onClick={() => scrollToMonth(index)}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={styles.minimizeBtn} onClick={() => togglePane('calendar')}>
              {minimizedPanes.calendar ? '+' : '−'}
            </button>
          </div>
        </div>
        {!minimizedPanes.calendar && (
          <div className={styles.paneContent}>
              <div 
                className={styles.calendarWeeks} 
                ref={calendarRef}
                onScroll={loadVisibleWeeksData}
              >
                {[...Array(52)].map((_, index) => {
                  const weekNum = index + 1
                  
                  // Skip past weeks
                  if (weekNum < currentWeekNum) {
                    return null
                  }
                  
                  const week = weeks[weekNum] || {
                    start: new Date(2025, 0, (weekNum - 1) * 7 + 1),
                    events: []
                  }
                  
                  return (
                    <CalendarWeek
                      key={weekNum}
                      weekNum={weekNum}
                      weekStart={week.start}
                      events={week.events}
                      bookmarks={bookmarks}
                      onEventClick={selectEvent}
                    />
                  )
                })}
              </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className={`${styles.pane} ${styles.eventPane} ${minimizedPanes.event ? styles.minimized : ''}`} id="event-pane">
          <div className={styles.paneHeader}>
            <span className={styles.paneTitle}>
              {selectedEvent.title}
            </span>
            <div className={styles.paneControls}>
              {!minimizedPanes.event && (
                <button 
                  className={`${styles.bookmarkBtn} ${bookmarks[selectedEvent.url] ? styles.bookmarked : ''}`}
                  onClick={() => toggleBookmark(selectedEvent)}
                  title={bookmarks[selectedEvent.url] ? 'Remove from saved' : 'Save for later'}
                >
                  {bookmarks[selectedEvent.url] ? 'Bookmarked' : 'Bookmark'}
                </button>
              )}
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
      )}

      {Object.keys(bookmarks).length > 0 && (
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
      )}
      </div>
    </>
  )
}