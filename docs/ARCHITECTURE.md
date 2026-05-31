# MapFlux Architecture

## Design Principles

1. **BYOS (Bring Your Own Services)** — MapFlux never hosts anything. Users provide their own API keys, Redis URLs, and endpoints.
2. **Zero-config works** — Memory cache + OSM tiles require no setup. Redis and multiple providers are opt-in.
3. **Tree-shakeable** — Import only what you use. Each package is independent.
4. **Framework-agnostic core** — `@mapflux/core` works in Node, browser, edge runtimes. Framework adapters are separate packages.
5. **Type-safe** — Full TypeScript with strict mode. No `any`.

---

## Package Dependency Graph

```
@mapflux/react ──────────┐
@mapflux/react-native ───┤
                         ▼
                  @mapflux/core
                    │       │
                    ▼       ▼
        @mapflux/provider-ors   @mapflux/provider-osrm
                    │
                    ▼
            @mapflux/geocoder (optional, standalone)
```

- `core` has zero runtime dependencies (only dev deps for types)
- Provider packages depend on `core` for interfaces only
- React/RN packages depend on `core` + their respective map library

---

## Core Internals

### Request Lifecycle

```
flux.route(origin, dest, options)
    │
    ▼
┌─ Deduplication Check ─┐
│  Hash: round(lat,5) + round(lng,5) + profile + time_bucket(5min)
│  If pending request with same hash → return same Promise (no duplicate call)
└────────────────────────┘
    │
    ▼
┌─ Cache Lookup ─────────┐
│  L1: Memory (LRU, 5min TTL)  → HIT? return immediately
│  L2: Redis (user-provided, 1hr TTL) → HIT? return + populate L1
└────────────────────────┘
    │ MISS
    ▼
┌─ Quota Check ──────────┐
│  Is provider under daily/minute limit?
│  YES → proceed
│  NO  → try next provider in chain
│  ALL EXHAUSTED → return stale cache or throw QuotaExhaustedError
└────────────────────────┘
    │
    ▼
┌─ Provider Call ────────┐
│  Call provider.route(origin, dest, options)
│  On success → cache result at L1 + L2, emit 'route:complete'
│  On error → retry with backoff (max 3 attempts)
│  On repeated failure → circuit breaker opens, skip provider for 5min
└────────────────────────┘
    │
    ▼
  Return RouteResult
```

### Cache Key Strategy

```
Route:    route:{profile}:{originLat5},{originLng5}:{destLat5},{destLng5}
Matrix:   matrix:{profile}:{hash(origins+destinations)}
Geocode:  geo:fwd:{hash(query)}  |  geo:rev:{lat5},{lng5}
```

Coordinates rounded to 5 decimal places (~1.1m precision) for deduplication. Two requests 50m apart hit the same cache key.

### Circuit Breaker States

```
CLOSED (normal) ──[failure]──► HALF_OPEN ──[failure]──► OPEN (skip provider)
       ▲                            │                         │
       └────────[success]───────────┘                         │
       └──────────────────────[timeout 5min]──────────────────┘
```

---

## Provider Interface

Every routing provider implements:

```ts
interface RoutingProvider {
  name: string
  
  route(
    origin: LatLng,
    destination: LatLng,
    options?: RouteOptions
  ): Promise<RouteResult>
  
  matrix(
    origins: LatLng[],
    destinations: LatLng[],
    options?: MatrixOptions
  ): Promise<MatrixResult>
  
  optimize(
    start: LatLng,
    waypoints: LatLng[],
    options?: OptimizeOptions
  ): Promise<OptimizeResult>
}
```

### Adding a provider

```ts
import { RoutingProvider, RouteResult } from '@mapflux/core'

export class MyProvider implements RoutingProvider {
  name = 'my-provider'
  
  async route(origin, destination, options) {
    // Call your API
    // Return normalized RouteResult
  }
}
```

---

## Cache Adapter Interface

```ts
interface CacheAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}
```

