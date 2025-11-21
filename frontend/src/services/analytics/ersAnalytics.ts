import { ERSMetrics } from './types';

// ERS maximum load capacity in Joules (F1 23 spec)
export const ERS_MAX_LOAD = 4000000.0;

export interface LapDataWithERS {
  ers_store_energy?: number | null;
  ers_deployed_this_lap?: number | null;
  ers_harvested_this_lap_mguk?: number | null;
  ers_harvested_this_lap_mguh?: number | null;
}

/**
 * Calculate ERS metrics from lap data
 * 
 * @param lapData - Array of lap data with ERS information
 * @returns ERSMetrics object with average remaining/deployed/harvested percentages and totals
 * 
 * @remarks
 * - ERS data might exist on laps without lap_time_ms, so we filter for any ERS data
 * - This function is called with full lapData (not pre-filtered) to capture all ERS data
 * - Values are normalized to percentages based on ERS_MAX_LOAD (4000000.0 Joules)
 * - Returns null values if no ERS data is available
 */
export const calculateERSMetrics = (
  lapData: LapDataWithERS[]
): ERSMetrics => {
  if (!Array.isArray(lapData) || lapData.length === 0) {
    return {
      averageRemaining: null,
      averageDeployed: null,
      averageHarvested: null,
      totalDeployed: null,
      totalHarvested: null,
    };
  }

  // Note: ERS data might exist on laps without lap_time_ms, so we filter differently
  // This function is called with full lapData (not pre-filtered) to capture all ERS data
  const validLaps = lapData.filter((lap) => 
    lap != null && (
      (lap.ers_store_energy != null && typeof lap.ers_store_energy === 'number' && Number.isFinite(lap.ers_store_energy)) ||
      (lap.ers_deployed_this_lap != null && typeof lap.ers_deployed_this_lap === 'number' && Number.isFinite(lap.ers_deployed_this_lap)) ||
      (lap.ers_harvested_this_lap_mguk != null && typeof lap.ers_harvested_this_lap_mguk === 'number' && Number.isFinite(lap.ers_harvested_this_lap_mguk)) ||
      (lap.ers_harvested_this_lap_mguh != null && typeof lap.ers_harvested_this_lap_mguh === 'number' && Number.isFinite(lap.ers_harvested_this_lap_mguh))
    )
  );

  if (validLaps.length === 0) {
    return {
      averageRemaining: null,
      averageDeployed: null,
      averageHarvested: null,
      totalDeployed: null,
      totalHarvested: null,
    };
  }

  // Calculate all ERS metrics in a single pass
  const remainingValues: number[] = [];
  const deployedValues: number[] = [];
  const harvestedValues: number[] = [];
  let totalDeployed = 0;
  let totalHarvested = 0;

  validLaps.forEach((lap) => {
    // Remaining ERS
    if (lap.ers_store_energy != null && typeof lap.ers_store_energy === 'number' && Number.isFinite(lap.ers_store_energy)) {
      const percentage = (lap.ers_store_energy / ERS_MAX_LOAD) * 100;
      if (Number.isFinite(percentage)) {
        remainingValues.push(percentage);
      }
    }
    
    // Deployed ERS
    if (lap.ers_deployed_this_lap != null && typeof lap.ers_deployed_this_lap === 'number' && Number.isFinite(lap.ers_deployed_this_lap)) {
      const percentage = (lap.ers_deployed_this_lap / ERS_MAX_LOAD) * 100;
      if (Number.isFinite(percentage)) {
        deployedValues.push(percentage);
        totalDeployed += lap.ers_deployed_this_lap;
      }
    }
    
    // Harvested ERS (MGU-K + MGU-H)
    const mguk = (lap.ers_harvested_this_lap_mguk != null && typeof lap.ers_harvested_this_lap_mguk === 'number' && Number.isFinite(lap.ers_harvested_this_lap_mguk))
      ? lap.ers_harvested_this_lap_mguk
      : 0;
    const mguh = (lap.ers_harvested_this_lap_mguh != null && typeof lap.ers_harvested_this_lap_mguh === 'number' && Number.isFinite(lap.ers_harvested_this_lap_mguh))
      ? lap.ers_harvested_this_lap_mguh
      : 0;
    const total = mguk + mguh;
    if (total > 0 && Number.isFinite(total)) {
      const percentage = (total / ERS_MAX_LOAD) * 100;
      if (Number.isFinite(percentage)) {
        harvestedValues.push(percentage);
        totalHarvested += total;
      }
    }
  });

  const averageRemaining = remainingValues.length > 0
    ? remainingValues.reduce((sum, val) => sum + val, 0) / remainingValues.length
    : null;

  const averageDeployed = deployedValues.length > 0
    ? deployedValues.reduce((sum, val) => sum + val, 0) / deployedValues.length
    : null;

  const averageHarvested = harvestedValues.length > 0
    ? harvestedValues.reduce((sum, val) => sum + val, 0) / harvestedValues.length
    : null;

  return {
    averageRemaining,
    averageDeployed,
    averageHarvested,
    totalDeployed: totalDeployed > 0 ? totalDeployed : null,
    totalHarvested: totalHarvested > 0 ? totalHarvested : null,
  };
};

