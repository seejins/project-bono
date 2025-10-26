export interface F123Track {
  id: string;
  name: string;
  country: string;
  location: string;
  length: number; // in km
  laps: number;
}

export const F123_TRACKS: F123Track[] = [
  { id: 'bahrain', name: 'Bahrain International Circuit', country: 'Bahrain', location: 'Sakhir', length: 5.412, laps: 57 },
  { id: 'jeddah', name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', location: 'Jeddah', length: 6.174, laps: 50 },
  { id: 'albert_park', name: 'Albert Park Circuit', country: 'Australia', location: 'Melbourne', length: 5.303, laps: 58 },
  { id: 'baku', name: 'Baku City Circuit', country: 'Azerbaijan', location: 'Baku', length: 6.003, laps: 51 },
  { id: 'miami', name: 'Miami International Autodrome', country: 'USA', location: 'Miami', length: 5.412, laps: 57 },
  { id: 'imola', name: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', location: 'Imola', length: 4.909, laps: 63 },
  { id: 'monaco', name: 'Circuit de Monaco', country: 'Monaco', location: 'Monte Carlo', length: 3.337, laps: 78 },
  { id: 'catalunya', name: 'Circuit de Barcelona-Catalunya', country: 'Spain', location: 'Barcelona', length: 4.675, laps: 66 },
  { id: 'villeneuve', name: 'Circuit Gilles Villeneuve', country: 'Canada', location: 'Montreal', length: 4.361, laps: 70 },
  { id: 'red_bull_ring', name: 'Red Bull Ring', country: 'Austria', location: 'Spielberg', length: 4.318, laps: 71 },
  { id: 'silverstone', name: 'Silverstone Circuit', country: 'United Kingdom', location: 'Silverstone', length: 5.891, laps: 52 },
  { id: 'hungaroring', name: 'Hungaroring', country: 'Hungary', location: 'Budapest', length: 4.381, laps: 70 },
  { id: 'spa', name: 'Circuit de Spa-Francorchamps', country: 'Belgium', location: 'Spa', length: 7.004, laps: 44 },
  { id: 'zandvoort', name: 'Circuit Zandvoort', country: 'Netherlands', location: 'Zandvoort', length: 4.259, laps: 72 },
  { id: 'monza', name: 'Autodromo Nazionale Monza', country: 'Italy', location: 'Monza', length: 5.793, laps: 53 },
  { id: 'marina_bay', name: 'Marina Bay Street Circuit', country: 'Singapore', location: 'Singapore', length: 5.063, laps: 61 },
  { id: 'suzuka', name: 'Suzuka International Racing Course', country: 'Japan', location: 'Suzuka', length: 5.807, laps: 53 },
  { id: 'losail', name: 'Lusail International Circuit', country: 'Qatar', location: 'Lusail', length: 5.380, laps: 57 },
  { id: 'cota', name: 'Circuit of the Americas', country: 'USA', location: 'Austin', length: 5.513, laps: 56 },
  { id: 'rodriguez', name: 'Autodromo Hermanos Rodriguez', country: 'Mexico', location: 'Mexico City', length: 4.304, laps: 71 },
  { id: 'interlagos', name: 'Autodromo Jose Carlos Pace', country: 'Brazil', location: 'Sao Paulo', length: 4.309, laps: 71 },
  { id: 'las_vegas', name: 'Las Vegas Street Circuit', country: 'USA', location: 'Las Vegas', length: 6.120, laps: 50 },
  { id: 'yas_marina', name: 'Yas Marina Circuit', country: 'UAE', location: 'Abu Dhabi', length: 5.281, laps: 58 }
];
