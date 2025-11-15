/**
 * Script to clear and reseed tracks table in dev environment
 * Usage: npm run reseed-tracks (or: tsx scripts/reseed-tracks.ts)
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const tracks = [
  { name: 'Bahrain International Circuit', country: 'Bahrain', length: 5.412, eventName: 'Bahrain Grand Prix', shortEventName: 'Bahrain GP' },
  { name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', length: 6.174, eventName: 'Saudi Arabian Grand Prix', shortEventName: 'Saudi Arabian GP' },
  { name: 'Albert Park Circuit', country: 'Australia', length: 5.303, eventName: 'Australian Grand Prix', shortEventName: 'Australian GP' },
  { name: 'Shanghai International Circuit', country: 'China', length: 5.451, eventName: 'Chinese Grand Prix', shortEventName: 'Chinese GP' },
  { name: 'Baku City Circuit', country: 'Azerbaijan', length: 6.003, eventName: 'Azerbaijan Grand Prix', shortEventName: 'Azerbaijan GP' },
  { name: 'Miami International Autodrome', country: 'USA', length: 5.412, eventName: 'Miami Grand Prix', shortEventName: 'Miami GP' },
  { name: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', length: 4.909, eventName: 'Emilia Romagna Grand Prix', shortEventName: 'Emilia Romagna GP' },
  { name: 'Circuit de Monaco', country: 'Monaco', length: 3.337, eventName: 'Monaco Grand Prix', shortEventName: 'Monaco GP' },
  { name: 'Circuit de Barcelona-Catalunya', country: 'Spain', length: 4.675, eventName: 'Spanish Grand Prix', shortEventName: 'Spanish GP' },
  { name: 'Circuit Gilles Villeneuve', country: 'Canada', length: 4.361, eventName: 'Canadian Grand Prix', shortEventName: 'Canadian GP' },
  { name: 'Red Bull Ring', country: 'Austria', length: 4.318, eventName: 'Austrian Grand Prix', shortEventName: 'Austrian GP' },
  { name: 'Silverstone Circuit', country: 'United Kingdom', length: 5.891, eventName: 'British Grand Prix', shortEventName: 'British GP' },
  { name: 'Hungaroring', country: 'Hungary', length: 4.381, eventName: 'Hungarian Grand Prix', shortEventName: 'Hungarian GP' },
  { name: 'Circuit de Spa-Francorchamps', country: 'Belgium', length: 7.004, eventName: 'Belgian Grand Prix', shortEventName: 'Belgian GP' },
  { name: 'Circuit Zandvoort', country: 'Netherlands', length: 4.259, eventName: 'Dutch Grand Prix', shortEventName: 'Dutch GP' },
  { name: 'Autodromo Nazionale Monza', country: 'Italy', length: 5.793, eventName: 'Italian Grand Prix', shortEventName: 'Italian GP' },
  { name: 'Marina Bay Street Circuit', country: 'Singapore', length: 5.063, eventName: 'Singapore Grand Prix', shortEventName: 'Singapore GP' },
  { name: 'Suzuka International Racing Course', country: 'Japan', length: 5.807, eventName: 'Japanese Grand Prix', shortEventName: 'Japanese GP' },
  { name: 'Lusail International Circuit', country: 'Qatar', length: 5.380, eventName: 'Qatar Grand Prix', shortEventName: 'Qatar GP' },
  { name: 'Circuit of the Americas', country: 'USA', length: 5.513, eventName: 'United States Grand Prix', shortEventName: 'United States GP' },
  { name: 'Autodromo Hermanos Rodriguez', country: 'Mexico', length: 4.304, eventName: 'Mexico City Grand Prix', shortEventName: 'Mexico City GP' },
  { name: 'Autodromo Jose Carlos Pace', country: 'Brazil', length: 4.309, eventName: 'São Paulo Grand Prix', shortEventName: 'São Paulo GP' },
  { name: 'Las Vegas Street Circuit', country: 'USA', length: 6.120, eventName: 'Las Vegas Grand Prix', shortEventName: 'Las Vegas GP' },
  { name: 'Yas Marina Circuit', country: 'UAE', length: 5.281, eventName: 'Abu Dhabi Grand Prix', shortEventName: 'Abu Dhabi GP' },
];

async function reseedTracks() {
  let pool: Pool | null = null;

  try {
    console.log('🔄 Connecting to database...');

    // Create pool connection
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'f1_race_engineer_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'test123',
        ssl: false,
      });
    }

    console.log('✅ Connected to database');
    console.log('🗑️  Clearing existing tracks...');

    // Step 1: Clear foreign key references
    await pool.query('UPDATE races SET track_id = NULL');

    // Step 2: Delete all tracks
    await pool.query('DELETE FROM tracks');

    const countResult = await pool.query('SELECT COUNT(*) FROM tracks');
    console.log(`✅ Cleared tracks table (${countResult.rows[0].count} remaining)`);

    console.log('🌱 Seeding 24 F1 tracks...');

    // Step 3: Insert all tracks
    for (const track of tracks) {
      await pool.query(
        `INSERT INTO tracks (id, name, country, length_km, event_name, short_event_name, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [track.name, track.country, track.length, track.eventName, track.shortEventName],
      );
    }

    // Step 4: Verify
    const finalCount = await pool.query('SELECT COUNT(*) FROM tracks');
    console.log(`✅ Successfully seeded ${finalCount.rows[0].count} tracks`);

    // Show summary
    const summary = await pool.query(
      `SELECT name, country, event_name FROM tracks ORDER BY name`
    );
    console.log('\n📋 Track summary:');
    summary.rows.forEach((track, index) => {
      console.log(`${index + 1}. ${track.event_name} - ${track.name} (${track.country})`);
    });

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error reseeding tracks:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
reseedTracks();

