# MapFlux + Expo (React Native) Example

A working example showing MapFlux routing and map rendering in an Expo app.

## Setup

```bash
cd examples/expo-app
pnpm install
cp .env.example .env  # add your ORS API key
npx expo start
```

## .env

```
ORS_API_KEY=your-openrouteservice-api-key
```

## What it demonstrates

- MapFlux provider setup with ORS
- Route calculation and polyline rendering on native maps
- Numbered pins for route stops
- Callout popups on marker tap
- Works on both iOS and Android
