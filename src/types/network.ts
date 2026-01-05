/**
 * Station represents a subway station (parent station from GTFS)
 * IDs are stable and tied to GTFS stop_id for traceability
 */
export interface Station {
  id: string; // GTFS stop_id of parent station (location_type=1)
  name: string; // stop_name
  lat: number; // stop_lat
  lon: number; // stop_lon
  accessible: boolean; // wheelchair accessibility (defaults to false if not in GTFS)
  routesServed: string[]; // route_short_name values (e.g., ["1", "2", "3"])
}

/**
 * Edge represents travel time between two stations
 * Derived from consecutive stop_times on trips
 */
export interface Edge {
  fromId: string; // Station ID (parent station stop_id)
  toId: string; // Station ID (parent station stop_id)
  travelTimeSec: number; // Median travel time in seconds
  routeId: string; // route_id from GTFS
}

/**
 * Processed network data ready for frontend consumption
 */
export interface ProcessedNetwork {
  stations: Station[];
  edges: Edge[];
}

