# @mapflux/react-native

React Native hooks and map components for MapFlux. Built on `react-native-maps`.

## Install

```bash
npm install @mapflux/core @mapflux/react-native react-native-maps
```

For Expo:
```bash
npx expo install react-native-maps
```

## Components

### `<MapFluxProvider>`

Same pattern as `@mapflux/react` — provides MapFlux instance via context.

```tsx
import { MapFluxProvider } from '@mapflux/react-native'

<MapFluxProvider instance={flux}>
  {children}
</MapFluxProvider>
```

### `<Map>`

Wraps `react-native-maps` MapView. Supports Google Maps (Android) and Apple Maps (iOS).

```tsx
import { Map } from '@mapflux/react-native'

<Map
  region={{ latitude: 34.05, longitude: -118.24, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
  style={{ flex: 1 }}
  provider="google" // or "default" for Apple Maps on iOS
>
  {children}
</Map>
```

### `<Marker>`

Native map marker.

```tsx
<Marker coordinate={{ latitude: 34.05, longitude: -118.24 }} title="Start" />
```

### `<NumberedPin>`

Custom marker with a numbered circle view.

```tsx
<NumberedPin
  coordinate={{ latitude: 34.05, longitude: -118.24 }}
  number={1}
  color="#0F2C4E"
  size={28}
/>
```

### `<RoutePolyline>`

Renders a polyline from an array of coordinates.

```tsx
<RoutePolyline
  coordinates={route.geometry.map(p => ({ latitude: p.lat, longitude: p.lng }))}
  strokeColor="#0F2C4E"
  strokeWidth={4}
/>
```

### `<RouteLayer>`

All-in-one: fetches route and renders polyline.

```tsx
<RouteLayer
  origin={{ lat: 34.05, lng: -118.24 }}
  destination={{ lat: 34.01, lng: -118.49 }}
  strokeColor="#0F2C4E"
  strokeWidth={4}
/>
```

### `<Callout>`

Info popup shown when marker is tapped.

```tsx
<Marker coordinate={coord}>
  <Callout>
    <View>
      <Text>Client: Marcus Johnson</Text>
      <Text>Fee: $145</Text>
    </View>
  </Callout>
</Marker>
```

## Hooks

Identical API to `@mapflux/react`:

```tsx
import { useRoute, useGeocode, useMatrix, useMapFlux } from '@mapflux/react-native'

function RouteInfo() {
  const { route, isLoading, error } = useRoute(origin, destination)
  if (isLoading) return <ActivityIndicator />
  return <Text>{route.duration} min · {route.distance} mi</Text>
}
```

## Full Example

```tsx
import { MapFluxProvider, Map, RouteLayer, NumberedPin, Marker, Callout } from '@mapflux/react-native'
import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'
import { View, Text } from 'react-native'

const flux = new MapFlux({
  providers: [new ORSProvider({ apiKey: 'your-key' })],
})

export default function DeliveryMap() {
  const stops = [
    { lat: 34.05, lng: -118.24, name: 'Pickup' },
    { lat: 34.01, lng: -118.49, name: 'Delivery' },
  ]

  return (
    <MapFluxProvider instance={flux}>
      <Map
        region={{ latitude: 34.03, longitude: -118.36, latitudeDelta: 0.15, longitudeDelta: 0.15 }}
        style={{ flex: 1 }}
      >
        <RouteLayer
          origin={stops[0]}
          destination={stops[1]}
          strokeColor="#0F2C4E"
          strokeWidth={4}
        />
        {stops.map((stop, i) => (
          <NumberedPin key={i} coordinate={{ latitude: stop.lat, longitude: stop.lng }} number={i + 1}>
            <Callout>
              <View><Text>{stop.name}</Text></View>
            </Callout>
          </NumberedPin>
        ))}
      </Map>
    </MapFluxProvider>
  )
}
```

## Platform Notes

| Feature | iOS | Android |
|---------|-----|---------|
| Map provider | Apple Maps (default) or Google Maps | Google Maps |
| Custom markers | ✅ | ✅ |
| Polylines | ✅ | ✅ |
| Callouts | ✅ | ✅ |
| Animated region | ✅ | ✅ |

## Peer Dependencies

- `react` >= 18
- `react-native` >= 0.72
- `react-native-maps` >= 1.8

## License

MIT
