# MapFlux

**Open-source routing and mapping infrastructure toolkit for low-cost production apps.**

One API. Multiple providers. Zero lock-in. Built-in caching, quota protection, and map rendering for React and React Native.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## Why MapFlux?

You need routing, geocoding, and maps in your app. Your options:

- **Google Maps** — $7/1000 requests. Expensive at scale.
- **Mapbox** — Better pricing, still vendor lock-in.
- **Raw ORS/OSRM** — Free, but you rewrite caching, failover, and quota logic every time.

**MapFlux gives you:**

- 🔄 **Provider abstraction** — switch providers without rewriting code
- 💾 **Multi-level caching** — memory + your Redis = 90%+ cache hit rate
- 🛡️ **Quota protection** — never exceed free tier limits
- 🗺️ **Map rendering** — Leaflet (React) + react-native-maps (RN) with pins, routes, popups
- ⚡ **Request deduplication** — same route requested 10x = 1 API call
- 🔁 **Retry + failover** — automatic backoff and provider switching
- 📊 **Event system** — observe every request, cache hit, and failover

---

## Packages

| Package | Description | Size |
|---------|-------------|------|
| `@mapflux/core` | Provider abstraction, caching, quota, events, optimization | ~8KB |
| `@mapflux/provider-ors` | OpenRouteService adapter (free, 2000 req/day) | ~3KB |
| `@mapflux/provider-osrm` | OSRM adapter (self-hosted, unlimited) | ~2KB |
| `@mapflux/geocoder` | Geocoding via Nominatim + Photon | ~3KB |
| `@mapflux/react` | React hooks + Leaflet map components | ~12KB |
| `@mapflux/react-native` | React Native hooks + react-native-maps components | ~10KB |

---

## Quick Start

### Install

```bash
npm install @mapflux/core @mapflux/provider-ors @mapflux/react
```

### Setup

```ts
import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'

const flux = new MapFlux({
  providers: [
    new ORSProvider({ apiKey: process.env.ORS_API_KEY }),
  ],
  cache: {
    redis: { url: process.env.REDIS_URL }, // optional — memory cache is default
  },
})
```

### Route

```ts
const route = await flux.route(
  { lat: 34.05, lng: -118.24 },
  { lat: 34.01, lng: -118.49 },
  { profile: 'driving' }
)
// → { distance: 12.4, duration: 18, geometry: [...], provider: 'ors', cached: false }
```

### React — Map with Route

```tsx
import { MapFluxProvider, Map, RouteLayer, NumberedPin } from '@mapflux/react'

<MapFluxProvider instance={flux}>
  <Map center={[34.05, -118.24]} zoom={12} className="h-[400px]">
    <RouteLayer origin={start} destination={end} color="#0F2C4E" weight={4} />
    <NumberedPin position={start} number={1} />
    <NumberedPin position={end} number={2} />
  </Map>
</MapFluxProvider>
```

### React Native — Map with Route

```tsx
import { MapFluxProvider, Map, RouteLayer, NumberedPin } from '@mapflux/react-native'

<MapFluxProvider instance={flux}>
  <Map region={initialRegion} style={{ flex: 1 }}>
    <RouteLayer origin={start} destination={end} strokeColor="#0F2C4E" />
    <NumberedPin coordinate={start} number={1} />
    <NumberedPin coordinate={end} number={2} />
  </Map>
</MapFluxProvider>
```

---

## What You Provide (BYOS)

| Service | Required? | Purpose |
|---------|-----------|---------|
| ORS API key | Yes (if using ORS provider) | Routing API calls |
| Redis URL | Optional | Shared L2 cache across instances |
| OSRM endpoint | Optional | Self-hosted unlimited routing |

**Zero-config minimum** — just an ORS key. Memory cache and OSM tiles work out of the box.

---

## Features

### Provider Failover

```ts
const flux = new MapFlux({
  providers: [
    new ORSProvider({ apiKey: '...' }),      // primary
    new OSRMProvider({ baseUrl: '...' }),     // fallback
  ],
})
// If ORS fails or quota exhausted → automatic switch to OSRM
```

### Quota Protection

```ts
const flux = new MapFlux({
  providers: [...],
  quota: {
    ors: { daily: 1800, perMinute: 30 },  // stay under 2000 limit
  },
})

flux.on('quota:warning', ({ provider, used, limit }) => {
  console.log(`${provider}: ${used}/${limit} requests used`)
})
```

### Multi-Stop Optimization

```ts
const result = await flux.optimize(
  startPoint,
  [waypointA, waypointB, waypointC, waypointD],
  { profile: 'driving' }
)
// → { sequence: [C, A, D, B], totalDistance: 45.2, legs: [...] }
```

### Geocoding

```ts
import { Geocoder } from '@mapflux/geocoder'

const geo = new Geocoder({ provider: 'nominatim' })
const results = await geo.forward('123 Main St, Los Angeles')
const address = await geo.reverse({ lat: 34.05, lng: -118.24 })
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Your App                         │
├─────────────────────────────────────────────────┤
│  @mapflux/react  │  @mapflux/react-native       │  ← UI Layer
├─────────────────────────────────────────────────┤
│                @mapflux/core                      │  ← Logic Layer
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Cache   │ │  Quota   │ │  Dedup + Retry   │ │
│  │ Mem + KV │ │ Tracker  │ │  Circuit Breaker │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│  @mapflux/provider-ors  │  @mapflux/provider-osrm│  ← Provider Layer
└─────────────────────────────────────────────────┘
```

---

## License

MIT — use it however you want, commercially or otherwise.

---

## Examples

| Example | Stack | Shows |
|---------|-------|-------|
| [`examples/nextjs-app`](examples/nextjs-app) | Next.js + Leaflet | Route, map, pins, geocoding |
| [`examples/expo-app`](examples/expo-app) | Expo + react-native-maps | Native map, route polyline, callouts |

---

## Contributing

We use a **develop branch** workflow:

1. Fork the repo
2. Branch from `develop` as `feature/your-feature`
3. Submit PR targeting `develop`

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## License

MIT — use it however you want, commercially or otherwise.
