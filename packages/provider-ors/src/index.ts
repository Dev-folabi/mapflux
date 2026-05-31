import type { RoutingProvider, LatLng, RouteOptions, RouteResult, OptimizeOptions, OptimizeResult, MatrixOptions, MatrixResult } from '@mapflux/core'

interface ORSConfig {
  apiKey: string
  baseUrl?: string
}

export class ORSProvider implements RoutingProvider {
  name = 'ors'
  private apiKey: string
  private baseUrl: string

  constructor(config: ORSConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? 'https://api.openrouteservice.org/v2'
  }

  async route(origin: LatLng, destination: LatLng, options?: RouteOptions): Promise<RouteResult> {
    const profile = options?.profile ?? 'driving'
    const orsProfile = profile === 'driving' ? 'driving-car' : profile === 'cycling' ? 'cycling-regular' : profile === 'walking' ? 'foot-walking' : 'driving-car'

    const res = await fetch(`${this.baseUrl}/directions/${orsProfile}/json`, {
      method: 'POST',
      headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]], units: options?.units === 'km' ? 'km' : 'mi' }),
    })
    if (!res.ok) throw new Error(`ORS error: ${res.status} ${await res.text()}`)

    const data = await res.json() as any
    const route = data.routes?.[0]
    if (!route) throw new Error('ORS returned no routes')

    return {
      distance: Math.round(route.summary.distance * 100) / 100,
      duration: Math.ceil(route.summary.duration / 60),
      geometry: this.decodeGeometry(route.geometry),
      provider: this.name,
      cached: false,
    }
  }

  async optimize(start: LatLng, waypoints: LatLng[], options?: OptimizeOptions): Promise<OptimizeResult> {
    const jobs = waypoints.map((w, i) => ({ id: i + 1, location: [w.lng, w.lat] }))
    const vehicles = [{ id: 1, profile: 'driving-car', start: [start.lng, start.lat], ...(options?.roundTrip ? { end: [start.lng, start.lat] } : {}) }]

    const res = await fetch(`${this.baseUrl}/optimization`, {
      method: 'POST',
      headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs, vehicles }),
    })
    if (!res.ok) throw new Error(`ORS optimize error: ${res.status}`)

    const data = await res.json() as any
    const steps = data.routes?.[0]?.steps?.filter((s: any) => s.type === 'job') ?? []

    return {
      sequence: steps.map((s: any) => s.id - 1),
      totalDistance: (data.routes?.[0]?.distance ?? 0) / 1609.34,
      totalDuration: Math.ceil((data.routes?.[0]?.duration ?? 0) / 60),
      legs: steps.map((s: any) => ({ distance: (s.distance ?? 0) / 1609.34, duration: Math.ceil((s.duration ?? 0) / 60), geometry: [] })),
      provider: this.name,
      cached: false,
    }
  }

  async matrix(origins: LatLng[], destinations: LatLng[], options?: MatrixOptions): Promise<MatrixResult> {
    const locations = [...origins, ...destinations].map((p) => [p.lng, p.lat])
    const sources = origins.map((_, i) => i)
    const dests = destinations.map((_, i) => i + origins.length)

    const res = await fetch(`${this.baseUrl}/matrix/driving-car/json`, {
      method: 'POST',
      headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations, sources, destinations: dests, metrics: ['duration', 'distance'], units: options?.units === 'km' ? 'km' : 'mi' }),
    })
    if (!res.ok) throw new Error(`ORS matrix error: ${res.status}`)

    const data = await res.json() as any
    return {
      durations: (data.durations ?? []).map((row: number[]) => row.map((d) => Math.ceil(d / 60))),
      distances: data.distances ?? [],
      provider: this.name,
      cached: false,
    }
  }

  private decodeGeometry(encoded: string): LatLng[] {
    // ORS returns encoded polyline (precision 5)
    const points: LatLng[] = []
    let lat = 0, lng = 0, index = 0
    while (index < encoded.length) {
      let shift = 0, result = 0, byte: number
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
      lat += result & 1 ? ~(result >> 1) : result >> 1
      shift = 0; result = 0
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
      lng += result & 1 ? ~(result >> 1) : result >> 1
      points.push({ lat: lat / 1e5, lng: lng / 1e5 })
    }
    return points
  }
}
