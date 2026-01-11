import { useState, useEffect } from 'react';
import type { ProcessedNetwork } from '../types/network';
import { networkToGeoJSON } from '../utils/geojson';
import type {
  StationsFeatureCollection,
  EdgesFeatureCollection,
} from '../utils/geojson';

interface UseNetworkDataResult {
  stations: StationsFeatureCollection | null;
  edges: EdgesFeatureCollection | null;
  network: ProcessedNetwork | null; // Raw network data for routing
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook to load and convert network data to GeoJSON
 */
export function useNetworkData(): UseNetworkDataResult {
  const [stations, setStations] = useState<StationsFeatureCollection | null>(null);
  const [edges, setEdges] = useState<EdgesFeatureCollection | null>(null);
  const [network, setNetwork] = useState<ProcessedNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadNetworkData() {
      try {
        setLoading(true);
        setError(null);

        // Load network.json - Vite will handle the import
        const networkModule = await import('../data/processed/network.json');
        const network = networkModule.default as ProcessedNetwork;

        // Convert to GeoJSON
        const { stations: stationsGeoJSON, edges: edgesGeoJSON } =
          networkToGeoJSON(network);

        setStations(stationsGeoJSON);
        setEdges(edgesGeoJSON);
        setNetwork(network); // Store raw network data for routing
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error loading network data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNetworkData();
  }, []);

  return { stations, edges, network, loading, error };
}

