import React, { useState, useEffect } from 'react'
import styles from './MobileWarning.module.css'

export default function MobileWarning() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('mobileWarningDismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Check if mobile viewport
    const checkViewport = () => {
      const isMobile = window.innerWidth < 768
      setIsVisible(isMobile && !isDismissed)
    }

    checkViewport()
    window.addEventListener('resize', checkViewport)

    return () => {
      window.removeEventListener('resize', checkViewport)
    }
  }, [isDismissed])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    sessionStorage.setItem('mobileWarningDismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>💻</div>
        <h2 className={styles.title}>Desktop Experience Recommended</h2>
        <p className={styles.message}>
          This AI events calendar is optimized for desktop viewing. 
          For the best experience browsing and managing events, please visit on a larger screen.
        </p>
        <p className={styles.submessage}>
          You can continue on mobile, but some features may be limited.
        </p>
        <button 
          className={styles.dismissButton}
          onClick={handleDismiss}
        >
          Continue Anyway
        </button>
      </div>
    </div>
  )
}