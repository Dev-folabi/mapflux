import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryCache } from '../cache'
import { Deduplicator } from '../dedup'
import { QuotaTracker } from '../quota'
import { CircuitBreaker, withRetry } from '../retry'
import { EventEmitter } from '../events'
import { MapFlux } from '../mapflux'
import type { RoutingProvider, RouteResult } from '../types'

// ─── MemoryCache ───────────────────────────────────────────────────────────────

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => { cache = new MemoryCache(3) })

  it('returns null for missing keys', async () => {
    expect(await cache.get('missing')).toBeNull()
  })

  it('stores and retrieves values', async () => {
    await cache.set('key1', 'value1', 60)
    expect(await cache.get('key1')).toBe('value1')
  })

  it('expires entries after TTL', async () => {
    vi.useFakeTimers()
    await cache.set('key1', 'value1', 1)
    vi.advanceTimersByTime(2000)
    expect(await cache.get('key1')).toBeNull()
    vi.useRealTimers()
  })

  it('evicts oldest entry when maxSize reached', async () => {
    await cache.set('a', '1', 60)
    await cache.set('b', '2', 60)
    await cache.set('c', '3', 60)
    await cache.set('d', '4', 60) // should evict 'a'
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('d')).toBe('4')
  })

  it('deletes entries', async () => {
    await cache.set('key1', 'value1', 60)
    await cache.del('key1')
    expect(await cache.get('key1')).toBeNull()
  })
})

// ─── Deduplicator ──────────────────────────────────────────────────────────────

describe('Deduplicator', () => {
  it('generates consistent hashes for same coordinates', () => {
    const dedup = new Deduplicator(5, 300_000)
    const h1 = dedup.hash({ lat: 34.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 }, 'driving')
    const h2 = dedup.hash({ lat: 34.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 }, 'driving')
    expect(h1).toBe(h2)
  })

  it('generates different hashes for different coordinates', () => {
    const dedup = new Deduplicator(5, 300_000)
    const h1 = dedup.hash({ lat: 34.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 }, 'driving')
    const h2 = dedup.hash({ lat: 35.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 }, 'driving')
    expect(h1).not.toBe(h2)
  })

  it('deduplicates concurrent identical requests', async () => {
    const dedup = new Deduplicator()
    let callCount = 0
    const fn = async () => { callCount++; return 'result' }

    const [r1, r2] = await Promise.all([
      dedup.dedupe('key1', fn),
      dedup.dedupe('key1', fn),
    ])

    expect(r1).toBe('result')
    expect(r2).toBe('result')
    expect(callCount).toBe(1) // only called once
  })
})

// ─── QuotaTracker ──────────────────────────────────────────────────────────────

describe('QuotaTracker', () => {
  it('allows requests when under limit', () => {
    const tracker = new QuotaTracker({ ors: { daily: 100, perMinute: 10 } })
    expect(tracker.canRequest('ors')).toBe(true)
  })

  it('blocks requests when daily limit reached', () => {
    const tracker = new QuotaTracker({ ors: { daily: 2 } })
    tracker.record('ors')
    tracker.record('ors')
    expect(tracker.canRequest('ors')).toBe(false)
  })

  it('allows requests for unconfigured providers', () => {
    const tracker = new QuotaTracker({ ors: { daily: 100 } })
    expect(tracker.canRequest('osrm')).toBe(true)
  })

  it('tracks usage correctly', () => {
    const tracker = new QuotaTracker({})
    tracker.record('ors')
    tracker.record('ors')
    expect(tracker.getUsage('ors')).toEqual({ daily: 2, minute: 2 })
  })
})

// ─── CircuitBreaker ────────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const breaker = new CircuitBreaker()
    expect(breaker.isOpen('ors')).toBe(false)
  })

  it('opens after threshold failures', () => {
    const breaker = new CircuitBreaker()
    for (let i = 0; i < 5; i++) breaker.recordFailure('ors')
    expect(breaker.isOpen('ors')).toBe(true)
  })

  it('resets on success', () => {
    const breaker = new CircuitBreaker()
    for (let i = 0; i < 3; i++) breaker.recordFailure('ors')
    breaker.recordSuccess('ors')
    expect(breaker.isOpen('ors')).toBe(false)
  })
})

