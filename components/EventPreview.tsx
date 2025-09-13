import React, { useState, useEffect } from 'react'
import { Event } from '@/lib/csvParser'
import { ogQueue } from '@/lib/opengraphQueue'
import styles from './EventPreview.module.css'

interface EventPreviewProps {
  event: Event | null
}

interface OpenGraphData {
  title?: string
  description?: string
  image?: string
  site_name?: string
  url?: string
}

export default function EventPreview({ event }: EventPreviewProps) {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (event?.url) {
      setImageLoaded(false)
      setImageError(false)
      setLoading(true)
      setError(null)
      
      // Check if data is already cached
      const cached = ogQueue.getCached(event.url)
      if (cached) {
        setOgData(cached)
        setLoading(false)
      } else {
        // Subscribe to updates from the queue
        const handleData = (data: OpenGraphData | null) => {
          if (data) {
            setOgData(data)
          } else {
            // Fallback to basic data
            setOgData({
              title: event.title,
              description: `${event.dateStr} • ${event.time} • ${event.location}`,
              url: event.url
            })
            setError('Failed to load preview')
          }
          setLoading(false)
        }
        
        ogQueue.subscribe(event.url, handleData)
        
        // Add to queue with high priority since user selected it
        ogQueue.addToQueue(event.url, 1000)
        
        // Cleanup subscription
        return () => {
          ogQueue.unsubscribe(event.url, handleData)
        }
      }
    }
  }, [event])


  if (!event) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📅</div>
        <div className={styles.emptyTitle}>Select an Event</div>
        <div className={styles.emptyDescription}>
          Choose an event from the calendar to view details
        </div>
      </div>
    )
  }

  return (
    <div className={styles.previewContainer}>
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <div>Loading preview...</div>
        </div>
      )}
      
      {!loading && (
        <div className={styles.previewContent}>
          {ogData?.image && !imageError && (
            <div className={styles.imageContainer} style={{ display: imageLoaded ? 'block' : 'none' }}>
              <img 
                src={ogData.image} 
                alt={ogData.title || event.title}
                className={styles.previewImage}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true)
                  setImageLoaded(false)
                }}
              />
            </div>
          )}
          
          <div className={styles.eventDetails}>
            <div className={styles.eventMeta}>
              <span className={styles.eventDate}>📅 {event.dateStr}</span>
              <span className={styles.eventTime}>🕐 {event.time || 'All day'}</span>
              <span className={styles.eventLocation}>📍 {event.location}</span>
            </div>
            
            <h1 className={styles.eventTitle}>
              {(ogData?.title || event.title).replace(/\s*\[Tech Week\]\s*/g, '')}
            </h1>
            
            {ogData?.site_name && (
              <div className={styles.siteName}>{ogData.site_name}</div>
            )}
            
            {ogData?.description && (
              <p className={styles.eventDescription}>
                {ogData.description}
              </p>
            )}
            
            <a 
              href={event.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.eventLink}
            >
              <span>Visit Event Page</span>
              <span className={styles.linkIcon}>↗</span>
            </a>
            
            {error && (
              <div className={styles.errorNote}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}