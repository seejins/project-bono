const { Client } = require('pg');

// Database connection
const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/f1_race_engineer_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testUDPData() {
  try {
    await db.connect();
    console.log('🔌 Connected to database');

    // Test UDP Participants
    console.log('\n👥 UDP Participants:');
    const participants = await db.query(`
      SELECT up.*, m.name as member_name, s.name as season_name
      FROM f123_udp_participants up
      LEFT JOIN members m ON up.member_id = m.id
      LEFT JOIN seasons s ON up.season_id = s.id
      ORDER BY up.created_at DESC
      LIMIT 10
    `);
    
    if (participants.rows.length > 0) {
      participants.rows.forEach(p => {
        console.log(`  - ${p.member_name || 'Unknown'} (${p.name}) - Vehicle ${p.vehicle_index}, Team ${p.team_id}, Session ${p.session_uid}`);
      });
    } else {
      console.log('  No participants found');
    }

    // Test UDP Session Results
    console.log('\n🏁 UDP Session Results:');
    const results = await db.query(`
      SELECT usr.*, m.name as member_name, s.name as season_name, r.track_name
      FROM f123_udp_session_results usr
      LEFT JOIN members m ON usr.member_id = m.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      LEFT JOIN races r ON usr.event_id = r.id
      ORDER BY usr.created_at DESC
      LIMIT 10
    `);
    
    if (results.rows.length > 0) {
      results.rows.forEach(r => {
        console.log(`  - ${r.member_name || 'Unknown'} - P${r.position}, ${r.num_laps} laps, ${r.points} pts, Track: ${r.track_name || 'Unknown'}`);
      });
    } else {
      console.log('  No session results found');
    }

    // Test UDP Lap History
    console.log('\n📊 UDP Lap History:');
    const laps = await db.query(`
      SELECT ulh.*, m.name as member_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN members m ON ulh.member_id = m.id
      ORDER BY ulh.created_at DESC
      LIMIT 10
    `);
    
    if (laps.rows.length > 0) {
      laps.rows.forEach(l => {
        console.log(`  - ${l.member_name || 'Unknown'} - Lap ${l.lap_number}, Time: ${(l.lap_time_ms / 1000).toFixed(3)}s, Session: ${l.session_uid}`);
      });
    } else {
      console.log('  No lap history found');
    }

    // Test UDP Tyre Stints
    console.log('\n🛞 UDP Tyre Stints:');
    const stints = await db.query(`
      SELECT uts.*, m.name as member_name
      FROM f123_udp_tyre_stints uts
      LEFT JOIN members m ON uts.member_id = m.id
      ORDER BY uts.created_at DESC
      LIMIT 10
    `);
    
    if (stints.rows.length > 0) {
      stints.rows.forEach(s => {
        console.log(`  - ${s.member_name || 'Unknown'} - Stint ${s.stint_number}, End Lap: ${s.end_lap}, Compound: ${s.tyre_visual_compound}`);
      });
    } else {
      console.log('  No tyre stints found');
    }

    // Summary
    console.log('\n📊 Summary:');
    const summary = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM f123_udp_participants) as participants,
        (SELECT COUNT(*) FROM f123_udp_session_results) as session_results,
        (SELECT COUNT(*) FROM f123_udp_lap_history) as lap_history,
        (SELECT COUNT(*) FROM f123_udp_tyre_stints) as tyre_stints
    `);
    
    const stats = summary.rows[0];
    console.log(`  Participants: ${stats.participants}`);
    console.log(`  Session Results: ${stats.session_results}`);
    console.log(`  Lap History: ${stats.lap_history}`);
    console.log(`  Tyre Stints: ${stats.tyre_stints}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
  }
}

// Run the test
testUDPData();
