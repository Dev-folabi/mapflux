# MapFlux + Next.js Example

A working example showing MapFlux routing, geocoding, and map rendering in a Next.js app.

## Setup

```bash
cd examples/nextjs-app
pnpm install
cp .env.example .env.local  # add your ORS API key
pnpm dev
```

## .env.local

```
ORS_API_KEY=your-openrouteservice-api-key
REDIS_URL=redis://localhost:6379  # optional
```

## What it demonstrates

- MapFlux provider setup with ORS
- Route calculation between two points
- Map rendering with Leaflet (SSR-safe)
- Numbered pins for route stops
- Route polyline auto-rendering
- Geocoding with typeahead search
- Cache hit/miss events logged to console
