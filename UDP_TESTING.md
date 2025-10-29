# F1 23 UDP Data Capture Testing

This guide will help you test the UDP data capture functionality for F1 23.

## Prerequisites

1. **F1 23 Game** - Make sure you have F1 23 installed and running
2. **Active Season** - Create an active season in the admin panel
3. **Members with Steam IDs** - Add members with their Steam IDs for mapping

## Setup Steps

### 1. Start the Backend
```bash
cd f1-race-engineer/backend
npm run dev
```

### 2. Configure F1 23 UDP
1. Launch F1 23
2. Go to **Settings** → **Gameplay** → **UDP Settings**
3. Enable **UDP Telemetry**
4. Set **UDP Port** to `20777` (default)
5. Set **UDP Send Rate** to `20Hz` (recommended)

### 3. Test UDP Data Capture

#### Option A: Start a Practice Session
1. Go to **Career** or **My Team**
2. Start a **Practice** session
3. The UDP processor should start receiving data
4. Check the backend console for logs like:
   ```
   👥 Processing participants packet for session 1234567890
   📊 Found 20 participants in packet
   ✅ Mapped participant [SteamID] to member [Name]
   ```

#### Option B: Start a Race Session
1. Go to **Career** or **My Team**
2. Start a **Race** session
3. Complete the race to capture final classification data
4. Check for logs like:
   ```
   🏁 Processing final classification packet for session 1234567890
   ✅ Stored final classification for member [ID] - Position: 1, Points: 25
   ```

## Testing UDP Data

### 1. Check Captured Data
Run the test script to see captured data:
```bash
cd f1-race-engineer/backend
node test-udp.js
```

This will show:
- UDP Participants
- Session Results
- Lap History
- Tyre Stints
- Summary statistics

### 2. Check Database Directly
Connect to your PostgreSQL database and query:
```sql
-- Check participants
SELECT * FROM f123_udp_participants ORDER BY created_at DESC LIMIT 10;

-- Check session results
SELECT * FROM f123_udp_session_results ORDER BY created_at DESC LIMIT 10;

-- Check lap history
SELECT * FROM f123_udp_lap_history ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### No Data Received
1. **Check F1 23 UDP Settings** - Make sure UDP is enabled and port is 20777
2. **Check Backend Logs** - Look for UDP processor startup messages
3. **Check Port Conflicts** - Make sure no other application is using port 20777
4. **Check Active Season** - Ensure you have an active season set

### Participants Not Mapped
1. **Check Member Steam IDs** - Make sure members have correct Steam IDs
2. **Check Steam ID Format** - Steam IDs should be numeric strings
3. **Check Backend Logs** - Look for "No member found for Steam ID" messages

### Data Not Stored
1. **Check Database Connection** - Ensure PostgreSQL is running
2. **Check Database Tables** - Verify UDP tables were created
3. **Check Backend Logs** - Look for database error messages

## Expected Data Flow

1. **Participants Packet** (ID: 4) - Maps Steam IDs to members
2. **Session Packet** (ID: 1) - Provides track and session info
3. **Session History Packet** (ID: 11) - Lap-by-lap data
4. **Final Classification Packet** (ID: 8) - Race results

## Data Storage

All UDP data is stored in dedicated tables:
- `f123_udp_participants` - Participant data
- `f123_udp_session_results` - Final classification results
- `f123_udp_lap_history` - Lap-by-lap data
- `f123_udp_tyre_stints` - Tyre stint data

## Next Steps

Once UDP data is being captured successfully:
1. **Integrate with Frontend** - Connect LiveTimings to real UDP data
2. **Add Real-time Updates** - Use Socket.IO to push data to frontend
3. **Implement Post-session Processing** - Process data after sessions complete
4. **Add Data Validation** - Ensure data quality and consistency

## Support

If you encounter issues:
1. Check the backend console logs
2. Verify F1 23 UDP settings
3. Ensure database connectivity
4. Check for port conflicts
