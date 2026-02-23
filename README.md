# Project Bono

A real-time companion app for F1 games (F1 23, F1 24, F1 25) and season tracker for detailed season data, race data, and lap data for each driver.

## Features

### Core Live Race Functions
- **Real-time Telemetry Monitoring**: Position, best time, current time, current sector times, micro-sector tracking, tire stynt tracking.
- **Real-time Updates**: Red Flag, Yellow Flag, Blue Flag, Formation laps, penalties.

### Technical Features
- **Live Data Streaming**: UDP telemetry parsing from F1 games
- **Real-time Dashboard**: Modern, responsive UI with live charts
- **Data Visualization**: Interactive charts for telemetry analysis
- **Cross-platform**: Desktop and mobile support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.io
- **Telemetry**: F1 Telemetry Client (TypeScript UDP parser)
- **UI**: Tailwind CSS + Framer Motion
- **Charts**: Recharts + D3.js
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
