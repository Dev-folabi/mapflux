export class CircuitBreaker {
  private failures = new Map<string, { count: number; openUntil: number }>()
  private threshold = 5
  private resetMs = 300_000 // 5 minutes

  isOpen(provider: string): boolean {
    const state = this.failures.get(provider)
    if (!state) return false
    if (state.count >= this.threshold) {
      if (Date.now() < state.openUntil) return true
      // Half-open: reset and allow one attempt
      state.count = 0
    }
    return false
  }

  recordFailure(provider: string): void {
    const state = this.failures.get(provider) ?? { count: 0, openUntil: 0 }
    state.count++
    if (state.count >= this.threshold) state.openUntil = Date.now() + this.resetMs
    this.failures.set(provider, state)
  }

  recordSuccess(provider: string): void {
    this.failures.delete(provider)
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      if (i < maxAttempts - 1) {
        const delay = initialDelay * Math.pow(2, i) * (0.5 + Math.random() * 0.5)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}
