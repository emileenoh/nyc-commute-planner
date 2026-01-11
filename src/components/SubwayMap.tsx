import { useMemo, useRef, useState, useEffect } from 'react';
import MapGL, { Source, Layer, MapRef } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import mapboxgl from 'mapbox-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNetworkData } from '../hooks/useNetworkData';
import { getRouteColor } from '../utils/routeColors';
import type { EdgeFeature } from '../utils/geojson';
import { SearchBox } from '@mapbox/search-js-react';
import type { GeocodeResult } from '../types/geocoding';
import { createIsochrone } from '../utils/isochrone';
import './SubwayMap.scss';

export function SubwayMap() {
  const mapRef = useRef<MapRef>(null);
  const [inputValue, setInputValue] = useState('');
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [officeLocation, setOfficeLocation] = useState<GeocodeResult | null>(null);
  const [isochronePolygon, setIsochronePolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const { stations, edges, network, loading, error } = useNetworkData();

  const apiToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (apiToken) {
      mapboxgl.accessToken = apiToken;
    }
  }, [apiToken]);

  // Calculate isochrone when office location or network changes
  useEffect(() => {
    if (officeLocation && network) {
      try {
        const result = createIsochrone(officeLocation, network);
        if (result) {
          setIsochronePolygon(result.polygon);
          console.log(`Isochrone calculated: ${result.totalStations} accessible stations`);
        } else {
          setIsochronePolygon(null);
          console.log('No stations accessible within time limit');
        }
      } catch (err) {
        console.error('Error calculating isochrone:', err);
        setIsochronePolygon(null);
      }
    } else {
      setIsochronePolygon(null);
    }
  }, [officeLocation, network]);

  const handleRetrieve = (res: any) => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    
    // Remove existing marker if any
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Get coordinates from the selected result
    if (res.features && res.features.length > 0) {
      const feature = res.features[0];
      const coordinates = feature.geometry?.coordinates;
      
      if (coordinates && coordinates.length >= 2) {
        const [lng, lat] = coordinates;
        const placeName = feature.properties?.full_address || feature.place_name || '';
        
        // Store office location for isochrone calculation
        const location: GeocodeResult = {
          longitude: lng,
          latitude: lat,
          placeName,
        };
        setOfficeLocation(location);
        
        // Add marker to map
        const marker = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map as any);
        
        markerRef.current = marker;
      }
    }
  };

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
    <div className="subway-map-container">
      {apiToken && (
        <div className="subway-map-search">
          <SearchBox
            accessToken={apiToken}
            mapboxgl={mapboxgl}
            value={inputValue}
            onChange={(value) => setInputValue(value)}
            onRetrieve={handleRetrieve}
            options={{
              language: 'en',
              country: 'US',
              bbox: [-74.5, 40.4, -73.5, 41.0], // NYC bounding box
            }}
          />
        </div>
      )}
      <div className="subway-map">
        <MapGL
          ref={mapRef}
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

          {/* Render isochrone polygon */}
          {isochronePolygon && (
            <Source
              id="isochrone"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: [isochronePolygon],
              }}
            >
              <Layer
                id="isochrone-fill"
                type="fill"
                paint={{
                  'fill-color': '#0066cc',
                  'fill-opacity': 0.2,
                }}
              />
              <Layer
                id="isochrone-stroke"
                type="line"
                paint={{
                  'line-color': '#0066cc',
                  'line-width': 2,
                  'line-opacity': 0.5,
                }}
              />
            </Source>
          )}
        </MapGL>
      </div>
    </div>
  );
}
