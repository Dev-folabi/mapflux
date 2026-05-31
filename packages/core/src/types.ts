export interface LatLng {
  lat: number
  lng: number
}

export interface RouteOptions {
  profile?: 'driving' | 'cycling' | 'walking' | 'heavy-vehicle'
  units?: 'mi' | 'km'
  alternatives?: boolean
}

export interface RouteLeg {
  distance: number
  duration: number
  geometry: LatLng[]
}

export interface RouteResult {
  distance: number
  duration: number
  geometry: LatLng[]
  provider: string
  cached: boolean
  legs?: RouteLeg[]
}

export interface OptimizeOptions extends RouteOptions {
  roundTrip?: boolean
}

export interface OptimizeResult {
  sequence: number[]
  totalDistance: number
  totalDuration: number
  legs: RouteLeg[]
  provider: string
  cached: boolean
}

export interface MatrixOptions extends RouteOptions {}

export interface MatrixResult {
  durations: number[][]
  distances: number[][]
  provider: string
  cached: boolean
}

export interface RoutingProvider {
  name: string
  route(origin: LatLng, destination: LatLng, options?: RouteOptions): Promise<RouteResult>
  optimize?(start: LatLng, waypoints: LatLng[], options?: OptimizeOptions): Promise<OptimizeResult>
  matrix?(origins: LatLng[], destinations: LatLng[], options?: MatrixOptions): Promise<MatrixResult>
}

export interface CacheAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

export interface QuotaConfig {
  daily?: number
  perMinute?: number
}

export interface MapFluxConfig {
  providers: RoutingProvider[]
  cache?: {
    memory?: { maxSize?: number; ttl?: number }
    redis?: CacheAdapter
  }
  quota?: Record<string, QuotaConfig>
  retry?: { maxAttempts?: number; initialDelay?: number }
  dedup?: { enabled?: boolean; precision?: number; bucketMs?: number }
}

export type MapFluxEvent =
  | 'route:start'
  | 'route:complete'
  | 'route:error'
  | 'cache:hit'
  | 'cache:miss'
  | 'quota:warning'
  | 'quota:exhausted'
  | 'provider:switch'
