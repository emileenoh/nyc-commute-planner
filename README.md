# NYC Commute Planner

Live demo hosted on Vercel: [https://nyc-commute-planner.vercel.app/](https://nyc-commute-planner.vercel.app/)

An interactive map visualization of the NYC subway network, built with React and MapLibre GL.

## Tech Stack

For this project, I imported [publicly available GTFS data] published by the MTA. The data is preprocessed with Node.js and converted into a GeoJSON graph consumed by the frontend. The frontend is built with React + TypeScript and MapLibre GL (via react-map-gl), and the whole app is hosted on vanilla Vercel.

## Calculating distance

The app calculates distance by using the coordinates of each subway station and the office location selected on the map. It uses geographic data to compute the shortest travel paths along the subway network rather than direct ("as-the-crow-flies") distance. When you choose a travel time, the app generates "isochrones" — polygons that show all areas reachable from the chosen location within that time limit, based on traveling through the subway lines and walking, not just straight-line distance.


## Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

