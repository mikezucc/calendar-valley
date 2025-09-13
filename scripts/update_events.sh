#!/bin/bash

# Script to update events by scraping Tech Week and merging with Cerebral Valley events

echo "Updating events data..."

# Activate virtual environment
source venv/bin/activate

# Parse Tech Week events from HTML
echo "Parsing Tech Week events from HTML..."
cd scripts
python3 parse_tech_week_html.py
cd ..

# Run the merger
echo "Merging events..."
python3 scripts/merge_events.py

echo "Events updated successfully!"
echo "New events have been saved to public/events.csv"