Built-in: `MemoryCache` (LRU, default).
User-provided: any Redis-compatible client wrapped in this interface.

---

## React Package (`@mapflux/react`)

### Components

| Component | Props | Renders |
|-----------|-------|---------|
| `<Map>` | center, zoom, className, children | Leaflet MapContainer |
| `<Marker>` | position, icon?, children | Leaflet Marker |
| `<NumberedPin>` | position, number, color? | Circle marker with number |
| `<Polyline>` | positions, color, weight, opacity | Leaflet Polyline |
| `<Popup>` | children | Leaflet Popup (inside Marker) |
| `<RouteLayer>` | origin, destination, options?, color | Auto-fetches route + renders polyline |
| `<FitBounds>` | bounds | Auto-fits map to bounds |

### Hooks

| Hook | Returns | Purpose |
|------|---------|---------|
| `useRoute(origin, dest, opts?)` | `{ route, isLoading, error }` | Fetch route with caching |
| `useGeocode(query)` | `{ results, isLoading }` | Debounced geocoding |
| `useMatrix(origins, dests)` | `{ matrix, isLoading }` | Distance matrix |
| `useMapFlux()` | `MapFlux` instance | Access core from context |

---

## React Native Package (`@mapflux/react-native`)

### Components

Built on `react-native-maps` (supports both Google Maps and Apple Maps):

| Component | Props | Renders |
|-----------|-------|---------|
| `<Map>` | region, style, children, provider? | MapView from react-native-maps |
| `<Marker>` | coordinate, title?, description? | RN Marker |
| `<NumberedPin>` | coordinate, number, color? | Custom marker with numbered view |
| `<RoutePolyline>` | coordinates, strokeColor, strokeWidth | RN Polyline |
| `<RouteLayer>` | origin, destination, options?, strokeColor | Auto-fetches + renders |
| `<Callout>` | children | RN Callout (tap marker to show) |

### Hooks

Same hooks as `@mapflux/react` — identical API:

| Hook | Returns |
|------|---------|
| `useRoute(origin, dest, opts?)` | `{ route, isLoading, error }` |
| `useGeocode(query)` | `{ results, isLoading }` |
| `useMatrix(origins, dests)` | `{ matrix, isLoading }` |
| `useMapFlux()` | `MapFlux` instance |

### Platform Differences

| Feature | React (Web) | React Native |
|---------|-------------|--------------|
| Map renderer | Leaflet + OSM tiles | react-native-maps (Google/Apple) |
| SSR handling | Dynamic import (no SSR) | N/A (no SSR in RN) |
| Tile source | OSM (free, no key) | Google Maps or Apple Maps |
| Offline tiles | Not in MVP | Not in MVP |
| Bundle | ESM + CJS | CJS (Metro compatible) |

---

## Data Types

```ts
interface LatLng {
  lat: number
  lng: number
}

interface RouteResult {
  distance: number        // miles
  duration: number        // minutes
  geometry: LatLng[]      // decoded polyline points
  provider: string        // which provider served this
  cached: boolean         // was this from cache?
  legs?: RouteLeg[]       // for multi-stop
}

interface RouteLeg {
  distance: number
  duration: number
  geometry: LatLng[]
}

interface OptimizeResult {
  sequence: number[]      // optimized order (0-indexed)
  totalDistance: number
  totalDuration: number
  legs: RouteLeg[]
}

interface MatrixResult {
  durations: number[][]   // minutes [origins][destinations]
  distances: number[][]   // miles [origins][destinations]
}

interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
  city?: string
  state?: string
  country?: string
}
```

---

## Bundle Size Targets

| Package | Target (gzipped) |
|---------|-----------------|
| `@mapflux/core` | < 8KB |
| `@mapflux/provider-ors` | < 3KB |
| `@mapflux/provider-osrm` | < 2KB |
| `@mapflux/geocoder` | < 3KB |
| `@mapflux/react` | < 12KB (excludes leaflet peer dep) |
| `@mapflux/react-native` | < 8KB (excludes react-native-maps peer dep) |
