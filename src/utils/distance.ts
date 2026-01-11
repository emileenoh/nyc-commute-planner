import * as turf from '@turf/turf';
import type { Station } from '../types/network';

/**
 * Standard walking speed in miles per hour
 */
export const WALKING_SPEED_MPH = 3;

/**
 * Default maximum walking distance in miles (0.5 miles ≈ 10 minutes at 3 mph)
 */
export const DEFAULT_MAX_WALK_DISTANCE_MILES = 0.5;

/**
 * Calculate distance between two points using turf.js distance function
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  // turf.distance returns kilometers, convert to miles
  return turf.distance(from, to, { units: 'miles' });
}

/**
 * Calculate walking time from distance
 * @param distanceMiles Distance in miles
 * @param walkSpeedMph Walking speed in miles per hour (default: 3 mph)
 * @returns Walking time in seconds
 */
export function calculateWalkingTime(
  distanceMiles: number,
  walkSpeedMph: number = WALKING_SPEED_MPH
): number {
  const timeHours = distanceMiles / walkSpeedMph;
  return Math.round(timeHours * 3600); // Convert to seconds
}

/**
 * Find stations within walking distance of a point
 * @param officeLat Latitude of office location
 * @param officeLon Longitude of office location
 * @param stations Array of stations to search
 * @param maxWalkDistanceMiles Maximum walking distance in miles
 * @returns Array of stations within walking distance with their distances
 */
export function findNearestStations(
  officeLat: number,
  officeLon: number,
  stations: Station[],
  maxWalkDistanceMiles: number = DEFAULT_MAX_WALK_DISTANCE_MILES
): Array<{ station: Station; distanceMiles: number; walkingTimeSec: number }> {
  const results: Array<{
    station: Station;
    distanceMiles: number;
    walkingTimeSec: number;
  }> = [];

  for (const station of stations) {
    const distance = calculateDistance(
      officeLat,
      officeLon,
      station.lat,
      station.lon
    );

    if (distance <= maxWalkDistanceMiles) {
      const walkingTime = calculateWalkingTime(distance);
      results.push({
        station,
        distanceMiles: distance,
        walkingTimeSec: walkingTime,
      });
    }
  }

  // Sort by distance (closest first)
  results.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return results;
}

