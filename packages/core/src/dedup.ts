import type { LatLng } from './types'

export class Deduplicator {
  private pending = new Map<string, Promise<any>>()
  private precision: number
  private bucketMs: number

  constructor(precision = 5, bucketMs = 300_000) {
    this.precision = precision
    this.bucketMs = bucketMs
  }

  hash(origin: LatLng, destination: LatLng, profile: string): string {
    const r = (n: number) => n.toFixed(this.precision)
    const bucket = Math.floor(Date.now() / this.bucketMs)
    return `${r(origin.lat)},${r(origin.lng)}:${r(destination.lat)},${r(destination.lng)}:${profile}:${bucket}`
  }

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key)
    if (existing) return existing as Promise<T>

    const promise = fn().finally(() => this.pending.delete(key))
    this.pending.set(key, promise)
    return promise
  }
}
