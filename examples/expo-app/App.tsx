import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'
import { MapFluxProvider, Map, RouteLayer, NumberedPin, Callout, useRoute } from '@mapflux/react-native'

const flux = new MapFlux({
  providers: [new ORSProvider({ apiKey: 'YOUR_ORS_KEY' })],
})

const LA = { lat: 34.0522, lng: -118.2437 }
const SANTA_MONICA = { lat: 34.0195, lng: -118.4912 }

export default function App() {
  return (
    <MapFluxProvider instance={flux}>
      <View style={styles.container}>
        <Map
          region={{ latitude: 34.035, longitude: -118.37, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
          style={styles.map}
        >
          <RouteLayer origin={LA} destination={SANTA_MONICA} strokeColor="#0F2C4E" strokeWidth={4} />
          <NumberedPin coordinate={{ latitude: LA.lat, longitude: LA.lng }} number={1}>
            <Callout><View><Text>Downtown LA</Text></View></Callout>
          </NumberedPin>
          <NumberedPin coordinate={{ latitude: SANTA_MONICA.lat, longitude: SANTA_MONICA.lng }} number={2}>
            <Callout><View><Text>Santa Monica</Text></View></Callout>
          </NumberedPin>
        </Map>
        <RouteInfo />
      </View>
    </MapFluxProvider>
  )
}

function RouteInfo() {
  const { route, isLoading } = useRoute(LA, SANTA_MONICA)
  if (isLoading) return <Text style={styles.info}>Calculating route...</Text>
  if (!route) return null
  return <Text style={styles.info}>{route.distance} mi · {route.duration} min · via {route.provider}</Text>
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  info: { padding: 16, textAlign: 'center', fontSize: 14 },
})
