# @mapflux/provider-osrm

OSRM (Open Source Routing Machine) provider for MapFlux. Self-hosted, unlimited requests.

## Install

```bash
npm install @mapflux/core @mapflux/provider-osrm
```

## Usage

```ts
import { MapFlux } from '@mapflux/core'
import { OSRMProvider } from '@mapflux/provider-osrm'

const flux = new MapFlux({
  providers: [
    new OSRMProvider({
      baseUrl: 'http://localhost:5000', // your OSRM instance
    }),
  ],
})
```

## Self-Hosting OSRM

```bash
# Download OSM data
wget https://download.geofabrik.de/north-america/us-latest.osm.pbf

# Run with Docker
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/us-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/us-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/us-latest.osrm
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/us-latest.osrm
```

## Supported Operations

| Operation | OSRM Endpoint | MapFlux Method |
|-----------|--------------|----------------|
| Route | `/route/v1/driving/{coords}` | `flux.route()` |
| Table | `/table/v1/driving/{coords}` | `flux.matrix()` |
| Trip | `/trip/v1/driving/{coords}` | `flux.optimize()` |

## Why OSRM?

- **Free** — no API key, no rate limits
- **Fast** — sub-millisecond responses when self-hosted
- **Private** — your data never leaves your infrastructure
- **Unlimited** — no daily quotas

## License

MIT
