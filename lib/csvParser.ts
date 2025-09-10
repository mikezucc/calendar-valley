export interface Event {
  month: string
  title: string
  dateStr: string
  time: string
  location: string
  url: string
  date: Date
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 
               'July', 'August', 'September', 'October', 'November', 'December']

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

export function parseEventDate(dateStr: string, month: string): Date | null {
  const year = 2025
  const monthIndex = months.findIndex(m => m.toLowerCase() === month.toLowerCase())
  
  if (monthIndex === -1) return null
  
  const dateMatch = dateStr.match(/(\d+)/)
  if (!dateMatch) return null
  
  const day = parseInt(dateMatch[1])
  return new Date(year, monthIndex, day)
}

export function parseCSV(text: string): Event[] {
  const lines = text.split('\n')
  const events: Event[] = []
  
  let currentMonth = ''
  
  for (let i = 6; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const parts = parseCSVLine(line)
    if (parts.length < 6) continue
    
    if (parts[0]) {
      currentMonth = parts[0]
    }
    
    if (parts[1] && parts[2]) {
      const date = parseEventDate(parts[2].trim(), currentMonth)
      if (date && date.getFullYear() === 2025) {
        events.push({
          month: currentMonth,
          title: parts[1].trim(),
          dateStr: parts[2].trim(),
          time: parts[3].trim(),
          location: parts[4].trim(),
          url: parts[5].trim(),
          date
        })
      }
    }
  }
  
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + firstDay.getDay() + 1) / 7)
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}