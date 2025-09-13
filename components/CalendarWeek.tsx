import React from 'react'
import { Event } from '@/lib/csvParser'
import styles from './CalendarWeek.module.css'

interface CalendarWeekProps {
  weekNum: number
  weekStart: Date
  events: Event[]
  bookmarks: Record<string, Event>
  onEventClick: (event: Event) => void
}

interface TimeSection {
  morning: Event[]
  afternoon: Event[]
  evening: Event[]
}

function categorizeEventsByTime(events: Event[]): TimeSection {
  const sections: TimeSection = {
    morning: [],
    afternoon: [],
    evening: []
  }

  events.forEach(event => {
    const timeStr = event.time.toLowerCase()
    
    // Parse the time to determine the section
    if (!timeStr || timeStr === 'all day') {
      // All day events go to morning
      sections.morning.push(event)
    } else {
      // Extract hour from time string (e.g., "9:00AM", "2:30PM")
      const match = timeStr.match(/(\d{1,2}):?\d*\s*(am|pm)/i)
      if (match) {
        const hour = parseInt(match[1])
        const period = match[2].toLowerCase()
        
        // Convert to 24-hour format
        let hour24 = hour
        if (period === 'pm' && hour !== 12) {
          hour24 += 12
        } else if (period === 'am' && hour === 12) {
          hour24 = 0
        }
        
        // Categorize based on time
        if (hour24 < 12) {
          sections.morning.push(event)
        } else if (hour24 < 17) {
          sections.afternoon.push(event)
        } else {
          sections.evening.push(event)
        }
      } else {
        // Default to morning if time can't be parsed
        sections.morning.push(event)
      }
    }
  })

  // Sort events within each section by time
  const sortByTime = (a: Event, b: Event) => {
    const getTimeValue = (event: Event) => {
      const timeStr = event.time.toLowerCase()
      if (!timeStr || timeStr === 'all day') return -1
      
      const match = timeStr.match(/(\d{1,2}):?(\d*)\s*(am|pm)/i)
      if (match) {
        const hour = parseInt(match[1])
        const minutes = match[2] ? parseInt(match[2]) : 0
        const period = match[3].toLowerCase()
        
        let hour24 = hour
        if (period === 'pm' && hour !== 12) hour24 += 12
        else if (period === 'am' && hour === 12) hour24 = 0
        
        return hour24 * 60 + minutes
      }
      return -1
    }
    
    return getTimeValue(a) - getTimeValue(b)
  }

  sections.morning.sort(sortByTime)
  sections.afternoon.sort(sortByTime)
  sections.evening.sort(sortByTime)

  return sections
}

export default function CalendarWeek({ weekNum, weekStart, events, bookmarks, onEventClick }: CalendarWeekProps) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const formatDateRange = (start: Date, end: Date) => {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()}-${end.getDate()}`
    } else {
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
    }
  }

  const getDayEvents = (dayDate: Date) => {
    return events.filter(e => e.date.toDateString() === dayDate.toDateString())
  }

  const renderEventsInSection = (events: Event[], sectionName: string) => {
    if (events.length === 0) return null

    return (
      <div className={styles.timeSection}>
        <div className={styles.timeSectionHeader}>{sectionName}</div>
        {events.map((event, idx) => {
          const displayTitle = event.title.replace(/\s*\[Tech Week\]\s*/g, '')
          
          return (
            <div
              key={`${sectionName}-${idx}`}
              className={`${styles.eventItem} ${bookmarks[event.url] ? styles.bookmarked : ''}`}
              onClick={() => onEventClick(event)}
            >
              <span className={styles.eventTime}>{event.time || 'All day'}</span>
              <span className={styles.eventTitle}>{displayTitle}</span>
              <div className={styles.eventLocation}>{event.location}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.weekContainer} id={`week-${weekNum}`}>
      <div className={styles.weekHeader}>
        Week {weekNum} - {formatDateRange(weekStart, weekEnd)}
      </div>
      <div className={`${styles.weekDays} weekDays`}>
        {[...Array(7)].map((_, i) => {
          const dayDate = new Date(weekStart)
          dayDate.setDate(dayDate.getDate() + i)
          const dayEvents = getDayEvents(dayDate)
          const isFirstOfMonth = dayDate.getDate() === 1
          const timeSections = categorizeEventsByTime(dayEvents)
          
          return (
            <div key={i} className={`${styles.dayContainer} ${isFirstOfMonth ? styles.monthStart : ''}`}>
              <div className={styles.dayHeader}>
                {isFirstOfMonth && (
                  <span className={styles.monthLabel}>
                    {dayDate.toLocaleDateString('en-US', { month: 'long' })}
                  </span>
                )}
                {dayDate.toLocaleDateString('en-US', { weekday: 'short' })} {dayDate.getDate()}
              </div>
              <div className={styles.dayEvents}>
                {renderEventsInSection(timeSections.morning, 'Morning')}
                {renderEventsInSection(timeSections.afternoon, 'Afternoon')}
                {renderEventsInSection(timeSections.evening, 'Evening')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}