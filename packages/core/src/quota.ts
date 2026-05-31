import type { QuotaConfig } from './types'

interface Counter { daily: number; minute: number; dayKey: string; minKey: string }

export class QuotaTracker {
  private counters = new Map<string, Counter>()
  private configs: Record<string, QuotaConfig>

  constructor(configs: Record<string, QuotaConfig> = {}) {
    this.configs = configs
  }

  canRequest(provider: string): boolean {
    const config = this.configs[provider]
    if (!config) return true
    const counter = this.getCounter(provider)
    if (config.daily && counter.daily >= config.daily) return false
    if (config.perMinute && counter.minute >= config.perMinute) return false
    return true
  }

  record(provider: string): void {
    const counter = this.getCounter(provider)
    counter.daily++
    counter.minute++
  }

  getUsage(provider: string): { daily: number; minute: number } {
    const c = this.getCounter(provider)
    return { daily: c.daily, minute: c.minute }
  }

  private getCounter(provider: string): Counter {
    const now = new Date()
    const dayKey = now.toISOString().slice(0, 10)
    const minKey = now.toISOString().slice(0, 16)

    let counter = this.counters.get(provider)
    if (!counter || counter.dayKey !== dayKey) {
      counter = { daily: 0, minute: 0, dayKey, minKey }
      this.counters.set(provider, counter)
    } else if (counter.minKey !== minKey) {
      counter.minute = 0
      counter.minKey = minKey
    }
    return counter
  }
}
