#!/usr/bin/env node

/**
 * Test script to verify CSV loading and merging functionality
 */

const fs = require('fs');
const path = require('path');

// Simple CSV parser
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function loadCSV(filename, skipMetadata = false) {
  const filepath = path.join(__dirname, '..', 'public', filename);
  const text = fs.readFileSync(filepath, 'utf8');
  const lines = text.split('\n');
  const events = [];
  
  // Skip metadata rows if needed
  const startLine = skipMetadata ? 6 : 1;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length >= 6 && parts[1]) {
      // Skip metadata entries
      if (parts[1].includes('Submit an event') || 
          parts[1].includes('Subscribe to') || 
          parts[1].includes('DM Cerebral Valley') ||
          parts[1].includes('Submit issue')) {
        continue;
      }
      
      events.push({
        title: parts[1].trim(),
        date: parts[2].trim(),
        time: parts[3].trim(),
        location: parts[4].trim(),
        url: parts[5].trim()
      });
    }
  }
  
  return events;
}

// Test loading both CSV files
console.log('Testing CSV loading...\n');

try {
  // Load events.csv (with metadata)
  const eventsCSV = loadCSV('events.csv', true);
  console.log(`✓ Loaded events.csv: ${eventsCSV.length} events`);
  
  // Show sample events
  console.log('  Sample Tech Week events:');
  const techWeekEvents = eventsCSV.filter(e => e.title.includes('[Tech Week]'));
  techWeekEvents.slice(0, 3).forEach(e => {
    console.log(`    - ${e.title}`);
  });
  
  // Load cerebral.csv (no metadata)
  const cerebralCSV = loadCSV('cerebral.csv', false);
  console.log(`\n✓ Loaded cerebral.csv: ${cerebralCSV.length} events`);
  
  // Show sample events
  console.log('  Sample Cerebral Valley events:');
  cerebralCSV.slice(0, 3).forEach(e => {
    console.log(`    - ${e.title}`);
  });
  
  // Check for duplicates
  const allTitles = new Set();
  const duplicates = [];
  
  [...eventsCSV, ...cerebralCSV].forEach(event => {
    const normalizedTitle = event.title.toLowerCase().replace(/\[tech week\]/gi, '').trim();
    if (allTitles.has(normalizedTitle)) {
      duplicates.push(event.title);
    }
    allTitles.add(normalizedTitle);
  });
  
  console.log(`\n✓ Total unique events after merging: ${allTitles.size}`);
  if (duplicates.length > 0) {
    console.log(`  Found ${duplicates.length} potential duplicates (will be deduplicated in frontend)`);
  }
  
  console.log('\n✅ CSV loading test successful!');
  
} catch (error) {
  console.error('❌ Error during testing:', error.message);
  process.exit(1);
}