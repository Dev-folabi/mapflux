# @mapflux/react

React hooks and Leaflet-based map components for MapFlux.

## Install

```bash
npm install @mapflux/core @mapflux/react leaflet react-leaflet
```

## Components

### `<MapFluxProvider>`

Provides MapFlux instance to all child components and hooks.

```tsx
import { MapFluxProvider } from '@mapflux/react'

<MapFluxProvider instance={flux}>
  {children}
</MapFluxProvider>
```

### `<Map>`

Leaflet map container. Handles SSR safety automatically (dynamic import).

```tsx
<Map center={[34.05, -118.24]} zoom={12} className="h-[400px]">
  {children}
</Map>
```

### `<Marker>`

Standard map marker with optional popup.

```tsx
<Marker position={[34.05, -118.24]} icon={customIcon}>
  <Popup>Info here</Popup>
</Marker>
```

### `<NumberedPin>`

Numbered circle marker for route stops.

```tsx
<NumberedPin position={[34.05, -118.24]} number={1} color="#0F2C4E" />
<NumberedPin position={[34.01, -118.49]} number={2} color="#0F2C4E" />
```

### `<Polyline>`

Route line on the map.

```tsx
<Polyline positions={routeGeometry} color="#0F2C4E" weight={4} opacity={0.8} />
```

### `<RouteLayer>`

All-in-one: fetches route and renders polyline automatically.

```tsx
<RouteLayer
  origin={{ lat: 34.05, lng: -118.24 }}
  destination={{ lat: 34.01, lng: -118.49 }}
  color="#0F2C4E"
  weight={4}
/>
```

### `<FitBounds>`

Auto-fits map viewport to contain all points.

```tsx
<FitBounds bounds={[[34.05, -118.24], [34.01, -118.49]]} padding={[20, 20]} />
```

## Hooks

### `useRoute(origin, destination, options?)`

```tsx
const { route, isLoading, error } = useRoute(
  { lat: 34.05, lng: -118.24 },
  { lat: 34.01, lng: -118.49 },
)
// route.distance, route.duration, route.geometry
```

### `useGeocode(query)`

```tsx
const { results, isLoading } = useGeocode('123 Main St, LA')
// results: GeocodingResult[]
```

### `useMatrix(origins, destinations)`

```tsx
const { matrix, isLoading } = useMatrix(origins, destinations)
// matrix.durations[i][j], matrix.distances[i][j]
```

### `useMapFlux()`

```tsx
const flux = useMapFlux()
// Access the core MapFlux instance directly
```

## Peer Dependencies

- `react` >= 18
- `react-dom` >= 18
- `leaflet` >= 1.9
- `react-leaflet` >= 4.0

## License

MIT
