import type { RoutingProvider, LatLng, RouteOptions, RouteResult, OptimizeOptions, OptimizeResult, MatrixOptions, MatrixResult } from '@mapflux/core'

interface OSRMConfig {
  baseUrl: string
}

export class OSRMProvider implements RoutingProvider {
  name = 'osrm'
  private baseUrl: string

  constructor(config: OSRMConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
  }

  async route(origin: LatLng, destination: LatLng, options?: RouteOptions): Promise<RouteResult> {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
    const res = await fetch(`${this.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=polyline`)
    if (!res.ok) throw new Error(`OSRM error: ${res.status}`)

    const data = await res.json() as any
    const route = data.routes?.[0]
    if (!route) throw new Error('OSRM returned no routes')

    const miles = options?.units === 'km' ? route.distance / 1000 : route.distance / 1609.34

    return {
      distance: Math.round(miles * 100) / 100,
      duration: Math.ceil(route.duration / 60),
      geometry: this.decodePolyline(route.geometry),
      provider: this.name,
      cached: false,
    }
  }

  async optimize(start: LatLng, waypoints: LatLng[], options?: OptimizeOptions): Promise<OptimizeResult> {
    const allPoints = [start, ...waypoints]
    const coords = allPoints.map((p) => `${p.lng},${p.lat}`).join(';')
    const roundTrip = options?.roundTrip !== false ? 'true' : 'false'
    const source = 'first'

    const res = await fetch(`${this.baseUrl}/trip/v1/driving/${coords}?roundtrip=${roundTrip}&source=${source}&geometries=polyline&overview=full`)
    if (!res.ok) throw new Error(`OSRM trip error: ${res.status}`)

    const data = await res.json() as any
    const trip = data.trips?.[0]
    if (!trip) throw new Error('OSRM returned no trips')

    const miles = options?.units === 'km' ? trip.distance / 1000 : trip.distance / 1609.34
    // Extract waypoint order (skip first which is start)
    const sequence = (data.waypoints ?? []).slice(1).map((w: any) => w.waypoint_index - 1)

    return {
      sequence,
      totalDistance: Math.round(miles * 100) / 100,
      totalDuration: Math.ceil(trip.duration / 60),
      legs: (trip.legs ?? []).map((leg: any) => ({
        distance: Math.round((options?.units === 'km' ? leg.distance / 1000 : leg.distance / 1609.34) * 100) / 100,
        duration: Math.ceil(leg.duration / 60),
        geometry: this.decodePolyline(leg.geometry ?? ''),
      })),
      provider: this.name,
      cached: false,
    }
  }

  async matrix(origins: LatLng[], destinations: LatLng[], options?: MatrixOptions): Promise<MatrixResult> {
    const allPoints = [...origins, ...destinations]
    const coords = allPoints.map((p) => `${p.lng},${p.lat}`).join(';')
    const sources = origins.map((_, i) => i).join(';')
    const dests = destinations.map((_, i) => i + origins.length).join(';')

    const res = await fetch(`${this.baseUrl}/table/v1/driving/${coords}?sources=${sources}&destinations=${dests}`)
    if (!res.ok) throw new Error(`OSRM table error: ${res.status}`)

    const data = await res.json() as any
    const factor = options?.units === 'km' ? 1000 : 1609.34

    return {
      durations: (data.durations ?? []).map((row: number[]) => row.map((d) => Math.ceil(d / 60))),
      distances: (data.distances ?? []).map((row: number[]) => row.map((d) => Math.round((d / factor) * 100) / 100)),
      provider: this.name,
      cached: false,
    }
  }

  private decodePolyline(encoded: string): LatLng[] {
    if (!encoded) return []
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
