# GTFS Preprocessing Script

This script processes raw GTFS (General Transit Feed Specification) data into a simplified network format for the frontend.

## Overview

The preprocessing script converts GTFS data into two main objects:

1. **Stations**: Subway stations with location and route information
2. **Edges**: Travel times between stations derived from trip data

## Schema

### Station
```typescript
{
  id: string;           // GTFS stop_id of parent station (stable, traceable)
  name: string;         // Station name
  lat: number;          // Latitude
  lon: number;          // Longitude
  accessible: boolean;  // Wheelchair accessibility (defaults to false)
  routesServed: string[]; // Array of route short names (e.g., ["1", "2", "3"])
}
```

### Edge
```typescript
{
  fromId: string;       // Source station ID
  toId: string;         // Destination station ID
  travelTimeSec: number; // Median travel time in seconds
  routeId: string;      // GTFS route_id
}
```

## How It Works

1. **Stations**: 
   - Reads `stops.txt` and identifies parent stations (location_type=1)
   - Maps child stops (like "101N", "101S") to their parent stations
   - Collects routes served by each station from `stop_times.txt` and `trips.txt`

2. **Edges**:
   - Processes `stop_times.txt` to find consecutive stops on each trip
   - Calculates travel time between consecutive stops
   - Aggregates travel times using median (handles multiple trips on same route)
   - Maps stop IDs to parent station IDs

## Usage

```bash
npm run preprocess
```

This will:
- Read GTFS files from `src/data/gtfs_subway/`
- Generate processed network data
- Write output to `src/data/processed/network.json`

## Output

The script generates `network.json` with:
- `stations`: Array of all subway stations
- `edges`: Array of all edges between stations

## Notes

- Station IDs are stable and tied to GTFS `stop_id` for traceability
- Travel times are aggregated using median to handle schedule variations
- The script handles overnight trips (time wrapping around midnight)
- Invalid travel times (>1 hour between consecutive stops) are filtered out

