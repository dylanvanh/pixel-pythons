# One app, two chains

`dylanvanh/pixel-pythons` is the canonical repository. One TanStack Start app builds into one Cloudflare Worker. There is no gateway, Next.js app, Node origin, or workspace package layer.

- `src/routes`: Robinhood pages at `/` and `/collection`; Bitcoin pages at `/bitcoin` and `/bitcoin/collection`; both chains' HTTP routes.
- `src/lib` and `src/components`: Robinhood collection and mint logic, plus the shared chain menu.
- `src/features/bitcoin`: Bitcoin wallet UI, inscription code, collection loaders, and server handlers.
- `src/features/bitcoin/server`: private environment reads, database reads, and commit/reveal handlers. Route loaders call server functions; they do not import secrets into browser code.
- `public/sneks`: all 68 PNGs. Bitcoin uses the fixed 52-trait manifest in its image generator. Robinhood keeps its version 2 selector.
- `contracts` and `scripts`: the ERC-721 contract and local/testnet checks.

The root document selects the chain stylesheet. The chain menu uses TanStack links. Bitcoin wallet code loads only on its mint page, after hydration. Both collection pages can render their database status on the server.

Bitcoin PNG generation uses `pngjs` and bundled PNG layers. It needs no native module or filesystem. Current artwork has only transparent or opaque pixels. The renderer rejects partial transparency instead of silently changing it. Tests compare decoded pixels with the original native renderer.

The PNG compression bytes differ from the old native encoder. New Bitcoin sessions start with `png2_`, and reveal requests require that version. This prevents an old commit from silently using a different inscription script. Before any production cutover, finish outstanding old commits using the old app. Existing on-chain inscriptions are unchanged.

Bitcoin service credentials are Worker bindings supplied through `.dev.vars` locally and secrets in production. They are checked only when Bitcoin services are called. Missing Bitcoin settings do not prevent Robinhood previews or the production build. An unavailable Bitcoin database is shown as an error, not an empty collection.

Bun manages one lockfile. Vite+ supplies build, tests, lint, and formatting. Cloudflare's Vite plugin runs the same Worker runtime locally. No app or contract deployment is part of this change.
