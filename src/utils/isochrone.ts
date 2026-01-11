import * as turf from '@turf/turf';
import type { ProcessedNetwork, Station } from '../types/network';
import type { GeocodeResult } from '../types/geocoding';
import type { IsochroneResult, ReachableStation, StartStation } from '../types/isochrone';
import { findNearestStations, DEFAULT_MAX_WALK_DISTANCE_MILES } from './distance';
import { buildGraph, findReachableStations } from './routing';

/**
 * Default maximum travel time in seconds (30 minutes)
 */
export const DEFAULT_MAX_TRAVEL_TIME_SEC = 30 * 60;

/**
 * Generate a buffer (walkshed) around a station
 * @param station Station to create buffer around
 * @param distanceMiles Radius of buffer in miles
 * @returns GeoJSON Polygon feature
 */
export function generateStationBuffer(
  station: Station,
  distanceMiles: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const point = turf.point([station.lon, station.lat]);
  // turf.buffer returns a polygon, distance is in the units specified
  const buffered = turf.buffer(point, distanceMiles, { units: 'miles' });
  return buffered as GeoJSON.Feature<GeoJSON.Polygon>;
}

/**
 * Union multiple buffer polygons into a single polygon
 * @param buffers Array of polygon features to union
 * @returns Unioned polygon feature, or null if no buffers provided
 */
export function unionBuffers(
  buffers: GeoJSON.Feature<GeoJSON.Polygon>[]
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (buffers.length === 0) {
    return null;
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  // turf.union takes a single FeatureCollection with all features and returns a Feature
  const featureCollection = turf.featureCollection(buffers);
  const unioned = turf.union(featureCollection);

  if (!unioned) {
    return null;
  }

  return unioned as GeoJSON.Feature<GeoJSON.Polygon>;
}

/**
 * Create an isochrone polygon showing all areas reachable from an office location
 * @param officeLocation Office location coordinates
 * @param network Processed network data (stations and edges)
 * @param maxTravelTimeSec Maximum total travel time in seconds (default: 30 minutes)
 * @param walkDistanceMiles Walking distance radius around stations in miles (default: 0.5 miles)
 * @param maxWalkDistanceMiles Maximum walking distance from office to stations (default: 0.5 miles)
 * @returns Isochrone result with polygon and metadata, or null if no accessible stations
 */
export function createIsochrone(
  officeLocation: GeocodeResult,
  network: ProcessedNetwork,
  maxTravelTimeSec: number = DEFAULT_MAX_TRAVEL_TIME_SEC,
  walkDistanceMiles: number = DEFAULT_MAX_WALK_DISTANCE_MILES,
  maxWalkDistanceMiles: number = DEFAULT_MAX_WALK_DISTANCE_MILES
): IsochroneResult | null {
  // Step 1: Find stations within walking distance of office
  const nearbyStations = findNearestStations(
    officeLocation.latitude,
    officeLocation.longitude,
    network.stations,
    maxWalkDistanceMiles
  );

  if (nearbyStations.length === 0) {
    return null; // No stations within walking distance
  }

  // Step 2: Build graph from network
  const graph = buildGraph(network);

  // Step 3: Prepare start stations for routing
  // For each nearby station, calculate remaining time after walking to it
  const startStations: StartStation[] = nearbyStations.map(({ station, walkingTimeSec }) => ({
    stationId: station.id,
    remainingTimeSec: maxTravelTimeSec - walkingTimeSec,
  }));

  // Filter out start stations with negative remaining time
  const validStartStations = startStations.filter((s) => s.remainingTimeSec > 0);

  if (validStartStations.length === 0) {
    return null; // No stations reachable within time limit
  }

  // Step 4: Find all reachable stations using routing algorithm
  // We need to account for walking time to start stations
  // For multi-source Dijkstra, we'll track total time from office
  const reachableStationsMap = new Map<string, number>();

  // Run routing for each start station and track minimum time
  for (const nearby of nearbyStations) {
    if (nearby.walkingTimeSec <= maxTravelTimeSec) {
      const startStation: StartStation[] = [{
        stationId: nearby.station.id,
        remainingTimeSec: maxTravelTimeSec - nearby.walkingTimeSec,
      }];

      const reachableFromStart = findReachableStations(
        startStation,
        maxTravelTimeSec - nearby.walkingTimeSec,
        graph
      );

      // Update reachable stations with total time (walking + subway)
      for (const [stationId, subwayTime] of reachableFromStart.entries()) {
        const totalTime = nearby.walkingTimeSec + subwayTime;
        const existingTime = reachableStationsMap.get(stationId);

        if (existingTime === undefined || totalTime < existingTime) {
          reachableStationsMap.set(stationId, totalTime);
        }
      }
    }
  }

  // Convert to ReachableStation array
  const reachableStations: ReachableStation[] = Array.from(
    reachableStationsMap.entries()
  ).map(([stationId, travelTimeSec]) => ({
    stationId,
    travelTimeSec,
  }));

  if (reachableStations.length === 0) {
    return null;
  }

  // Step 5: Create station lookup map
  const stationMap = new Map<string, Station>();
  for (const station of network.stations) {
    stationMap.set(station.id, station);
  }

  // Step 6: Generate buffers around each reachable station
  const buffers: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  for (const reachable of reachableStations) {
    const station = stationMap.get(reachable.stationId);
    if (station) {
      const buffer = generateStationBuffer(station, walkDistanceMiles);
      buffers.push(buffer);
    }
  }

  // Step 7: Union all buffers into a single polygon
  const unionedPolygon = unionBuffers(buffers);

  if (!unionedPolygon) {
    return null;
  }

  // Step 8: Return result
  return {
    polygon: unionedPolygon as GeoJSON.Feature<GeoJSON.Polygon>,
    reachableStations,
    totalStations: reachableStations.length,
  };
}

