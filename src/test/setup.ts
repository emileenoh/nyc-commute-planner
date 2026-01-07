import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock MapGL component to avoid rendering actual map in tests
// Using accessible role and visible structure instead of test IDs
vi.mock('react-map-gl', () => {
  const MapGL = ({ children, ...props }: any) =>
    React.createElement(
      'div',
      {
        role: 'application',
        'aria-label': 'Subway map',
        className: 'map-container',
        ...props,
      },
      children
    );

  const Source = ({ children, ...props }: any) =>
    React.createElement('div', { className: `map-source-${props.id}`, ...props }, children);

  const Layer = (props: any) =>
    React.createElement('div', { className: `map-layer-${props.id}`, ...props });

  return {
    default: MapGL,
    Source,
    Layer,
  };
});

