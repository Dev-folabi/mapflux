import { MapFlux } from '@mapflux/core'
import { ORSProvider } from '@mapflux/provider-ors'

export const flux = new MapFlux({
  providers: [
    new ORSProvider({ apiKey: process.env.NEXT_PUBLIC_ORS_API_KEY ?? '' }),
  ],
  quota: { ors: { daily: 1800, perMinute: 30 } },
})

// Log events in development
if (process.env.NODE_ENV === 'development') {
  flux.on('route:complete', (d) => console.log(`[MapFlux] Route via ${d.provider}, cached: ${d.cached}`))
  flux.on('cache:hit', (d) => console.log(`[MapFlux] Cache hit: ${d.level}`))
  flux.on('quota:warning', (d) => console.warn(`[MapFlux] Quota warning: ${d.provider} ${d.used}/${d.limit}`))
}
