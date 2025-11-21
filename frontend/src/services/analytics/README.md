# Analytics Service

Shared analytics service for calculating race metrics, tire wear, pace, ERS, and stint analytics across the application.

## Overview

This service provides reusable functions and React hooks for calculating comprehensive race analytics. The analytics can be used across:

- Driver Race Analysis page
- Grid Dashboard
- Season Dashboard
- Driver Dashboard
- Any other components that need race metrics

## Quick Start

### Using the Full Analytics Hook

```tsx
import { useRaceAnalytics } from '@/services/analytics';

const analytics = useRaceAnalytics({
  lapData: driverLapTimes,
  stintSegments: [
    { startLap: 1, endLap: 20, compound: 'M' },
    { startLap: 21, endLap: 50, compound: 'H' },
  ],
  driver: {
    gridPosition: 5,
    racePosition: 3,
  },
  sessionDrivers: allDrivers,
});

if (analytics) {
  console.log('Fastest lap:', analytics.pace.fastestLap);
  console.log('Average tire wear:', analytics.tireWear.averageWear);
  console.log('ERS average remaining:', analytics.ers.averageRemaining);
}
```

### Using Aggregated Metrics for Dashboards

```tsx
import { useAggregatedMetrics } from '@/services/analytics';

const metrics = useAggregatedMetrics({
  raceId: 'race-123',
  driverId: 'driver-456',
  driverName: 'Max Verstappen',
  lapData: lapTimes,
  driver: { gridPosition: 1, racePosition: 1 },
  points: 25,
});

// Use in table/card display
<TableCell>{metrics?.fastestLap}ms</TableCell>
<TableCell>{metrics?.consistencyPercent}%</TableCell>
<TableCell>{metrics?.averageTireWear}%</TableCell>
```

### Using Individual Analytics Functions

```tsx
import { 
  calculatePaceMetrics,
  calculateTireWearAnalytics,
  calculateERSMetrics,
} from '@/services/analytics';

// Calculate pace metrics
const pace = calculatePaceMetrics(lapData);

// Calculate tire wear
const tireWear = calculateTireWearAnalytics(lapData, stintSegments);

// Calculate ERS metrics
const ers = calculateERSMetrics(lapData);
```

## Available Analytics

### Pace Metrics
- Fastest/slowest lap times
- Average lap time
- Consistency (standard deviation as % of average)
- Best sector times
- Total laps

### Tire Wear Analytics
- Per-lap tire wear (FL, FR, RL, RR)
- Stint statistics (total wear, wear per lap)
- Average wear across all laps
- Average wear per lap

### ERS Metrics
- Average ERS remaining (%)
- Average ERS deployed per lap (%)
- Average ERS harvested per lap (%)
- Total deployed/harvested (kJ)

### Stint Metrics
- Stint count
- Average stint length
- Compounds used
- Average pace by compound

### Race Analytics (Combined)
- All pace metrics
- All tire wear metrics
- All ERS metrics
- All stint metrics
- Position metrics (grid, finish, positions gained)
- Gap to leader
- Race events (pit stops, safety car, yellow flags)

## Type Definitions

All types are exported from the main index:

```tsx
import type {
  RaceAnalytics,
  PaceMetrics,
  TireWearAnalytics,
  ERSMetrics,
  StintMetrics,
  AggregatedRaceMetrics,
} from '@/services/analytics';
```

## Constants

```tsx
import { ERS_MAX_LOAD } from '@/services/analytics';

// ERS_MAX_LOAD = 4000000.0 (Joules)
```

## Examples

### Grid Dashboard - Display Average Pace

```tsx
import { useRaceAnalytics } from '@/services/analytics';

function DriverRow({ driver, raceId }) {
  const { lapData } = useDriverRaceData(driver.id, raceId);
  const analytics = useRaceAnalytics({ lapData });
  
  return (
    <tr>
      <td>{driver.name}</td>
      <td>{analytics?.pace.averageLap}ms</td>
      <td>{analytics?.pace.consistencyPercent}%</td>
    </tr>
  );
}
```

### Season Dashboard - Display Tire Wear Stats

```tsx
import { useAggregatedMetrics } from '@/services/analytics';

function SeasonTable({ races, driverId }) {
  const metrics = races.map(race => 
    useAggregatedMetrics({
      raceId: race.id,
      driverId,
      driverName: driver.name,
      lapData: race.lapData,
      driver: race.driver,
    })
  );
  
  return (
    <table>
      {metrics.map(m => (
        <tr key={m.raceId}>
          <td>{m.trackName}</td>
          <td>{m.averageTireWear?.toFixed(1)}%</td>
          <td>{m.pitStops}</td>
        </tr>
      ))}
    </table>
  );
}
```

## Migration from Old Hooks

The old hooks (`useRaceStats`, `useTireWearAnalytics`) still work for backward compatibility, but new code should use the shared analytics service:

**Old:**
```tsx
const stats = useRaceStats({ lapData, driver, sessionDrivers });
```

**New:**
```tsx
const analytics = useRaceAnalytics({ lapData, driver, sessionDrivers });
// Access: analytics.pace.fastestLap instead of stats.fastestLap
```

## Performance

All analytics functions are pure functions and can be memoized. The React hooks automatically memoize results based on input dependencies.

For large datasets, consider:
- Using `useMemo` to cache lap data
- Calculating analytics only when needed
- Using aggregated metrics for dashboard views (lighter weight)

