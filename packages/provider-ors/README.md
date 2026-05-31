# @mapflux/provider-ors

OpenRouteService provider for MapFlux. Free tier: 2,000 requests/day.

## Install

```bash
npm install @mapflux/core @mapflux/provider-ors
```

## Usage

```ts
import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'

const flux = new MapFlux({
  providers: [
    new ORSProvider({
      apiKey: process.env.ORS_API_KEY,
      baseUrl: 'https://api.openrouteservice.org/v2', // default
    }),
  ],
})
```

## Get an API Key

1. Go to https://openrouteservice.org/dev/#/signup
2. Create a free account
3. Generate a token
4. Free tier: 2,000 directions requests/day, 500 matrix requests/day

## Supported Operations

| Operation | ORS Endpoint | MapFlux Method |
|-----------|-------------|----------------|
| Directions | `/v2/directions/{profile}/json` | `flux.route()` |
| Optimization | `/v2/optimization` | `flux.optimize()` |
| Matrix | `/v2/matrix/{profile}/json` | `flux.matrix()` |

## Profiles

- `driving` (default)
- `cycling`
- `walking`
- `heavy-vehicle`

## License

MIT
