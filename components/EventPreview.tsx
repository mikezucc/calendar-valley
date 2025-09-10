import React, { useState, useEffect } from 'react'
import { Event } from '@/lib/csvParser'
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
      fetchOpenGraphData(event.url)
    }
  }, [event])

  const fetchOpenGraphData = async (url: string) => {
    // Check cache first
    const cacheKey = `og_${url}`
    const cached = sessionStorage.getItem(cacheKey)
    
    if (cached) {
      try {
        setOgData(JSON.parse(cached))
        return
      } catch (e) {
        console.error('Cache parse error:', e)
      }
    }

    setLoading(true)
    setError(null)
    
    try {
      // Using a CORS proxy service - you may want to use your own proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      const data = await response.json()
      
      if (data.contents) {
        const html = data.contents
        const ogData = parseOpenGraphTags(html)
        
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify(ogData))
        setOgData(ogData)
      }
    } catch (err) {
      console.error('Error fetching OpenGraph data:', err)
      setError('Unable to load preview')
      // Fallback to basic event data
      setOgData({
        title: event?.title,
        description: `${event?.dateStr} • ${event?.time} • ${event?.location}`,
        url: event?.url
      })
    } finally {
      setLoading(false)
    }
  }

  const parseOpenGraphTags = (html: string): OpenGraphData => {
    const ogData: OpenGraphData = {}
    
    // Parse OG tags using regex
    const metaRegex = /<meta\s+(?:property|name)=["'](?:og:|twitter:)?([^"']+)["']\s+content=["']([^"']+)["']/gi
    let match
    
    while ((match = metaRegex.exec(html)) !== null) {
      const property = match[1].toLowerCase()
      const content = match[2]
      
      if (property === 'title' || property === 'og:title') {
        ogData.title = content
      } else if (property === 'description' || property === 'og:description') {
        ogData.description = content
      } else if (property === 'image' || property === 'og:image') {
        ogData.image = content
      } else if (property === 'site_name' || property === 'og:site_name') {
        ogData.site_name = content
      }
    }
    
    // Fallback to regular title tag if no OG title
    if (!ogData.title) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleMatch) {
        ogData.title = titleMatch[1]
      }
    }
    
    return ogData
  }

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
              {ogData?.title || event.title}
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