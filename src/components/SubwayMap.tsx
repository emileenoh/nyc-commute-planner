import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  const [travelTimeMinutes, setTravelTimeMinutes] = useState(45);
  const [isochrones, setIsochrones] = useState<Map<number, GeoJSON.Feature<GeoJSON.Polygon> | null>>(new Map());
  const { stations, edges, network, loading, error } = useNetworkData();
  
  // Cache for isochrone results: key = "lat_lon_time" (rounded to 15 minutes)
  const isochroneCacheRef = useRef<Map<string, GeoJSON.Feature<GeoJSON.Polygon> | null>>(new Map());

  const apiToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (apiToken) {
      mapboxgl.accessToken = apiToken;
    }
  }, [apiToken]);

  // Round travel time to nearest 15 minutes for caching and calculate all isochrones up to this time
  const roundedTravelTimeMinutes = useMemo(() => {
    return Math.round(travelTimeMinutes / 15) * 15;
  }, [travelTimeMinutes]);

  // Calculate all isochrones from 15 minutes up to the selected time (in 15-minute increments)
  useEffect(() => {
    if (officeLocation && network) {
      const newIsochrones = new Map<number, GeoJSON.Feature<GeoJSON.Polygon> | null>();
      const timesToCalculate: number[] = [];
      
      // Generate list of times to calculate: 15, 30, 45, ... up to roundedTravelTimeMinutes
      for (let time = 15; time <= roundedTravelTimeMinutes; time += 15) {
        timesToCalculate.push(time);
      }

      // Calculate or retrieve from cache for each time
      for (const timeMinutes of timesToCalculate) {
        const cacheKey = `${officeLocation.latitude.toFixed(6)}_${officeLocation.longitude.toFixed(6)}_${timeMinutes}`;
        
        // Check cache first
        const cached = isochroneCacheRef.current.get(cacheKey);
        if (cached !== undefined) {
          newIsochrones.set(timeMinutes, cached);
          continue;
        }

        // Calculate if not in cache
        try {
          const result = createIsochrone(officeLocation, network, timeMinutes * 60);
          const polygon = result?.polygon || null;
          
          // Cache the result
          isochroneCacheRef.current.set(cacheKey, polygon);
          
          // Limit cache size to prevent memory issues (keep last 100 entries)
          if (isochroneCacheRef.current.size > 100) {
            const firstKey = isochroneCacheRef.current.keys().next().value;
            if (firstKey) {
              isochroneCacheRef.current.delete(firstKey);
            }
          }
          
          newIsochrones.set(timeMinutes, polygon);
          
          if (result) {
            console.log(`Isochrone calculated for ${timeMinutes}m: ${result.totalStations} stations`);
          }
        } catch (err) {
          console.error(`Error calculating isochrone for ${timeMinutes}m:`, err);
          newIsochrones.set(timeMinutes, null);
          // Cache the error result (null) too
          isochroneCacheRef.current.set(cacheKey, null);
        }
      }

      setIsochrones(newIsochrones);
    } else {
      setIsochrones(new Map());
    }
  }, [officeLocation, network, roundedTravelTimeMinutes]);

  // Single color for all isochrones
  const getColor = useCallback((): string => {
    return 'rgb(0, 102, 204)'; // Single blue color for all polygons
  }, []);

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

          {/* Render isochrone polygons - render longest time first (behind), shortest time last (on top) */}
          {Array.from(isochrones.entries())
            .sort((a, b) => b[0] - a[0]) // Sort by time descending (longest first)
            .map(([timeMinutes, polygon]) => {
              if (!polygon) return null;
              
              const fillColor = getColor();
              // Use the same color for the stroke
              const strokeColor = fillColor;
              return (
                <Source
                  key={`isochrone-${timeMinutes}m`}
                  id={`isochrone-${timeMinutes}m`}
                  type="geojson"
                  data={{
                    type: 'FeatureCollection',
                    features: [polygon],
                  }}
                >
                  <Layer
                    id={`isochrone-${timeMinutes}m-fill`}
                    type="fill"
                    paint={{
                      'fill-color': fillColor,
                      'fill-opacity': 0.35, // Reduced opacity to see map features behind
                    }}
                  />
                  <Layer
                    id={`isochrone-${timeMinutes}m-stroke`}
                    type="line"
                    paint={{
                      'line-color': strokeColor,
                      'line-width': 2,
                      'line-opacity': 0.5,
                    }}
                  />
                </Source>
              );
            })}
        </MapGL>
        {officeLocation && (
          <div className="travel-time-control__buttons">
            {[15, 30, 45, 60].map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={`travel-time-control__button ${travelTimeMinutes === minutes ? 'travel-time-control__button--active' : ''}`}
                onClick={() => setTravelTimeMinutes(minutes)}
              >
                {minutes}m
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
