import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    // Fetch the URL directly from the server
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CalendarValley/1.0; +https://calendar-valley.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    
    // Parse OpenGraph tags
    const ogData: Record<string, string> = {}
    
    // Extract og:title
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<meta\s+name="og:title"\s+content="([^"]+)"/i)
    if (titleMatch) ogData.title = titleMatch[1]
    
    // Extract og:description
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+name="og:description"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    if (descMatch) ogData.description = descMatch[1]
    
    // Extract og:image
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                       html.match(/<meta\s+name="og:image"\s+content="([^"]+)"/i)
    if (imageMatch) {
      // Make sure image URL is absolute
      let imageUrl = imageMatch[1]
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`
      }
      ogData.image = imageUrl
    }
    
    // Extract og:site_name
    const siteMatch = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+name="og:site_name"\s+content="([^"]+)"/i)
    if (siteMatch) ogData.site_name = siteMatch[1]
    
    // Fallback to regular title tag if no og:title
    if (!ogData.title) {
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleTagMatch) ogData.title = titleTagMatch[1]
    }
    
    return NextResponse.json(ogData)
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OpenGraph data' },
      { status: 500 }
    )
  }
}