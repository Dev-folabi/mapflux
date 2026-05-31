# @mapflux/core

The core engine of MapFlux. Handles provider abstraction, caching, quota management, request deduplication, retry logic, and route optimization.

## Install

```bash
npm install @mapflux/core
```

## Usage

```ts
import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'

const flux = new MapFlux({
  providers: [new ORSProvider({ apiKey: 'your-key' })],
  cache: {
    redis: { url: 'redis://localhost:6379' }, // optional
  },
  quota: {
    ors: { daily: 2000, perMinute: 40 },
  },
})

// Single route
const route = await flux.route(
  { lat: 34.05, lng: -118.24 },
  { lat: 34.01, lng: -118.49 },
)

// Multi-stop optimization
const optimized = await flux.optimize(
  { lat: 34.05, lng: -118.24 },
  [pointA, pointB, pointC],
)

// Distance matrix
const matrix = await flux.matrix([origin1, origin2], [dest1, dest2])

// Events
flux.on('route:complete', ({ route, provider, cached }) => {
  console.log(`Route via ${provider}, cached: ${cached}`)
})

flux.on('quota:warning', ({ provider, used, limit }) => {
  console.warn(`${provider}: ${used}/${limit}`)
})
```

## Configuration

```ts
interface MapFluxConfig {
  providers: RoutingProvider[]
  cache?: {
    memory?: { maxSize?: number; ttl?: number }  // defaults: 500 entries, 5min
    redis?: { url: string; ttl?: number }        // user provides Redis URL
  }
  quota?: Record<string, { daily?: number; perMinute?: number }>
  retry?: { maxAttempts?: number; backoff?: 'exponential' | 'linear' }
  dedup?: { enabled?: boolean; roundPrecision?: number; timeBucket?: number }
}
```

## API

### `flux.route(origin, destination, options?)`

Returns `Promise<RouteResult>`

### `flux.optimize(start, waypoints, options?)`

Returns `Promise<OptimizeResult>` — optimized stop order using TSP solver

### `flux.matrix(origins, destinations, options?)`

Returns `Promise<MatrixResult>` — N×M duration/distance matrix

### Events

| Event | Payload |
|-------|---------|
| `route:start` | `{ origin, destination, options }` |
| `route:complete` | `{ route, provider, cached, duration }` |
| `route:error` | `{ error, provider, willRetry }` |
| `cache:hit` | `{ key, level }` |
| `cache:miss` | `{ key }` |
| `quota:warning` | `{ provider, used, limit }` |
| `quota:exhausted` | `{ provider }` |
| `provider:switch` | `{ from, to, reason }` |

## License

MIT
