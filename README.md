# Project Bono

A real-time companion app for F1 games (F1 23, F1 24, F1 25) that mimics a real-life race engineer experience.

## Features

### Core Race Engineer Functions
- **Real-time Telemetry Monitoring**: Speed, tire wear, fuel levels, engine status, brake temperatures
- **Race Strategy Engine**: Dynamic pit stop recommendations, tire strategy, fuel management
- **Performance Analysis**: Lap time analysis, sector performance, driving technique feedback
- **Voice Communication**: Real-time voice commands and responses
- **Weather Integration**: Track conditions and weather-based strategy adjustments

### Technical Features
- **Live Data Streaming**: UDP telemetry parsing from F1 games
- **Real-time Dashboard**: Modern, responsive UI with live charts
- **Strategy Calculator**: AI-powered race strategy recommendations
- **Data Visualization**: Interactive charts for telemetry analysis
- **Cross-platform**: Desktop and mobile support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.io
- **Telemetry**: F1 Telemetry Client (TypeScript UDP parser)
- **UI**: Tailwind CSS + Framer Motion
- **Charts**: Recharts + D3.js
- **Voice**: Web Speech API + Speech Recognition
- **Database**: SQLite (local) / PostgreSQL (production)

## Project Structure

```
f1-race-engineer/
├── frontend/          # React frontend application
├── backend/           # Node.js backend server
├── shared/            # Shared types and utilities
├── telemetry/         # F1 telemetry parsing modules
└── docs/             # Documentation and guides
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development servers: `npm run dev`
4. Launch F1 game and connect telemetry
5. Open the companion app in your browser

## Game Compatibility

- F1 23 ✅
- F1 24 ✅  
- F1 25 ✅
- F1 22 (legacy support)

## License

MIT License - Feel free to contribute and modify!
