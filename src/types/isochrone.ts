/**
 * Station that can be reached within the time limit
 */
export interface ReachableStation {
  stationId: string;
  travelTimeSec: number; // Total time from office to this station
}

/**
 * Result of isochrone calculation
 */
export interface IsochroneResult {
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  reachableStations: ReachableStation[];
  totalStations: number;
}

/**
 * Start station for routing algorithm
 * Includes the station ID and remaining time after walking to it
 */
export interface StartStation {
  stationId: string;
  remainingTimeSec: number; // Time available for subway travel after walking
}

