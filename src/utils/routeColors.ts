/**
 * MTA Subway Route Color Mapping
 * Maps route IDs to their standard MTA colors
 */

export const routeColors: Record<string, string> = {
  // Red Line (1, 2, 3)
  '1': '#D82233',
  '2': '#D82233',
  '3': '#D82233',
  
  // Green Line (4, 5, 6)
  '4': '#009952',
  '5': '#009952',
  '6': '#009952',
  
  // Blue Line (A, C, E)
  'A': '#0062CF',
  'C': '#0062CF',
  'E': '#0062CF',
  
  // Orange Line (B, D, F, M)
  'B': '#EB6800',
  'D': '#EB6800',
  'F': '#EB6800',
  'M': '#EB6800',
  
  // Light Green (G)
  'G': '#6CBE45',
  
  // Gray (L, S)
  'L': '#7C858C',
  'S': '#7C858C',
  'GS': '#7C858C',
  'FS': '#7C858C',
  'H': '#7C858C',
  
  // Yellow (N, Q, R, W)
  'N': '#F6BC26',
  'Q': '#F6BC26',
  'R': '#F6BC26',
  'W': '#F6BC26',
  
  // Brown (J, Z)
  'J': '#996633',
  'Z': '#996633',
  
  // Purple (7)
  '7': '#B933AD',
};

/**
 * Get color for a route ID
 * Returns default gray if route not found
 */
export function getRouteColor(routeId: string): string {
  return routeColors[routeId] || '#7C858C';
}

