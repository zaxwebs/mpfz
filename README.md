# MPFZ

Maharashtra PFZ is a small Next.js app for viewing INCOIS Potential Fishing Zone advisory spots for Maharashtra.

## Features

- Spots list with search by coastal location
- Leaflet map with PFZ markers and spot popups
- Starred spots saved on the device
- Coordinate display setting: DMS or DDM
- Depth unit setting: metres or fathoms
- Local server-side cache for the latest successful INCOIS advisory

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run lint
npm run build
npm run start
```

## Data

PFZ data is fetched from INCOIS and cached locally in `.cache/`. The app checks for fresh Maharashtra advisory data once per day after 5:15 PM IST and falls back to the last successful cache if the source is unavailable.

User preferences and starred spots are stored in browser `localStorage`.
