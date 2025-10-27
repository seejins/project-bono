# F1 Race Engineer - Local Host App

This is the local UDP capture application that runs on the host's computer to capture F1 23 telemetry data and upload it to the cloud backend.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and set:
   - `CLOUD_API_URL`: Your Render app URL (e.g., `https://your-app.onrender.com`)
   - `API_KEY`: Secret key matching your backend configuration
   - `SEASON_ID`: Optional season ID (defaults to 'default-season')

3. **Build the Application**
   ```bash
   npm run build
   ```

## Usage

1. **Start the Application**
   ```bash
   npm start
   ```

2. **Enable UDP in F1 23**
   - Open F1 23
   - Go to Settings → Telemetry Settings
   - Enable "UDP Telemetry"
   - Set UDP Port to `20777`
   - Set UDP Frequency to `20Hz`

3. **Start a Session**
   - The app will automatically detect when a session starts
   - Session data will be captured and uploaded when the session ends
   - Check the console for upload status

## Development

- **Run in development mode**: `npm run dev`
- **Watch mode**: `npm run watch`

## Troubleshooting

### UDP Not Receiving Data
- Check that F1 23 UDP telemetry is enabled
- Verify UDP port is set to 20777
- Make sure Windows Firewall allows the application
- Try running as administrator

### Upload Failures
- Check your internet connection
- Verify `CLOUD_API_URL` is correct
- Ensure `API_KEY` matches the backend configuration
- Check the console for detailed error messages

### Session Not Detected
- Make sure you're in a multiplayer lobby or race session
- UDP telemetry only works in multiplayer sessions
- Check that the session has started (not just in menus)

## API Endpoints

The app communicates with these backend endpoints:
- `POST /api/sessions/upload` - Upload session data
- `GET /api/sessions/status` - Check API status

## Security

- All communication uses HTTPS
- API key authentication required
- No sensitive data stored locally
