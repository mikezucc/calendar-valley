#!/usr/bin/env python3
"""
Parser for Tech Week SF events from HTML file
Extracts event information from fullloadssrscrape.html
"""

import re
import csv
import sys
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import html

def parse_tech_week_html(html_file: str = "fullloadssrscrape.html") -> List[Dict]:
    """
    Parse events from Tech Week HTML file
    """
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"Error: {html_file} not found", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error reading {html_file}: {e}", file=sys.stderr)
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    events = []
    
    # Find all event items
    event_items = soup.find_all('div', class_='calendar-events-item')
    print(f"Found {len(event_items)} event items in HTML")
    
    for item in event_items:
        event = parse_event_item(item)
        if event and event['name']:  # Only add if we got a valid event with a name
            events.append(event)
    
    return events

def parse_event_item(item) -> Dict:
    """
    Parse a single event item from HTML
    """
    event = {
        'name': '',
        'hosts': '',
        'date': '',
        'time': '',
        'location': 'San Francisco, CA',  # Default location
        'url': '',
        'sponsored': False,
        'month': '',
        'day': ''
    }
    
    # Extract event name
    name_elem = item.find(attrs={'fs-list-field': 'name'})
    if name_elem:
        event['name'] = html.unescape(name_elem.get_text(strip=True))
    
    # Extract hosts/organizers
    hosts_elem = item.find(attrs={'fs-list-field': 'hosts'})
    if hosts_elem:
        event['hosts'] = html.unescape(hosts_elem.get_text(strip=True))
    
    # Check if sponsored (visible sponsored group without w-condition-invisible)
    sponsored_group = item.find('div', class_='calendar-invite-group sponsored')
    if sponsored_group and 'w-condition-invisible' not in sponsored_group.get('class', []):
        event['sponsored'] = True
    
    # Extract date and time from date-wrapper
    date_wrapper = item.find('div', class_='date-wrapper')
    if date_wrapper:
        # Get all text elements in date wrapper
        date_texts = []
        for elem in date_wrapper.find_all('div', class_='text-size-12'):
            text = elem.get_text(strip=True)
            # Skip "Sponsored" text, dots, and elements that are hidden
            if 'w-condition-invisible' in elem.get('class', []):
                continue
            if text and text not in ['·', 'Sponsored']:
                date_texts.append(text)
        
        # Parse the date components
        # Format is typically: [Day, Month, Date, Time] or [Day, Sponsored, ·, Month, Date, ·, Time]
        if len(date_texts) >= 3:
            # Find month and day
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            month = None
            day_num = None
            time = None
            
            for i, text in enumerate(date_texts):
                if text in months:
                    month = text
                    # Next element should be the day number
                    if i + 1 < len(date_texts):
                        try:
                            day_num = int(date_texts[i + 1])
                        except ValueError:
                            pass
                # Check for time patterns (contains am/pm)
                if 'am' in text.lower() or 'pm' in text.lower():
                    time = text
            
            if month:
                event['month'] = month
                # Convert short month to full month name
                month_map = {
                    'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
                    'Apr': 'April', 'May': 'May', 'Jun': 'June',
                    'Jul': 'July', 'Aug': 'August', 'Sep': 'September',
                    'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
                }
                full_month = month_map.get(month, month)
                
                if day_num:
                    event['day'] = str(day_num)
                    event['date'] = f"{full_month} {day_num}"
                
                if time:
                    # Clean up time format
                    event['time'] = time.replace(' ', '')  # Remove spaces in time
    
    # Extract URL
    link_elem = item.find('a', class_='event-link')
    if link_elem and link_elem.get('href'):
        event['url'] = link_elem['href']
    
    # Extract neighborhood if available
    neighborhood_elem = item.find(attrs={'fs-list-field': 'neighborhood'})
    if neighborhood_elem:
        neighborhood = neighborhood_elem.get_text(strip=True)
        if neighborhood:
            event['location'] = f"{neighborhood}, San Francisco, CA"
    
    return event

def format_for_csv(events: List[Dict]) -> List[Dict]:
    """
    Format events to match Cerebral Valley CSV structure
    """
    formatted = []
    current_month = None
    
    for event in events:
        if not event.get('name'):
            continue
        
        # Add Tech Week attribution to the title
        title = event['name']
        if '[Tech Week]' not in title:
            title += ' [Tech Week]'
        
        # Only show month if it's different from previous
        month = event.get('month', '')
        if month:
            # Convert to full month name
            month_map = {
                'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
                'Apr': 'April', 'May': 'May', 'Jun': 'June',
                'Jul': 'July', 'Aug': 'August', 'Sep': 'September',
                'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
            }
            month = month_map.get(month, month)
        
        formatted_event = {
            'Month': month if month != current_month else '',
            'Event': title,
            'Date': event.get('date', ''),
            'Time (PST)': event.get('time', ''),
            'Location': event.get('location', 'San Francisco, CA'),
            'Link': event.get('url', '')
        }
        
        formatted.append(formatted_event)
        if month:
            current_month = month
    
    return formatted

def save_to_csv(events: List[Dict], filename: str = 'tech_week_events.csv'):
    """
    Save events to CSV file
    """
    if not events:
        print("No events to save", file=sys.stderr)
        return
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Month', 'Event', 'Date', 'Time (PST)', 'Location', 'Link']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        # Don't write header - will be handled by merger
        for event in events:
            writer.writerow(event)
    
    print(f"Saved {len(events)} events to {filename}")

def main():
    """
    Main execution
    """
    print("Parsing Tech Week SF events from HTML...")
    
    # Parse events from HTML file
    events = parse_tech_week_html('../fullloadssrscrape.html')
    
    if not events:
        print("No events found in HTML file", file=sys.stderr)
        # Create empty file so merger doesn't fail
        with open('tech_week_events.csv', 'w') as f:
            f.write("")
        return
    
    print(f"Parsed {len(events)} events")
    
    # Sort events by date
    def parse_date_for_sort(event):
        date_str = event.get('date', '')
        month_str = event.get('month', 'January')
        day_str = event.get('day', '1')
        
        months_order = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        
        # Also handle short month names
        month_map = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
            'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
            'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        }
        
        month_num = months_order.get(month_str, month_map.get(month_str, 1))
        try:
            day_num = int(day_str) if day_str else 1
        except ValueError:
            day_num = 1
            
        return (month_num, day_num)
    
    events.sort(key=parse_date_for_sort)
    
    # Format events for CSV
    formatted_events = format_for_csv(events)
    
    # Save to CSV
    save_to_csv(formatted_events, 'tech_week_events.csv')
    
    # Print sample of events for verification
    print("\nSample of parsed events:")
    for event in formatted_events[:5]:
        print(f"  - {event['Event']}")
        print(f"    Date: {event['Date']}, Time: {event['Time (PST)']}")
        print(f"    Location: {event['Location']}")

if __name__ == "__main__":
    main()