import type { LatLng, RouteOptions, RouteResult, OptimizeOptions, OptimizeResult, MatrixOptions, MatrixResult, MapFluxConfig, CacheAdapter } from './types'
import { EventEmitter } from './events'
import { MemoryCache } from './cache'
import { Deduplicator } from './dedup'
import { QuotaTracker } from './quota'
import { CircuitBreaker, withRetry } from './retry'

export class MapFlux {
  private providers: MapFluxConfig['providers']
  private l1Cache: CacheAdapter
  private l2Cache: CacheAdapter | null
  private dedup: Deduplicator
  private quota: QuotaTracker
  private breaker: CircuitBreaker
  private retryConfig: { maxAttempts: number; initialDelay: number }
  public events: EventEmitter

  constructor(config: MapFluxConfig) {
    this.providers = config.providers
    this.l1Cache = new MemoryCache(config.cache?.memory?.maxSize ?? 500)
    this.l2Cache = config.cache?.redis ?? null
    this.dedup = new Deduplicator(config.dedup?.precision ?? 5, config.dedup?.bucketMs ?? 300_000)
    this.quota = new QuotaTracker(config.quota ?? {})
    this.breaker = new CircuitBreaker()
    this.retryConfig = { maxAttempts: config.retry?.maxAttempts ?? 3, initialDelay: config.retry?.initialDelay ?? 1000 }
    this.events = new EventEmitter()
  }

  on(event: any, fn: any): () => void { return this.events.on(event, fn) }

  async route(origin: LatLng, destination: LatLng, options?: RouteOptions): Promise<RouteResult> {
    const profile = options?.profile ?? 'driving'
    const cacheKey = `route:${this.dedup.hash(origin, destination, profile)}`

    this.events.emit('route:start', { origin, destination, options })

    // Check caches
    const cached = await this.cacheGet(cacheKey)
    if (cached) {
      const result: RouteResult = { ...JSON.parse(cached), cached: true }
      this.events.emit('route:complete', { route: result, provider: result.provider, cached: true })
      this.events.emit('cache:hit', { key: cacheKey, level: 'memory' })
      return result
    }
    this.events.emit('cache:miss', { key: cacheKey })

    // Deduplicated provider call
    return this.dedup.dedupe(cacheKey, async () => {
      const result = await this.callProvider('route', (p) => p.route(origin, destination, options)) as RouteResult
      await this.cacheSet(cacheKey, JSON.stringify(result), 300)
      this.events.emit('route:complete', { route: result, provider: result.provider, cached: false })
      return result
    })
  }

  async optimize(start: LatLng, waypoints: LatLng[], options?: OptimizeOptions): Promise<OptimizeResult> {
    return this.callProvider('optimize', (p) => {
      if (!p.optimize) throw new Error(`Provider ${p.name} does not support optimize`)
      return p.optimize(start, waypoints, options)
    }) as Promise<OptimizeResult>
  }

  async matrix(origins: LatLng[], destinations: LatLng[], options?: MatrixOptions): Promise<MatrixResult> {
    return this.callProvider('matrix', (p) => {
      if (!p.matrix) throw new Error(`Provider ${p.name} does not support matrix`)
      return p.matrix(origins, destinations, options)
    }) as Promise<MatrixResult>
  }

  private async callProvider<T>(op: string, fn: (p: any) => Promise<T>): Promise<T> {
    for (const provider of this.providers) {
      if (this.breaker.isOpen(provider.name)) {
        this.events.emit('provider:switch', { from: provider.name, to: 'next', reason: 'circuit_open' })
        continue
      }
      if (!this.quota.canRequest(provider.name)) {
        this.events.emit('quota:exhausted', { provider: provider.name })
        this.events.emit('provider:switch', { from: provider.name, to: 'next', reason: 'quota_exhausted' })
        continue
      }

      try {
        const result = await withRetry(() => fn(provider), this.retryConfig.maxAttempts, this.retryConfig.initialDelay)
        this.quota.record(provider.name)
        this.breaker.recordSuccess(provider.name)

        // Quota warning at 80%
        const usage = this.quota.getUsage(provider.name)
        const config = (this as any).quota?.configs?.[provider.name]
        if (config?.daily && usage.daily > config.daily * 0.8) {
          this.events.emit('quota:warning', { provider: provider.name, used: usage.daily, limit: config.daily })
        }

        return result
      } catch (err: any) {
        this.breaker.recordFailure(provider.name)
        this.events.emit('route:error', { error: err, provider: provider.name, willRetry: false })
      }
    }
    throw new Error('All providers failed or exhausted')
  }

  private async cacheGet(key: string): Promise<string | null> {
    const l1 = await this.l1Cache.get(key)
    if (l1) return l1
    if (this.l2Cache) {
      const l2 = await this.l2Cache.get(key)
      if (l2) { await this.l1Cache.set(key, l2, 300); return l2 }
    }
    return null
  }

  private async cacheSet(key: string, value: string, ttl: number): Promise<void> {
    await this.l1Cache.set(key, value, ttl)
    if (this.l2Cache) await this.l2Cache.set(key, value, ttl * 12) // L2 gets longer TTL
  }
}
