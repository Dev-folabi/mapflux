import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ORSProvider } from '../index'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ORSProvider', () => {
  let provider: ORSProvider

  beforeEach(() => {
    provider = new ORSProvider({ apiKey: 'test-key' })
    mockFetch.mockReset()
  })

  describe('route', () => {
    it('calls ORS directions endpoint with correct params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ summary: { distance: 15.5, duration: 1200 }, geometry: 'mfp_I~ps|U' }],
        }),
      })

      const result = await provider.route({ lat: 34.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openrouteservice.org/v2/directions/driving-car/json',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.distance).toBe(15.5)
      expect(result.duration).toBe(20) // 1200s = 20min
      expect(result.provider).toBe('ors')
      expect(result.cached).toBe(false)
    })

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'Rate limited' })
      await expect(provider.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })).rejects.toThrow('ORS error: 429')
    })

    it('maps profile correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [{ summary: { distance: 5, duration: 600 }, geometry: '' }] }),
      })

      await provider.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 }, { profile: 'cycling' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cycling-regular'),
        expect.anything()
      )
    })
  })

  describe('optimize', () => {
    it('calls ORS optimization endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ distance: 25000, duration: 1800, steps: [
            { type: 'start' },
            { type: 'job', id: 2, distance: 10000, duration: 600 },
            { type: 'job', id: 1, distance: 15000, duration: 900 },
            { type: 'end' },
          ] }],
        }),
      })

      const result = await provider.optimize(
        { lat: 34, lng: -118 },
        [{ lat: 35, lng: -119 }, { lat: 36, lng: -120 }]
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openrouteservice.org/v2/optimization',
        expect.anything()
      )
      expect(result.sequence).toEqual([1, 0]) // job id 2 first (index 1), then job id 1 (index 0)
      expect(result.provider).toBe('ors')
    })
  })

  describe('matrix', () => {
    it('calls ORS matrix endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[600, 900], [1200, 300]],
          distances: [[10, 15], [20, 5]],
        }),
      })

      const result = await provider.matrix(
        [{ lat: 34, lng: -118 }, { lat: 35, lng: -119 }],
        [{ lat: 36, lng: -120 }, { lat: 37, lng: -121 }]
      )

      expect(result.durations[0][0]).toBe(10) // 600s = 10min
      expect(result.distances[0][0]).toBe(10)
      expect(result.provider).toBe('ors')
    })
  })
})
