#!/usr/bin/env python3
"""
Merge Tech Week events with Cerebral Valley events
Handles deduplication and combines into final events.csv
"""

import csv
import sys
from typing import List, Dict, Set
from difflib import SequenceMatcher
import os

def similarity(a: str, b: str) -> float:
    """
    Calculate similarity between two strings
    """
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def read_csv(filename: str) -> List[Dict]:
    """
    Read CSV file and return list of events
    """
    events = []
    
    if not os.path.exists(filename):
        print(f"Warning: {filename} not found", file=sys.stderr)
        return events
    
    with open(filename, 'r', encoding='utf-8') as f:
        # Skip the header rows for public/events.csv format
        if 'public/events' in filename or 'events_backup' in filename:
            # Skip first 5 rows (metadata)
            for _ in range(5):
                f.readline()
            reader = csv.DictReader(f)
        else:
            # For Tech Week events, no header row to skip (already structured as CSV)
            reader = csv.DictReader(f, fieldnames=['Month', 'Event', 'Date', 'Time (PST)', 'Location', 'Link'])
        current_month = ''
        
        for row in reader:
            # Handle month tracking
            if row.get('Month'):
                current_month = row['Month']
            elif current_month:
                row['Month'] = current_month
            
            # Skip empty rows or metadata rows
            if not row.get('Event'):
                continue
            if row.get('Event').startswith('Submit an event'):
                continue
            if row.get('Event').strip() in ['', 'Cerebral Valley']:
                continue
            
            events.append(row)
    
    return events

def is_duplicate(event1: Dict, event2: Dict, threshold: float = 0.8) -> bool:
    """
    Check if two events are duplicates based on name similarity
    """
    name1 = event1.get('Event', '')
    name2 = event2.get('Event', '')
    
    # Remove attribution markers for comparison
    name1_clean = name1.replace('[Tech Week]', '').strip()
    name2_clean = name2.replace('[Tech Week]', '').strip()
    
    # Check exact match first
    if name1_clean.lower() == name2_clean.lower():
        return True
    
    # Check similarity
    return similarity(name1_clean, name2_clean) >= threshold

def merge_events(cerebral_valley_file: str, tech_week_file: str) -> List[Dict]:
    """
    Merge events from both sources, removing duplicates
    """
    # Read both CSV files
    cv_events = read_csv(cerebral_valley_file)
    tw_events = read_csv(tech_week_file)
    
    print(f"Loaded {len(cv_events)} Cerebral Valley events")
    print(f"Loaded {len(tw_events)} Tech Week events")
    
    # Start with all Cerebral Valley events
    merged = cv_events.copy()
    
    # Track event names to avoid duplicates
    existing_events = set()
    for event in cv_events:
        name = event.get('Event', '').replace('[Tech Week]', '').strip().lower()
        existing_events.add(name)
    
    # Add Tech Week events that aren't duplicates
    added_count = 0
    skipped_count = 0
    
    for tw_event in tw_events:
        # Check if this event already exists
        is_dupe = False
        tw_name = tw_event.get('Event', '').replace('[Tech Week]', '').strip()
        
        for cv_event in cv_events:
            if is_duplicate(tw_event, cv_event):
                is_dupe = True
                skipped_count += 1
                print(f"Skipping duplicate: {tw_name}")
                break
        
        if not is_dupe:
            merged.append(tw_event)
            added_count += 1
            print(f"Adding new event: {tw_name}")
    
    print(f"\nAdded {added_count} new Tech Week events")
    print(f"Skipped {skipped_count} duplicate events")
    
    return merged

def sort_events(events: List[Dict]) -> List[Dict]:
    """
    Sort events by date
    """
    months_order = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    
    def get_sort_key(event):
        month = event.get('Month', 'January')
        date_str = event.get('Date', '1')
        
        # Extract day number from date string
        import re
        day_match = re.search(r'\d+', date_str)
        day = int(day_match.group()) if day_match else 1
        
        month_num = months_order.get(month, 1)
        return (month_num, day)
    
    return sorted(events, key=get_sort_key)

def write_output_csv(events: List[Dict], output_file: str):
    """
    Write merged events to output CSV file
    """
    # Sort events by date
    sorted_events = sort_events(events)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        # Write the header rows (matching original format)
        f.write('u,,,,,\n')
        f.write(',Submit an event! ,Cerebral Valley,,,\n')
        f.write(',,Join our Slack Community,,,\n')
        f.write(',📧 Subscribe to the Events Newsletter,New York,London,Seattle,\n')
        f.write(',📧 DM Cerebral Valley on Twitter,Click to see 2025 Hackathons!,,Boston,\n')
        f.write(',🐛 Submit issue: github.com/mikezucc/calendar-valley,,,,\n')
        f.write('Month,Event,Date,Time (PST),Location,Link\n')
        
        # Write events
        current_month = None
        for event in sorted_events:
            month = event.get('Month', '')
            
            # Only write month if it's different from previous
            if month and month != current_month:
                current_month = month
                display_month = month
            else:
                display_month = ''
            
            # Write event row
            row = [
                display_month,
                event.get('Event', ''),
                event.get('Date', ''),
                event.get('Time (PST)', ''),
                event.get('Location', ''),
                event.get('Link', '')
            ]
            
            writer = csv.writer(f)
            writer.writerow(row)
    
    print(f"\nWrote {len(sorted_events)} total events to {output_file}")

def main():
    """
    Main execution
    """
    # File paths
    cerebral_valley_file = 'public/events.csv'  # Use existing events file
    tech_week_file = 'scripts/tech_week_events.csv'
    output_file = 'public/events.csv'
    
    # Check if files exist
    if not os.path.exists(cerebral_valley_file):
        print(f"Error: {cerebral_valley_file} not found", file=sys.stderr)
        print("Creating empty events file...")
        # Create with header if it doesn't exist
        with open(cerebral_valley_file, 'w') as f:
            f.write('u,,,,,\n')
            f.write(',Submit an event! ,Cerebral Valley,,,\n')
            f.write(',,Join our Slack Community,,,\n')
            f.write(',📧 Subscribe to the Events Newsletter,New York,London,Seattle,\n')
            f.write(',📧 DM Cerebral Valley on Twitter,Click to see 2025 Hackathons!,,Boston,\n')
            f.write('Month,Event,Date,Time (PST),Location,Link\n')
    
    # Merge events
    print("Merging events...")
    merged_events = merge_events(cerebral_valley_file, tech_week_file)
    
    # Write output
    write_output_csv(merged_events, output_file)
    
    print("\nMerge complete!")

if __name__ == "__main__":
    main()