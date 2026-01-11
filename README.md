# NYC Commute Planner

Live demo hosted on Vercel: [https://nyc-commute-planner-zkrm.vercel.app/](https://nyc-commute-planner-zkrm.vercel.app/)

An interactive map visualization of the NYC subway network, built with React and MapLibre GL.

## Tech Stack

- **Frontend**: React + TypeScript, Vite, MapLibre GL (via react-map-gl)
- **Data Processing**: Node.js/TypeScript preprocessing script that converts GTFS data into a network graph
- **Data Source**: Public GTFS data from [MTA](https://new.mta.info/developers) (Metropolitan Transportation Authority)
- **Deployment**: Vercel

The preprocessing script processes raw GTFS files (stops, routes, trips, stop_times) to create a simplified network representation with stations and edges (travel times between consecutive stations), which is then loaded by the frontend for visualization.

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