// ─── withRetry ─────────────────────────────────────────────────────────────────

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const result = await withRetry(() => Promise.resolve('ok'), 3, 10)
    expect(result).toBe('ok')
  })

  it('retries on failure then succeeds', async () => {
    let attempts = 0
    const fn = async () => { attempts++; if (attempts < 3) throw new Error('fail'); return 'ok' }
    const result = await withRetry(fn, 3, 10)
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('throws after max attempts', async () => {
    const fn = async () => { throw new Error('always fails') }
    await expect(withRetry(fn, 2, 10)).rejects.toThrow('always fails')
  })
})

// ─── EventEmitter ──────────────────────────────────────────────────────────────

describe('EventEmitter', () => {
  it('emits events to listeners', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()
    emitter.on('route:complete', handler)
    emitter.emit('route:complete', { test: true })
    expect(handler).toHaveBeenCalledWith({ test: true })
  })

  it('unsubscribes correctly', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()
    const unsub = emitter.on('route:start', handler)
    unsub()
    emitter.emit('route:start', {})
    expect(handler).not.toHaveBeenCalled()
  })
})

// ─── MapFlux Integration ───────────────────────────────────────────────────────

describe('MapFlux', () => {
  const mockProvider: RoutingProvider = {
    name: 'mock',
    async route(origin, destination) {
      return { distance: 10.5, duration: 15, geometry: [origin, destination], provider: 'mock', cached: false }
    },
    async optimize(start, waypoints) {
      return { sequence: waypoints.map((_, i) => i), totalDistance: 20, totalDuration: 30, legs: [], provider: 'mock', cached: false }
    },
    async matrix(origins, destinations) {
      return { durations: [[10]], distances: [[5]], provider: 'mock', cached: false }
    },
  }

  it('routes through provider', async () => {
    const flux = new MapFlux({ providers: [mockProvider] })
    const result = await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })
    expect(result.distance).toBe(10.5)
    expect(result.provider).toBe('mock')
  })

  it('caches route results', async () => {
    const spy = vi.spyOn(mockProvider, 'route')
    const flux = new MapFlux({ providers: [mockProvider] })

    await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })
    const r2 = await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })

    expect(r2.cached).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('emits events', async () => {
    const flux = new MapFlux({ providers: [mockProvider] })
    const handler = vi.fn()
    flux.on('route:complete', handler)
    await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })
    expect(handler).toHaveBeenCalled()
  })

  it('fails over to next provider', async () => {
    const failProvider: RoutingProvider = {
      name: 'fail',
      async route() { throw new Error('down') },
    }
    const flux = new MapFlux({ providers: [failProvider, mockProvider], retry: { maxAttempts: 1, initialDelay: 10 } })
    const result = await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })
    expect(result.provider).toBe('mock')
  })

  it('respects quota limits', async () => {
    const flux = new MapFlux({ providers: [mockProvider], quota: { mock: { daily: 1 } } })
    await flux.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })
    // Second call with different coords should fail (quota exhausted, no fallback)
    await expect(flux.route({ lat: 36, lng: -120 }, { lat: 37, lng: -121 })).rejects.toThrow('All providers failed')
  })

  it('optimizes routes', async () => {
    const flux = new MapFlux({ providers: [mockProvider] })
    const result = await flux.optimize({ lat: 34, lng: -118 }, [{ lat: 35, lng: -119 }, { lat: 36, lng: -120 }])
    expect(result.sequence).toEqual([0, 1])
  })

  it('computes matrix', async () => {
    const flux = new MapFlux({ providers: [mockProvider] })
    const result = await flux.matrix([{ lat: 34, lng: -118 }], [{ lat: 35, lng: -119 }])
    expect(result.durations[0][0]).toBe(10)
  })
})
