import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Geocoder, createDebouncedGeocoder } from '../index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Geocoder', () => {
  beforeEach(() => { mockFetch.mockReset() })

  describe('Nominatim forward', () => {
    it('returns geocoding results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { lat: '34.05', lon: '-118.24', display_name: '123 Main St, Los Angeles, CA', address: { city: 'Los Angeles', state: 'California', country: 'United States' } },
        ],
      })

      const geo = new Geocoder({ provider: 'nominatim' })
      const results = await geo.forward('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('nominatim.openstreetmap.org/search'), expect.anything())
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(34.05)
      expect(results[0].lng).toBe(-118.24)
      expect(results[0].city).toBe('Los Angeles')
    })

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const geo = new Geocoder()
      const results = await geo.forward('invalid')
      expect(results).toEqual([])
    })
  })

  describe('Photon forward', () => {
    it('returns geocoding results from Photon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            { geometry: { coordinates: [-118.24, 34.05] }, properties: { name: '123 Main St', city: 'Los Angeles', state: 'California', country: 'US' } },
          ],
        }),
      })

      const geo = new Geocoder({ provider: 'photon' })
      const results = await geo.forward('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('photon.komoot.io'))
      expect(results[0].lat).toBe(34.05)
      expect(results[0].lng).toBe(-118.24)
    })
  })

  describe('reverse', () => {
    it('returns address from coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lat: '34.05', lon: '-118.24', display_name: '123 Main St, LA', address: { city: 'Los Angeles', state: 'CA', country: 'US' } }),
      })

      const geo = new Geocoder()
      const result = await geo.reverse({ lat: 34.05, lng: -118.24 })

      expect(result).not.toBeNull()
      expect(result!.displayName).toContain('123 Main St')
    })

    it('returns null on error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const geo = new Geocoder()
      const result = await geo.reverse({ lat: 0, lng: 0 })
      expect(result).toBeNull()
    })
  })

  describe('createDebouncedGeocoder', () => {
    it('returns empty for short queries', async () => {
      const search = createDebouncedGeocoder({ debounceMs: 10, minChars: 3 })
      const results = await search('ab')
      expect(results).toEqual([])
    })

    it('debounces requests', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ lat: '34', lon: '-118', display_name: 'Test', address: {} }],
      })

      const search = createDebouncedGeocoder({ provider: 'nominatim', debounceMs: 100, minChars: 3 })
      const promise = search('test query')

      // Fetch shouldn't be called yet
      expect(mockFetch).not.toHaveBeenCalled()

      vi.advanceTimersByTime(150)
      await promise

      expect(mockFetch).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })
  })
})
