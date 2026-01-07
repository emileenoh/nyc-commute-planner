import { useMemo } from 'react';
import MapGL, { Source, Layer } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNetworkData } from '../hooks/useNetworkData';
import { getRouteColor } from '../utils/routeColors';
import type { EdgeFeature } from '../utils/geojson';
import './SubwayMap.scss';

export function SubwayMap() {
  const { stations, edges, loading, error } = useNetworkData();

  // Group edges by route for separate layers
  const edgesByRoute = useMemo(() => {
    if (!edges) return new Map<string, EdgeFeature[]>();

    const grouped = new Map<string, EdgeFeature[]>();
    for (const feature of edges.features) {
      const routeId = feature.properties.routeId;
      if (!grouped.has(routeId)) {
        grouped.set(routeId, []);
      }
      grouped.get(routeId)!.push(feature);
    }
    return grouped;
  }, [edges]);

  if (loading) {
    return (
      <div className="loading-container">
        <div>Loading subway network...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="subway-map">
      <MapGL
        mapLib={maplibregl as any}
        initialViewState={{
          longitude: -73.98,
          latitude: 40.75,
          zoom: 11,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
      {/* Render edges grouped by route */}
      {Array.from(edgesByRoute.entries()).map(([routeId, routeEdges]) => {
        const routeColor = getRouteColor(routeId);
        const routeEdgesCollection = {
          type: 'FeatureCollection' as const,
          features: routeEdges,
        };

        return (
          <Source
            key={`edges-${routeId}`}
            id={`edges-${routeId}`}
            type="geojson"
            data={routeEdgesCollection}
          >
            <Layer
              id={`edges-${routeId}`}
              type="line"
              paint={{
                'line-color': routeColor,
                'line-width': 3,
                'line-opacity': 0.7,
              }}
            />
          </Source>
        );
      })}

      {/* Render stations */}
      {stations && (
        <Source id="stations" type="geojson" data={stations}>
          <Layer
            id="stations"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['length', ['get', 'routesServed']],
                1,
                2,
                5,
                2, 
              ],
              'circle-color': '#ffffff',
              'circle-stroke-color': '#333333',
              'circle-stroke-width': 1,
              'circle-opacity': 0.9,
            }}
          />
        </Source>
      )}
      </MapGL>
    </div>
  );
}

