import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { Station, Edge, ProcessedNetwork } from '../types/network.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse GTFS CSV file
 */
function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map((line: string) => {
    // Handle quoted fields that may contain commas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}

/**
 * Convert HH:MM:SS time string to seconds since midnight
 */
function timeToSeconds(timeStr: string): number {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get median value from array
 */
function median(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Preprocess GTFS data into Stations and Edges
 */
function preprocessGTFS(): ProcessedNetwork {
  // Resolve path relative to project root (not dist/)
  const projectRoot = path.resolve(__dirname, '..', '..');
  const dataPath = path.join(projectRoot, 'src', 'data', 'gtfs_subway');
  
  // Read GTFS files
  console.log('Reading GTFS files...');
  const stops = parseCSV(path.join(dataPath, 'stops.txt'));
  const stopTimes = parseCSV(path.join(dataPath, 'stop_times.txt'));
  const trips = parseCSV(path.join(dataPath, 'trips.txt'));
  const routes = parseCSV(path.join(dataPath, 'routes.txt'));
  
  // Parse headers
  const stopsHeader = stops[0];
  const stopTimesHeader = stopTimes[0];
  const tripsHeader = trips[0];
  const routesHeader = routes[0];
  
  const stopIdIdx = stopsHeader.indexOf('stop_id');
  const stopNameIdx = stopsHeader.indexOf('stop_name');
  const stopLatIdx = stopsHeader.indexOf('stop_lat');
  const stopLonIdx = stopsHeader.indexOf('stop_lon');
  const locationTypeIdx = stopsHeader.indexOf('location_type');
  const parentStationIdx = stopsHeader.indexOf('parent_station');
  
  const tripIdIdx = stopTimesHeader.indexOf('trip_id');
  const stopTimesStopIdIdx = stopTimesHeader.indexOf('stop_id');
  const arrivalTimeIdx = stopTimesHeader.indexOf('arrival_time');
  const departureTimeIdx = stopTimesHeader.indexOf('departure_time');
  const stopSequenceIdx = stopTimesHeader.indexOf('stop_sequence');
  
  const tripsTripIdIdx = tripsHeader.indexOf('trip_id');
  const routeIdIdx = tripsHeader.indexOf('route_id');
  
  const routeIdRoutesIdx = routesHeader.indexOf('route_id');
  const routeShortNameIdx = routesHeader.indexOf('route_short_name');
  
  // Build maps
  console.log('Building station maps...');
  
  // Map: stop_id -> parent_station_id (for child stops)
  const stopToParent = new Map<string, string>();
  
  // Map: parent_station_id -> Station data
  const stationsMap = new Map<string, Station>();
  
  // Map: stop_id -> route_short_name (for all stops, including children)
  const stopToRoutes = new Map<string, Set<string>>();
  
  // First pass: identify parent stations and map child stops
  for (let i = 1; i < stops.length; i++) {
    const row = stops[i];
    const stopId = row[stopIdIdx];
    const locationType = row[locationTypeIdx];
    const parentStation = row[parentStationIdx];
    
    if (locationType === '1') {
      // This is a parent station
      const name = row[stopNameIdx];
      const lat = parseFloat(row[stopLatIdx]);
      const lon = parseFloat(row[stopLonIdx]);
      
      stationsMap.set(stopId, {
        id: stopId,
        name,
        lat,
        lon,
        accessible: false, // Default to false (GTFS doesn't have this field in stops.txt)
        routesServed: [],
      });
    } else if (parentStation) {
      // This is a child stop, map it to parent
      stopToParent.set(stopId, parentStation);
    }
  }
  
  // Second pass: collect routes for each station via trips and stop_times
  console.log('Mapping routes to stations...');
  
  // Build trip_id -> route_id map
  const tripToRoute = new Map<string, string>();
  for (let i = 1; i < trips.length; i++) {
    const row = trips[i];
    const tripId = row[tripsTripIdIdx];
    const routeId = row[routeIdIdx];
    tripToRoute.set(tripId, routeId);
  }
  
  // Build route_id -> route_short_name map
  const routeIdToShortName = new Map<string, string>();
  for (let i = 1; i < routes.length; i++) {
    const row = routes[i];
    const routeId = row[routeIdRoutesIdx];
    const routeShortName = row[routeShortNameIdx];
    routeIdToShortName.set(routeId, routeShortName);
  }
  
  // Process stop_times to map routes to stops
  for (let i = 1; i < stopTimes.length; i++) {
    const row = stopTimes[i];
    const tripId = row[tripIdIdx];
    const stopId = row[stopTimesStopIdIdx];
    
    // Get parent station ID
    const parentId = stopToParent.get(stopId) || stopId;
    
    // Get route short name
    const routeId = tripToRoute.get(tripId);
    if (routeId) {
      const routeShortName = routeIdToShortName.get(routeId);
      if (routeShortName) {
        if (!stopToRoutes.has(parentId)) {
          stopToRoutes.set(parentId, new Set());
        }
        stopToRoutes.get(parentId)!.add(routeShortName);
      }
    }
  }
  
  // Update stations with routes
  for (const [stationId, station] of stationsMap.entries()) {
    const routesSet = stopToRoutes.get(stationId);
    if (routesSet) {
      station.routesServed = Array.from(routesSet).sort();
    }
  }
  
  // Third pass: build edges from consecutive stop_times
  console.log('Building edges from stop_times...');
  
  // Map: (fromId, toId, routeId) -> travel times array
  const edgeTravelTimes = new Map<string, number[]>();
  
  // Group stop_times by trip_id
  const tripStopTimes = new Map<string, Array<{
    stopId: string;
    arrivalTime: string;
    departureTime: string;
    sequence: number;
  }>>();
  
  for (let i = 1; i < stopTimes.length; i++) {
    const row = stopTimes[i];
    const tripId = row[tripIdIdx];
    const stopId = row[stopTimesStopIdIdx];
    const arrivalTime = row[arrivalTimeIdx];
    const departureTime = row[departureTimeIdx];
    const sequence = parseInt(row[stopSequenceIdx], 10);
    
    if (!tripStopTimes.has(tripId)) {
      tripStopTimes.set(tripId, []);
    }
    
    tripStopTimes.get(tripId)!.push({
      stopId,
      arrivalTime,
      departureTime,
      sequence,
    });
  }
  
  // Process each trip to create edges
  for (const [tripId, stops] of tripStopTimes.entries()) {
    // Sort by sequence
    stops.sort((a, b) => a.sequence - b.sequence);
    
    const routeId = tripToRoute.get(tripId);
    if (!routeId) continue;
    
    // Create edges between consecutive stops
    for (let i = 0; i < stops.length - 1; i++) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];
      
      // Get parent station IDs
      const fromParentId = stopToParent.get(fromStop.stopId) || fromStop.stopId;
      const toParentId = stopToParent.get(toStop.stopId) || toStop.stopId;
      
      // Skip if same parent station (intra-station travel)
      if (fromParentId === toParentId) continue;
      
      // Calculate travel time
      const fromTime = timeToSeconds(fromStop.departureTime);
      const toTime = timeToSeconds(toStop.arrivalTime);
      const travelTime = toTime - fromTime;
      
      // Handle overnight trips (time wraps around)
      const adjustedTravelTime = travelTime < 0 ? travelTime + 86400 : travelTime;
      
      // Skip invalid travel times (likely data errors)
      if (adjustedTravelTime < 0 || adjustedTravelTime > 3600) continue; // Max 1 hour between stops
      
      const edgeKey = `${fromParentId}|${toParentId}|${routeId}`;
      if (!edgeTravelTimes.has(edgeKey)) {
        edgeTravelTimes.set(edgeKey, []);
      }
      edgeTravelTimes.get(edgeKey)!.push(adjustedTravelTime);
    }
  }
  
  // Create edges with median travel times
  console.log('Aggregating edge travel times...');
  const edges: Edge[] = [];
  
  for (const [edgeKey, travelTimes] of edgeTravelTimes.entries()) {
    const [fromId, toId, routeId] = edgeKey.split('|');
    const medianTime = median(travelTimes);
    
    edges.push({
      fromId,
      toId,
      travelTimeSec: Math.round(medianTime),
      routeId,
    });
  }
  
  const stations = Array.from(stationsMap.values());
  
  console.log(`Processed ${stations.length} stations and ${edges.length} edges`);
  
  return { stations, edges };
}

// Main execution
async function main() {
  try {
    const network = preprocessGTFS();
    
    // Write output files
    const projectRoot = path.resolve(__dirname, '..', '..');
    const outputDir = path.join(projectRoot, 'src', 'data', 'processed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'network.json'),
      JSON.stringify(network, null, 2)
    );
    
    console.log(`\n✅ Preprocessing complete!`);
    console.log(`   Output: ${path.join(outputDir, 'network.json')}`);
    console.log(`   Stations: ${network.stations.length}`);
    console.log(`   Edges: ${network.edges.length}`);
  } catch (error) {
    console.error('Error preprocessing GTFS data:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { preprocessGTFS };

