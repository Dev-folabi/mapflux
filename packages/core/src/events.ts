import type { MapFluxEvent } from './types'

type Listener = (...args: any[]) => void

export class EventEmitter {
  private listeners = new Map<MapFluxEvent, Set<Listener>>()

  on(event: MapFluxEvent, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  emit(event: MapFluxEvent, data?: any): void {
    this.listeners.get(event)?.forEach((fn) => fn(data))
  }
}
