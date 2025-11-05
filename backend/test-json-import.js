/**
 * Test script for JSON import functionality
 * Usage: node test-json-import.js <json-file-path> <season-id>
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
// Use built-in fetch (Node.js 18+) or node-fetch if available
const fetch = globalThis.fetch || require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getActiveSeasonId() {
  try {
    const response = await fetch(`${API_URL}/api/seasons/active`);
    const data = await response.json();
    
    if (data.success && data.season) {
      return data.season.id;
    }
    
    // Fallback: get first season
    const seasonsResponse = await fetch(`${API_URL}/api/seasons`);
    const seasonsData = await seasonsResponse.json();
    
    if (seasonsData.success && seasonsData.seasons && seasonsData.seasons.length > 0) {
      return seasonsData.seasons[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching season:', error.message);
    return null;
  }
}

async function testJSONImport(jsonFilePath, seasonId) {
  console.log('🧪 Testing JSON Import...');
  console.log(`📂 File: ${jsonFilePath}`);
  console.log(`📅 Season ID: ${seasonId || '(will fetch active season)'}`);
  console.log(`🌐 API URL: ${API_URL}\n`);

  try {
    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    // Get season ID if not provided
    let finalSeasonId = seasonId;
    if (!finalSeasonId) {
      console.log('📋 Fetching active season...');
      finalSeasonId = await getActiveSeasonId();
      if (!finalSeasonId) {
        console.error('❌ No active season found. Please provide a season ID.');
        process.exit(1);
      }
      console.log(`✅ Found season: ${finalSeasonId}\n`);
    }

    // Create form data
    const form = new FormData();
    form.append('raceFile', fs.createReadStream(jsonFilePath));
    form.append('seasonId', finalSeasonId);

    console.log('📤 Uploading JSON file...');

    // Make request
    const response = await fetch(`${API_URL}/api/races/import-json`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Import successful!');
      console.log(`📊 Race ID: ${result.raceId}`);
      console.log(`📋 Session Result ID: ${result.sessionResultId}`);
      console.log(`👥 Imported ${result.importedCount} driver results`);
      console.log(`\n🎉 Race data has been imported and standings updated!`);
    } else {
      console.error('\n❌ Import failed:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node test-json-import.js <json-file-path> [season-id]');
  console.log('\nExample:');
  console.log('  node test-json-import.js ../data/race-json-files/Race_Austria_2025_11_04_21_22_46.json');
  console.log('  node test-json-import.js ../data/race-json-files/Race_Austria_2025_11_04_21_22_46.json <season-id>');
  process.exit(1);
}

const [jsonFilePath, seasonId] = args;

// Resolve file path
const resolvedPath = path.isAbsolute(jsonFilePath) 
  ? jsonFilePath 
  : path.resolve(__dirname, jsonFilePath);

testJSONImport(resolvedPath, seasonId).catch(console.error);