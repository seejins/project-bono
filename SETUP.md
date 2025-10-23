# Project Bono - Setup Guide

## 🏎️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- F1 23, F1 24, or F1 25 game
- Windows/Mac/Linux

### 1. Install Dependencies

```bash
# Install all dependencies (root, frontend, backend)
npm run install:all
```

### 2. Configure Environment

```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit the configuration
nano backend/.env
```

### 3. Start the Application

```bash
# Start both frontend and backend
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend app on http://localhost:5173

### 4. Enable F1 Game Telemetry

1. Launch your F1 game (F1 23/24/25)
2. Go to **Settings** → **Telemetry** → **UDP Telemetry**
3. Enable **UDP Telemetry**
4. Set **UDP Port** to `20777`
5. Set **UDP IP** to `127.0.0.1`

### 5. Connect and Race!

1. Open http://localhost:5173 in your browser
2. Start a race session in F1 game
3. The app will automatically connect and display real-time telemetry

## 🎯 Features Overview

### Real-time Telemetry Dashboard
- **Speed, RPM, Gear**: Live car performance data
- **Tire Status**: Wear levels and temperatures for all 4 tires
- **Fuel Management**: Current fuel level and consumption
- **Engine Health**: Temperature and performance metrics
- **Lap Timing**: Current lap, best lap, sector times

### AI-Powered Race Strategy
- **Pit Stop Recommendations**: When to pit based on tire wear and fuel
- **Tire Strategy**: Optimal compound selection (soft/medium/hard)
- **Fuel Strategy**: Aggressive, balanced, or conservative approaches
- **Weather Adaptation**: Strategy adjustments for changing conditions

### Voice Communication
- **Voice Commands**: "Box box", "Push", "Save fuel"
- **Real-time Responses**: AI engineer responds to your commands
- **Quick Actions**: One-click strategy commands

### Race Information
- **Position Tracking**: Current position and gaps
- **Weather Conditions**: Air/track temperature, rain percentage
- **Session Data**: Race type, time remaining, lap count

## 🛠️ Advanced Configuration

### Custom Telemetry Port
Edit `backend/.env`:
```
TELEMETRY_PORT=20777
```

### Database Configuration
The app uses SQLite by default. For production, you can switch to PostgreSQL:
```
DATABASE_URL=postgresql://user:password@localhost:5432/f1_race_engineer
```

### Voice Commands
The app supports these voice commands:
- **"Box box"** - Request pit stop
- **"Push"** - Activate push mode
- **"Save fuel"** - Fuel saving mode
- **"Tire check"** - Check tire status
- **"Weather"** - Weather update
- **"Position"** - Position and gaps

## 🎮 Game Compatibility

| Game | Status | Notes |
|------|--------|-------|
| F1 23 | ✅ Full Support | All features working |
| F1 24 | ✅ Full Support | All features working |
| F1 25 | ✅ Full Support | All features working |
| F1 22 | ⚠️ Limited | Basic telemetry only |

## 🔧 Troubleshooting

### No Telemetry Data
1. Check F1 game telemetry is enabled
2. Verify UDP port 20777 is not blocked by firewall
3. Ensure game is in a race session (not menu)

### Voice Commands Not Working
1. Check browser microphone permissions
2. Ensure you're using Chrome/Edge (best compatibility)
3. Try refreshing the page

### Connection Issues
1. Check backend is running on port 3001
2. Verify frontend is running on port 5173
3. Check browser console for errors

### Performance Issues
1. Close other applications using UDP ports
2. Reduce telemetry update frequency in F1 game settings
3. Check system resources

## 📊 Data Storage

The app stores:
- **Telemetry History**: Last 1000 data points
- **Strategy Decisions**: All strategy recommendations
- **Alert History**: All system alerts and warnings
- **Lap Analysis**: Performance data for each lap

## 🚀 Production Deployment

### Docker Deployment
```bash
# Build the application
npm run build

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
DATABASE_URL=postgresql://...
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - Feel free to modify and distribute!

## 🆘 Support

- **Issues**: Create a GitHub issue
- **Discord**: Join our community server
- **Email**: support@f1raceengineer.com

---

**Happy Racing! 🏁**
