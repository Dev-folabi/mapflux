'use client'

import dynamic from 'next/dynamic'
import { flux } from '../lib/mapflux'
import { MapFluxProvider, useRoute, NumberedPin, RouteLayer, FitBounds } from '@mapflux/react'
import { useState } from 'react'

const Map = dynamic(() => import('@mapflux/react').then((m) => m.Map), { ssr: false })

const LA = { lat: 34.0522, lng: -118.2437 }
const SANTA_MONICA = { lat: 34.0195, lng: -118.4912 }

export default function Home() {
  const [origin] = useState(LA)
  const [destination] = useState(SANTA_MONICA)

  return (
    <MapFluxProvider instance={flux}>
      <main style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h1>MapFlux + Next.js Example</h1>
        <p>Route from Downtown LA to Santa Monica</p>

        <div style={{ height: 500, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <Map center={[origin.lat, origin.lng]} zoom={12} className="h-full w-full">
            <RouteLayer origin={origin} destination={destination} color="#0F2C4E" weight={4} />
            <NumberedPin position={[origin.lat, origin.lng]} number={1} />
            <NumberedPin position={[destination.lat, destination.lng]} number={2} />
            <FitBounds bounds={[[origin.lat, origin.lng], [destination.lat, destination.lng]]} />
          </Map>
        </div>

        <RouteInfo origin={origin} destination={destination} />
      </main>
    </MapFluxProvider>
  )
}

function RouteInfo({ origin, destination }: { origin: any; destination: any }) {
  const { route, isLoading, error } = useRoute(origin, destination)

  if (isLoading) return <p>Calculating route...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>
  if (!route) return null

  return (
    <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
      <p><strong>Distance:</strong> {route.distance} miles</p>
      <p><strong>Duration:</strong> {route.duration} minutes</p>
      <p><strong>Provider:</strong> {route.provider}</p>
      <p><strong>Cached:</strong> {route.cached ? 'Yes' : 'No'}</p>
    </div>
  )
}
