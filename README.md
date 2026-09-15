# Pixel Pythons

One TanStack Start app for Robinhood and Bitcoin, in the original Bitcoin repository.

## Run locally

Use Bun 1.3.14, Vite+, and Node.js 22 or later.

```sh
vp install
vp run dev
```

Open <http://localhost:3010>. Robinhood is the default view. Use the chain menu to open Bitcoin at `/bitcoin`.

| Path                            | Purpose                  |
| ------------------------------- | ------------------------ |
| `/`                             | Robinhood mint           |
| `/collection`                   | Robinhood collection     |
| `/api/art/1?v=2`                | Robinhood artwork        |
| `/api/metadata/1`               | Robinhood metadata       |
| `/bitcoin`                      | Bitcoin mint             |
| `/bitcoin/collection`           | Bitcoin collection       |
| `/bitcoin/api/prepare-commit`   | Bitcoin commit PSBT      |
| `/bitcoin/api/prepare-reveal`   | Bitcoin reveal PSBT      |
| `/bitcoin/api/broadcast-reveal` | Bitcoin reveal broadcast |

For Bitcoin, copy `.dev.vars.example` to `.dev.vars` and fill in its existing service and oracle settings. Do not overwrite an existing file. The migration retained the local Bitcoin settings in `.dev.vars`. Keep private values out of `VITE_*` variables.

Robinhood uses optional `.env.development.local` settings. Without a contract address it shows previews and keeps minting unavailable. See `.env.example` and `.env.sepolia.example`. The default network is Robinhood Testnet.

## Checks and production preview

```sh
vp check
vp test run
vp build
vp run preview
```

Stop the development server before starting the preview; both use port 3010. One build produces one Cloudflare Worker in `dist/server` and its static assets in `dist/client`. There is no gateway or separate Bitcoin server.

## Local ERC-721 testing

Install Foundry, then run:

```sh
vp run local:test
vp run test:contracts
vp run check:contracts
```

The isolated mint test starts Anvil on port 8546 and the app on 3005. It deploys the contract, mints one Python, checks ownership, metadata and artwork, then stops its processes. It sends no public transaction.

To keep a local chain running, use `vp run local:chain`, then `vp run local:setup` in another terminal. Sepolia checks remain available as `vp run sepolia:check`, `vp run sepolia:test`, and `vp run sepolia:simulate`. They do not broadcast.

## Bitcoin migration notes

The original 52 traits and pixel output remain fixed. The Worker uses a portable PNG encoder, so PNG compression bytes differ. New commit sessions use the `png2_` prefix. Finish any outstanding old commits with the previous app before a production cutover. Existing on-chain inscriptions are unchanged.

The existing Bitcoin Supabase hostname does not resolve. Collection pages show an error until its service or settings are restored. A live Bitcoin mint has not been tested.

Nothing has been deployed. See [architecture](ARCHITECTURE.md), [project terms](CONTEXT.md), and [artwork](docs/artwork.md).
