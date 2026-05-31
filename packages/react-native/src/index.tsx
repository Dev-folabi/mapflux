import React, { createContext, useContext, useState, useEffect } from 'react'
import MapView, { Marker as RNMarker, Polyline as RNPolyline, Callout as RNCallout, Region } from 'react-native-maps'
import { View, Text, StyleSheet } from 'react-native'
import type { MapFlux, LatLng, RouteResult, MatrixResult } from '@mapflux/core'

// ─── Context ───────────────────────────────────────────────────────────────────

const MapFluxContext = createContext<MapFlux | null>(null)

export function MapFluxProvider({ instance, children }: { instance: MapFlux; children: React.ReactNode }) {
  return <MapFluxContext.Provider value={instance}>{children}</MapFluxContext.Provider>
}

export function useMapFlux(): MapFlux {
  const ctx = useContext(MapFluxContext)
  if (!ctx) throw new Error('useMapFlux must be used within <MapFluxProvider>')
  return ctx
}

// ─── Hooks (same API as @mapflux/react) ────────────────────────────────────────

export function useRoute(origin: LatLng | null, destination: LatLng | null, options?: any) {
  const flux = useMapFlux()
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!origin || !destination) return
    setIsLoading(true)
    setError(null)
    flux.route(origin, destination, options)
      .then(setRoute)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  return { route, isLoading, error }
}

export function useGeocode(query: string) {
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 3) { setResults([]); return }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`)
        const data = await res.json()
        setResults((data.features ?? []).map((f: any) => ({
          lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
          displayName: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', '),
        })))
      } catch { setResults([]) }
      finally { setIsLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { results, isLoading }
}

export function useMatrix(origins: LatLng[] | null, destinations: LatLng[] | null) {
  const flux = useMapFlux()
  const [matrix, setMatrix] = useState<MatrixResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!origins?.length || !destinations?.length) return
    setIsLoading(true)
    flux.matrix(origins, destinations).then(setMatrix).finally(() => setIsLoading(false))
  }, [origins, destinations])

  return { matrix, isLoading }
}

// ─── Components ────────────────────────────────────────────────────────────────

interface MapProps {
  region: Region
  style?: any
  provider?: 'google' | 'default'
  children?: React.ReactNode
}

export function Map({ region, style, provider, children }: MapProps) {
  return (
    <MapView region={region} style={style ?? styles.map} provider={provider as any}>
      {children}
    </MapView>
  )
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number }
  title?: string
  description?: string
  children?: React.ReactNode
}

export function Marker({ coordinate, title, description, children }: MarkerProps) {
  return (
    <RNMarker coordinate={coordinate} title={title} description={description}>
      {children}
    </RNMarker>
  )
}

interface NumberedPinProps {
  coordinate: { latitude: number; longitude: number }
  number: number
  color?: string
  size?: number
  children?: React.ReactNode
}

export function NumberedPin({ coordinate, number, color = '#0F2C4E', size = 28, children }: NumberedPinProps) {
  return (
    <RNMarker coordinate={coordinate}>
      <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={[styles.pinText, { fontSize: size * 0.4 }]}>{number}</Text>
      </View>
      {children}
    </RNMarker>
  )
}

interface RoutePolylineProps {
  coordinates: Array<{ latitude: number; longitude: number }>
  strokeColor?: string
  strokeWidth?: number
}

export function RoutePolyline({ coordinates, strokeColor = '#0F2C4E', strokeWidth = 4 }: RoutePolylineProps) {
  return <RNPolyline coordinates={coordinates} strokeColor={strokeColor} strokeWidth={strokeWidth} />
}

interface RouteLayerProps {
  origin: LatLng
  destination: LatLng
  options?: any
  strokeColor?: string
  strokeWidth?: number
}

export function RouteLayer({ origin, destination, options, strokeColor = '#0F2C4E', strokeWidth = 4 }: RouteLayerProps) {
  const { route } = useRoute(origin, destination, options)
  if (!route?.geometry?.length) return null
  const coords = route.geometry.map((p) => ({ latitude: p.lat, longitude: p.lng }))
  return <RoutePolyline coordinates={coords} strokeColor={strokeColor} strokeWidth={strokeWidth} />
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <RNCallout>{children}</RNCallout>
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  map: { flex: 1 },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pinText: { color: '#fff', fontWeight: '700' },
})
