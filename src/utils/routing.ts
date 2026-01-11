import type { ProcessedNetwork, Edge } from '../types/network';
import type { StartStation } from '../types/isochrone';

/**
 * Graph representation: adjacency list
 * Map from station ID to array of outgoing edges
 */
export type Graph = Map<string, Edge[]>;

/**
 * Build a graph from the processed network
 * Creates an adjacency list representation for efficient routing
 */
export function buildGraph(network: ProcessedNetwork): Graph {
  const graph = new Map<string, Edge[]>();

  // Initialize all stations with empty arrays
  for (const station of network.stations) {
    graph.set(station.id, []);
  }

  // Add edges to the graph
  for (const edge of network.edges) {
    const edges = graph.get(edge.fromId);
    if (edges) {
      edges.push(edge);
    }
  }

  return graph;
}

/**
 * Find all stations reachable within the time limit using multi-source Dijkstra's algorithm
 * @param startStations Array of starting stations with their remaining time
 * @param maxTimeSec Maximum travel time in seconds
 * @param graph Graph representation of the network
 * @returns Map of station ID to travel time (only stations within time limit)
 */
export function findReachableStations(
  startStations: StartStation[],
  maxTimeSec: number,
  graph: Graph
): Map<string, number> {
  // Map to track minimum time to reach each station
  const dist = new Map<string, number>();

  // Priority queue: [time, stationId]
  // Using a simple array and sorting - for better performance, could use a heap
  const queue: Array<[number, string]> = [];

  // Initialize distances for start stations
  for (const start of startStations) {
    if (start.remainingTimeSec >= 0) {
      dist.set(start.stationId, 0);
      queue.push([0, start.stationId]);
    }
  }

  // Sort queue by time (priority queue simulation)
  queue.sort((a, b) => a[0] - b[0]);

  while (queue.length > 0) {
    // Get station with minimum distance
    const [currentTime, currentId] = queue.shift()!;

    // Skip if we've already found a better path
    const bestTime = dist.get(currentId);
    if (bestTime !== undefined && currentTime > bestTime) {
      continue;
    }

    // If this station was reached with time <= maxTime, explore neighbors
    if (currentTime <= maxTimeSec) {
      const edges = graph.get(currentId);
      if (edges) {
        for (const edge of edges) {
          const newTime = currentTime + edge.travelTimeSec;

          // Only consider if within time limit
          if (newTime <= maxTimeSec) {
            const existingTime = dist.get(edge.toId);

            // If we found a shorter path, update it
            if (existingTime === undefined || newTime < existingTime) {
              dist.set(edge.toId, newTime);
              queue.push([newTime, edge.toId]);
              // Re-sort queue (inefficient but simple - could optimize with heap)
              queue.sort((a, b) => a[0] - b[0]);
            }
          }
        }
      }
    }
  }

  // Filter to only include stations within time limit and return as map
  const result = new Map<string, number>();
  for (const [stationId, time] of dist.entries()) {
    if (time <= maxTimeSec) {
      result.set(stationId, time);
    }
  }

  return result;
}

