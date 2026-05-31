export interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
  city?: string
  state?: string
  country?: string
}

export interface GeocoderConfig {
  provider?: 'nominatim' | 'photon'
  baseUrl?: string
  countryCode?: string
  limit?: number
}

export class Geocoder {
  private provider: string
  private baseUrl: string
  private countryCode?: string
  private limit: number

  constructor(config: GeocoderConfig = {}) {
    this.provider = config.provider ?? 'nominatim'
    this.baseUrl = config.baseUrl ?? (this.provider === 'photon' ? 'https://photon.komoot.io' : 'https://nominatim.openstreetmap.org')
    this.countryCode = config.countryCode
    this.limit = config.limit ?? 5
  }

  async forward(query: string): Promise<GeocodingResult[]> {
    if (this.provider === 'photon') return this.photonForward(query)
    return this.nominatimForward(query)
  }

  async reverse(point: { lat: number; lng: number }): Promise<GeocodingResult | null> {
    const url = `${this.baseUrl}/reverse?format=json&lat=${point.lat}&lon=${point.lng}`
    const res = await fetch(url, { headers: { 'User-Agent': 'MapFlux/0.1' } })
    if (!res.ok) return null
    const data = await res.json() as any
    if (!data || data.error) return null
    return { lat: parseFloat(data.lat), lng: parseFloat(data.lon), displayName: data.display_name, city: data.address?.city, state: data.address?.state, country: data.address?.country }
  }

  private async nominatimForward(query: string): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({ q: query, format: 'json', limit: String(this.limit), addressdetails: '1' })
    if (this.countryCode) params.set('countrycodes', this.countryCode)
    const res = await fetch(`${this.baseUrl}/search?${params}`, { headers: { 'User-Agent': 'MapFlux/0.1' } })
    if (!res.ok) return []
    const data = await res.json() as any[]
    return data.map((r) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), displayName: r.display_name, city: r.address?.city ?? r.address?.town, state: r.address?.state, country: r.address?.country }))
  }

  private async photonForward(query: string): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(this.limit), lang: 'en' })
    if (this.countryCode) params.set('countrycode', this.countryCode)
    const res = await fetch(`${this.baseUrl}/api/?${params}`)
    if (!res.ok) return []
    const data = await res.json() as any
    return (data.features ?? []).map((f: any) => {
      const p = f.properties
      const [lng, lat] = f.geometry.coordinates
      return { lat, lng, displayName: [p.name, p.city, p.state, p.postcode].filter(Boolean).join(', '), city: p.city, state: p.state, country: p.country }
    })
  }
}

/** Debounced geocoder for typeahead inputs */
export function createDebouncedGeocoder(config: GeocoderConfig & { debounceMs?: number; minChars?: number } = {}) {
  const geo = new Geocoder(config)
  const debounceMs = config.debounceMs ?? 300
  const minChars = config.minChars ?? 3
  let timer: any = null

  return (query: string): Promise<GeocodingResult[]> => {
    return new Promise((resolve) => {
      if (timer) clearTimeout(timer)
      if (query.length < minChars) { resolve([]); return }
      timer = setTimeout(async () => { resolve(await geo.forward(query)) }, debounceMs)
    })
  }
}
