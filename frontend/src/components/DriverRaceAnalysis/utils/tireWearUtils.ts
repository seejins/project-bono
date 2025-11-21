// Extract tire wear from car_damage_data
// Format: [RL, RR, FL, FR] - Rear Left, Rear Right, Front Left, Front Right
export const extractTireWear = (carDamageData: any): { fl: number | null; fr: number | null; rl: number | null; rr: number | null } => {
  if (!carDamageData) {
    return { fl: null, fr: null, rl: null, rr: null };
  }

  const tyresWear = carDamageData['tyres-wear'] || 
                    carDamageData.tyresWear || 
                    carDamageData['tyres_wear'] ||
                    carDamageData.m_tyres_wear;

  if (!Array.isArray(tyresWear) || tyresWear.length < 4) {
    return { fl: null, fr: null, rl: null, rr: null };
  }

  // Format: [RL, RR, FL, FR]
  return {
    rl: typeof tyresWear[0] === 'number' ? tyresWear[0] : null,
    rr: typeof tyresWear[1] === 'number' ? tyresWear[1] : null,
    fl: typeof tyresWear[2] === 'number' ? tyresWear[2] : null,
    fr: typeof tyresWear[3] === 'number' ? tyresWear[3] : null,
  };
};

// Calculate average tire wear (all 4 tires)
export const calculateAverageWear = (wear: { fl: number | null; fr: number | null; rl: number | null; rr: number | null }): number | null => {
  const values = [wear.fl, wear.fr, wear.rl, wear.rr].filter((v): v is number => v !== null && v !== undefined && typeof v === 'number');
  if (values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

