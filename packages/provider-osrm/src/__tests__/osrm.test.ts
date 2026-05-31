import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OSRMProvider } from '../index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('OSRMProvider', () => {
  let provider: OSRMProvider

  beforeEach(() => {
    provider = new OSRMProvider({ baseUrl: 'http://localhost:5000' })
    mockFetch.mockReset()
  })

  describe('route', () => {
    it('calls OSRM route endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ distance: 16093.4, duration: 900, geometry: 'mfp_I~ps|U' }],
        }),
      })

      const result = await provider.route({ lat: 34.05, lng: -118.24 }, { lat: 34.01, lng: -118.49 })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/route/v1/driving/'))
      expect(result.distance).toBe(10) // 16093.4m / 1609.34 = ~10mi
      expect(result.duration).toBe(15) // 900s = 15min
      expect(result.provider).toBe('osrm')
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(provider.route({ lat: 34, lng: -118 }, { lat: 35, lng: -119 })).rejects.toThrow('OSRM error: 500')
    })
  })

  describe('optimize (trip)', () => {
    it('calls OSRM trip endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trips: [{ distance: 32000, duration: 2400, legs: [
            { distance: 16000, duration: 1200, geometry: '' },
            { distance: 16000, duration: 1200, geometry: '' },
          ] }],
          waypoints: [
            { waypoint_index: 0 },
            { waypoint_index: 2 },
            { waypoint_index: 1 },
          ],
        }),
      })

      const result = await provider.optimize(
        { lat: 34, lng: -118 },
        [{ lat: 35, lng: -119 }, { lat: 36, lng: -120 }]
      )

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/trip/v1/driving/'))
      expect(result.totalDuration).toBe(40) // 2400s = 40min
      expect(result.legs).toHaveLength(2)
      expect(result.provider).toBe('osrm')
    })
  })

  describe('matrix (table)', () => {
    it('calls OSRM table endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[600, 1200]],
          distances: [[16093, 32186]],
        }),
      })

      const result = await provider.matrix(
        [{ lat: 34, lng: -118 }],
        [{ lat: 35, lng: -119 }, { lat: 36, lng: -120 }]
      )

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/table/v1/driving/'))
      expect(result.durations[0][0]).toBe(10) // 600s = 10min
      expect(result.distances[0][0]).toBe(10) // 16093m / 1609.34 = ~10mi
    })
  })
})
