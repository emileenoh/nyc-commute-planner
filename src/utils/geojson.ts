import type { Station, Edge, ProcessedNetwork } from '../types/network';

/**
 * GeoJSON Feature for a station point
 */
export interface StationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    name: string;
    routesServed: string[];
    accessible: boolean;
  };
}

/**
 * GeoJSON Feature for an edge line
 */
export interface EdgeFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [[number, number], [number, number]]; // [[fromLon, fromLat], [toLon, toLat]]
  };
  properties: {
    fromId: string;
    toId: string;
    travelTimeSec: number;
    routeId: string;
  };
}

/**
 * GeoJSON FeatureCollection for stations
 */
export interface StationsFeatureCollection {
  type: 'FeatureCollection';
  features: StationFeature[];
}

/**
 * GeoJSON FeatureCollection for edges
 */
export interface EdgesFeatureCollection {
  type: 'FeatureCollection';
  features: EdgeFeature[];
}

/**
 * Convert stations to GeoJSON Point features
 */
export function stationsToGeoJSON(stations: Station[]): StationsFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.map((station) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [station.lon, station.lat],
      },
      properties: {
        id: station.id,
        name: station.name,
        routesServed: station.routesServed,
        accessible: station.accessible,
      },
    })),
  };
}

/**
 * Convert edges to GeoJSON LineString features
 * Requires a station lookup map to get coordinates
 */
export function edgesToGeoJSON(
  edges: Edge[],
  stationMap: Map<string, Station>
): EdgesFeatureCollection {
  const features: EdgeFeature[] = [];

  for (const edge of edges) {
    const fromStation = stationMap.get(edge.fromId);
    const toStation = stationMap.get(edge.toId);

    // Skip if either station is missing
    if (!fromStation || !toStation) {
      continue;
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [fromStation.lon, fromStation.lat],
          [toStation.lon, toStation.lat],
        ],
      },
      properties: {
        fromId: edge.fromId,
        toId: edge.toId,
        travelTimeSec: edge.travelTimeSec,
        routeId: edge.routeId,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Convert processed network to GeoJSON
 */
export function networkToGeoJSON(network: ProcessedNetwork): {
  stations: StationsFeatureCollection;
  edges: EdgesFeatureCollection;
} {
  const stationMap = new Map<string, Station>();
  for (const station of network.stations) {
    stationMap.set(station.id, station);
  }

  return {
    stations: stationsToGeoJSON(network.stations),
    edges: edgesToGeoJSON(network.edges, stationMap),
  };
}

