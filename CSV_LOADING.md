# CSV Event Loading System

## Overview
The Calendar Valley app now loads events from two separate CSV files and merges them on the frontend:

1. **`/public/events.csv`** - Contains Tech Week events parsed from HTML (887+ events)
2. **`/public/cerebral.csv`** - Contains Cerebral Valley events (142+ events)

## How It Works

### Frontend Loading (`app/page.tsx`)
- Fetches both CSV files in parallel using `Promise.all()`
- Handles failures gracefully - if one CSV is unavailable, the app continues with the other
- Parses each CSV with appropriate format handling
- Merges events and removes duplicates based on title and date
- Displays combined event list in the calendar

### CSV Formats

#### events.csv (Tech Week + merged events)
- Contains 6 metadata header rows
- Events start from line 7
- Includes GitHub issue submission link
- Format: `Month,Event,Date,Time (PST),Location,Link`

#### cerebral.csv (Cerebral Valley events)
- Standard CSV with header row at line 1
- Events start from line 2
- Format: `Month,Event,Date,Time (PST),Location,Link`

### Deduplication
Events are deduplicated by:
1. Normalizing event titles (removing [Tech Week] tags, converting to lowercase)
2. Creating unique keys from title + date
3. Keeping the first occurrence (Tech Week events have priority)

## Scripts

### Update Events
```bash
npm run update:events  # Parse Tech Week HTML and merge with existing events
```

### Test CSV Loading
```bash
npm run test:csv  # Verify both CSV files load correctly
```

### Manual Python Scripts
```bash
cd scripts
python3 parse_tech_week_html.py  # Parse Tech Week events from HTML
python3 merge_events.py          # Merge Tech Week with existing events
```

## File Structure
```
/public/
  events.csv       # Tech Week events (from HTML scraping)
  cerebral.csv     # Cerebral Valley events
/scripts/
  parse_tech_week_html.py  # HTML parser for Tech Week
  merge_events.py          # Backend merger (optional)
  test_csv_loading.js      # Test script for CSV loading
/lib/
  csvParser.ts     # CSV parsing logic with format detection
/app/
  page.tsx         # Frontend that loads and merges both CSVs
```

## Statistics
- Total unique events after merging: ~1000+
- Tech Week events: 887
- Cerebral Valley events: 142
- Duplicates automatically removed: ~20

## Troubleshooting

If events aren't loading:
1. Check browser console for loading errors
2. Verify both CSV files exist in `/public/`
3. Run `npm run test:csv` to verify CSV parsing
4. Check that dates are in 2025 format

## Contributing
Submit issues at: https://github.com/mikezucc/calendar-valley