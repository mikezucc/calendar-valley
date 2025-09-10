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
                {dayEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className={`${styles.eventItem} ${bookmarks[event.url] ? styles.bookmarked : ''}`}
                    onClick={() => onEventClick(event)}
                  >
                    <span className={styles.eventTime}>{event.time || 'All day'}</span>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <div className={styles.eventLocation}>{event.location}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}