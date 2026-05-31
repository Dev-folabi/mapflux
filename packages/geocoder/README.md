# @mapflux/geocoder

Geocoding abstraction for MapFlux. Forward and reverse geocoding via Nominatim and Photon.

## Install

```bash
npm install @mapflux/geocoder
```

## Usage

```ts
import { Geocoder } from '@mapflux/geocoder'

const geo = new Geocoder({
  provider: 'nominatim', // or 'photon'
  cache: flux.cache,     // optional — reuse MapFlux cache
})

// Forward geocoding (address → coordinates)
const results = await geo.forward('123 Main St, Los Angeles, CA')
// → [{ lat: 34.05, lng: -118.24, displayName: '123 Main St...', city: 'Los Angeles', state: 'CA' }]

// Reverse geocoding (coordinates → address)
const address = await geo.reverse({ lat: 34.05, lng: -118.24 })
// → { displayName: '123 Main St, Los Angeles, CA 90012', city: 'Los Angeles', ... }
```

## Providers

### Nominatim (default)

- Free, no API key required
- Rate limit: 1 request/second (enforced by MapFlux)
- Best for: reverse geocoding, structured results

### Photon

- Free, no API key required
- No strict rate limit
- Best for: autocomplete/typeahead (faster, more forgiving of partial input)

## Debounced Search (for typeahead)

```ts
import { createDebouncedGeocoder } from '@mapflux/geocoder'

const search = createDebouncedGeocoder({
  provider: 'photon',
  debounceMs: 300,
  minChars: 3,
})

// In your input handler:
const results = await search('123 Mai') // debounced, won't fire until 300ms pause
```

## License

MIT
