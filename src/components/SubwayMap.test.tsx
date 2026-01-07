import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubwayMap } from './SubwayMap';
import type {
  StationsFeatureCollection,
  EdgesFeatureCollection,
} from '../utils/geojson';

// Mock the useNetworkData hook
vi.mock('../hooks/useNetworkData', () => ({
  useNetworkData: vi.fn(),
}));

// Mock the routeColors utility
vi.mock('../utils/routeColors', () => ({
  getRouteColor: vi.fn((routeId: string) => `#color-${routeId}`),
}));

import { useNetworkData } from '../hooks/useNetworkData';

const mockUseNetworkData = useNetworkData as ReturnType<typeof vi.fn>;

describe('SubwayMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading message when data is loading', () => {
    mockUseNetworkData.mockReturnValue({
      stations: null,
      edges: null,
      loading: true,
      error: null,
    });

    render(<SubwayMap />);
    
    expect(screen.getByText('Loading subway network...')).toBeInTheDocument();
    expect(screen.queryByRole('application', { name: 'Subway map' })).not.toBeInTheDocument();
  });

  it('shows error message when data fails to load', () => {
    const errorMessage = 'Failed to load network data';
    mockUseNetworkData.mockReturnValue({
      stations: null,
      edges: null,
      loading: false,
      error: new Error(errorMessage),
    });

    render(<SubwayMap />);
    
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    expect(screen.queryByRole('application', { name: 'Subway map' })).not.toBeInTheDocument();
    expect(screen.queryByText('Loading subway network...')).not.toBeInTheDocument();
  });

  it('renders map when data is loaded', () => {
    const mockStations: StationsFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-73.98, 40.75],
          },
          properties: {
            id: 'station-1',
            name: 'Test Station',
            routesServed: ['1', '2'],
            accessible: true,
          },
        },
      ],
    };

    const mockEdges: EdgesFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-73.98, 40.75],
              [-73.99, 40.76],
            ],
          },
          properties: {
            fromId: 'station-1',
            toId: 'station-2',
            travelTimeSec: 120,
            routeId: '1',
          },
        },
      ],
    };

    mockUseNetworkData.mockReturnValue({
      stations: mockStations,
      edges: mockEdges,
      loading: false,
      error: null,
    });

    render(<SubwayMap />);

    // Verify map is rendered (user can see the map)
    expect(screen.getByRole('application', { name: 'Subway map' })).toBeInTheDocument();
    expect(screen.queryByText('Loading subway network...')).not.toBeInTheDocument();
    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
  });

  it('renders map when only edges are available', () => {
    const mockEdges: EdgesFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-73.98, 40.75],
              [-73.99, 40.76],
            ],
          },
          properties: {
            fromId: 'station-1',
            toId: 'station-2',
            travelTimeSec: 120,
            routeId: '1',
          },
        },
      ],
    };

    mockUseNetworkData.mockReturnValue({
      stations: null,
      edges: mockEdges,
      loading: false,
      error: null,
    });

    render(<SubwayMap />);

    expect(screen.getByRole('application', { name: 'Subway map' })).toBeInTheDocument();
    expect(screen.queryByText('Loading subway network...')).not.toBeInTheDocument();
  });

  it('renders map when only stations are available', () => {
    const mockStations: StationsFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-73.98, 40.75],
          },
          properties: {
            id: 'station-1',
            name: 'Test Station',
            routesServed: ['1', '2'],
            accessible: true,
          },
        },
      ],
    };

    mockUseNetworkData.mockReturnValue({
      stations: mockStations,
      edges: null,
      loading: false,
      error: null,
    });

    render(<SubwayMap />);

    expect(screen.getByRole('application', { name: 'Subway map' })).toBeInTheDocument();
    expect(screen.queryByText('Loading subway network...')).not.toBeInTheDocument();
  });

  it('renders map even when no data is available', () => {
    mockUseNetworkData.mockReturnValue({
      stations: null,
      edges: null,
      loading: false,
      error: null,
    });

    render(<SubwayMap />);

    expect(screen.getByRole('application', { name: 'Subway map' })).toBeInTheDocument();
    expect(screen.queryByText('Loading subway network...')).not.toBeInTheDocument();
  });
});

