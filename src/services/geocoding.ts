/**
 * Geocode result type
 * Used when converting SearchBox results to our application format
 */
export interface GeocodeResult {
  longitude: number;
  latitude: number;
  placeName: string;
}

