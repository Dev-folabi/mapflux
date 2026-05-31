'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker as LeafletMarker, Polyline as LeafletPolyline, Popup as LeafletPopup, CircleMarker, useMap } from 'react-leaflet'
import type { MapFlux, LatLng, RouteResult, MatrixResult } from '@mapflux/core'
import L from 'leaflet'

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

// ─── Hooks ─────────────────────────────────────────────────────────────────────

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

export function useGeocode(query: string, config?: { debounceMs?: number }) {
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
    }, config?.debounceMs ?? 300)
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
  center: [number, number]
  zoom?: number
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function Map({ center, zoom = 13, className, style, children }: MapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} style={style} scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {children}
    </MapContainer>
  )
}

interface MarkerProps {
  position: [number, number] | LatLng
  icon?: L.Icon
  children?: React.ReactNode
}

export function Marker({ position, icon, children }: MarkerProps) {
  const pos: [number, number] = Array.isArray(position) ? position : [position.lat, position.lng]
  return <LeafletMarker position={pos} icon={icon}>{children}</LeafletMarker>
}

interface NumberedPinProps {
  position: [number, number] | LatLng
  number: number
  color?: string
  size?: number
}

export function NumberedPin({ position, number, color = '#0F2C4E', size = 24 }: NumberedPinProps) {
  const pos: [number, number] = Array.isArray(position) ? position : [position.lat, position.lng]
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${size * 0.45}px;font-weight:700;font-family:sans-serif;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  return <LeafletMarker position={pos} icon={icon} />
}

interface PolylineProps {
  positions: Array<[number, number] | LatLng>
  color?: string
  weight?: number
  opacity?: number
}

export function Polyline({ positions, color = '#0F2C4E', weight = 4, opacity = 0.8 }: PolylineProps) {
  const coords = positions.map((p) => (Array.isArray(p) ? p : [p.lat, p.lng]) as [number, number])
  return <LeafletPolyline positions={coords} pathOptions={{ color, weight, opacity }} />
}

export function Popup({ children }: { children: React.ReactNode }) {
  return <LeafletPopup>{children}</LeafletPopup>
}

interface RouteLayerProps {
  origin: LatLng
  destination: LatLng
  options?: any
  color?: string
  weight?: number
}

export function RouteLayer({ origin, destination, options, color = '#0F2C4E', weight = 4 }: RouteLayerProps) {
  const { route } = useRoute(origin, destination, options)
  if (!route?.geometry?.length) return null
  return <Polyline positions={route.geometry} color={color} weight={weight} />
}

// FitBounds helper
export function FitBounds({ bounds, padding }: { bounds: [number, number][]; padding?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (bounds.length > 0) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: padding ?? [30, 30] })
  }, [bounds, map])
  return null
}
