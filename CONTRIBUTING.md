# Contributing to MapFlux

Thank you for considering contributing! This document explains how to get started.

## Branch Strategy

```
main (production — published to npm)
  ↑ PR (maintainers only)
develop (integration — all contributions land here)
  ↑ PR (from your fork)
your-fork/feature/my-feature
```

- **`main`** — stable, published releases only. Never push directly.
- **`develop`** — integration branch. All contributions go here.
- Contributors **fork the repo**, branch from `develop`, and open PRs back to `develop`.
- Maintainers merge `develop` → `main` for releases.

## How to Contribute

### 1. Fork the repo

Fork from GitHub, then clone:

```bash
git clone https://github.com/Dev-folabi/mapflux.git
cd mapflux
git checkout develop
```

### 2. Create a feature branch

Branch from `develop` with the `feature/` prefix:

```bash
git checkout -b feature/my-feature
```

### 3. Set up development

```bash
pnpm install
pnpm build
pnpm test
```

### 4. Make your changes

- Write code
- Add tests
- Run `pnpm test` to verify

### 5. Submit a PR

Push your branch and open a PR **targeting `develop`**:

```bash
git push origin feature/my-feature
```

Then open a PR: `your-fork:feature/my-feature` → `mapflux:develop`

---

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode (single package)
cd packages/core && pnpm test:watch

# Build a single package
cd packages/core && pnpm build
```

## Project Structure

```
packages/
├── core/           # Core logic — caching, providers, events
├── provider-ors/   # OpenRouteService adapter
├── provider-osrm/  # OSRM adapter
├── geocoder/       # Geocoding abstraction
├── react/          # React hooks + Leaflet components
└── react-native/   # React Native hooks + react-native-maps
examples/
├── nextjs-app/     # Next.js example
└── expo-app/       # Expo (React Native) example
```

## Guidelines

### Code Style

- TypeScript strict mode
- No `any` types (use `unknown` + type guards where needed)
- Export interfaces for all public APIs
- JSDoc comments on all exported functions

### Commits

Use conventional commits:

```
feat(core): add circuit breaker logic
fix(provider-ors): handle 429 rate limit response
docs: update README with React Native example
test(core): add deduplication edge case tests
```

### Pull Request Checklist

- [ ] Branch created from `develop` with `feature/` prefix
- [ ] PR targets `develop` (not `main`)
- [ ] Tests added for new functionality
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Docs updated if public API changed
- [ ] Commit messages follow conventional format

### Adding a New Provider

1. Create `packages/provider-{name}/`
2. Implement the `RoutingProvider` interface from `@mapflux/core`
3. Add tests with mocked HTTP responses (never hit real APIs in tests)
4. Add README with setup instructions
5. Add to root README provider list

### Testing

- Unit tests: `vitest`
- Mock all HTTP calls — no real API calls in tests
- Test: success paths, error handling, cache behavior, failover
- Aim for >90% coverage on core package

---

## CI/CD

CI runs on every push and PR to both `develop` and `main`:

- Builds all packages
- Runs all tests
- Tests against Node 18, 20, and 22
- Publishes to npm only from `main` (after develop → main merge)

---

## Code of Conduct

Be respectful. Be constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
