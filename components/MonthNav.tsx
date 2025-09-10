import React from 'react'
import styles from './MonthNav.module.css'

interface MonthNavProps {
  activeMonth: number | null
  onMonthClick: (monthIndex: number) => void
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 
               'July', 'August', 'September', 'October', 'November', 'December']

export default function MonthNav({ activeMonth, onMonthClick }: MonthNavProps) {
  return (
    <div className={styles.monthNav}>
      <div className={styles.monthSelector}>
        {months.map((month, index) => (
          <button
            key={month}
            className={`${styles.monthBtn} ${activeMonth === index ? styles.active : ''}`}
            onClick={() => onMonthClick(index)}
          >
            {month.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )
}