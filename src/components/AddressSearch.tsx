import { useState } from 'react';
import { SearchBox } from '@mapbox/search-js-react';
import type { GeocodeResult } from '../types/geocoding';
import './AddressSearch.scss';

interface AddressSearchProps {
  onLocationFound: (result: GeocodeResult) => void;
}

export function AddressSearch({ onLocationFound }: AddressSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apiToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const handleRetrieve = (res: any) => {
    try {
      // res.suggestions contains the selected suggestion
      // We need to get the feature from the suggestion
      if (!res.suggestions || res.suggestions.length === 0) {
        setError('No address selected');
        return;
      }

      const suggestion = res.suggestions[0];
      const feature = suggestion.feature;
      const [longitude, latitude] = feature.geometry.coordinates;
      const placeName = feature.properties.full_address || feature.place_name || suggestion.full_address;

      const result: GeocodeResult = {
        longitude,
        latitude,
        placeName,
      };

      setError(null);
      onLocationFound(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve address');
    }
  };

  if (!apiToken) {
    return (
      <div className="address-search">
        <div className="address-search__error" role="alert">
          Mapbox API key is not configured. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
        </div>
      </div>
    );
  }

  return (
    <div className="address-search">
      <div className="address-search__form">
        <label htmlFor="address-input" className="address-search__label">
          Office Address
        </label>
        <div className="address-search__input-wrapper">
          <SearchBox
            accessToken={apiToken}
            value={inputValue}
            onChange={(value) => setInputValue(value)}
            onRetrieve={handleRetrieve}
            options={{
              language: 'en',
              country: 'US',
              bbox: [-74.5, 40.4, -73.5, 41.0], // NYC bounding box
              limit: 5,
            }}
            placeholder="Enter office address (e.g., 350 5th Ave, New York, NY)"
          />
        </div>
        {error && (
          <div className="address-search__error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
