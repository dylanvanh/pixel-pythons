# Validation

## Single TanStack app

Verified locally on 11 September 2026 after combining the apps:

- One root package, one Bun lockfile, and one Cloudflare Worker build.
- `vp check` passed. All 25 application tests and 7 contract tests passed.
- `vp run local:test` passed: local mint, receipt, owner, count, metadata, artwork, and invalid inputs.
- The actual Cloudflare development runtime rendered Bitcoin PNGs with the same decoded pixel hash as the original native renderer.
- Commit and reveal generated identical PNG bytes, inscription scripts, Taproot outputs, and control blocks in the Worker runtime. A unit test keeps this check.
- The built Worker returned 200 for all four pages, artwork, metadata, robots, and sitemap; 400 for invalid Bitcoin API requests; and 404 for missing routes.
- The production browser passed Bitcoin wallet selection, both collection routes, and chain switching. The Robinhood stylesheet was restored after leaving Bitcoin. No broken images or horizontal overflow were found.
- A Wrangler dry run passed without deploying. No Bitcoin secret names were found in the client bundle.
- The existing Bitcoin Supabase host remains unavailable. The pages show this error. No complete public Bitcoin mint was tested.
- The temporary runtime check route was removed. Nothing was deployed or pushed.

## Earlier standalone Robinhood checks

The following checks apply to the app before the single-app conversion.

Validation uses local Anvil test funds and read-only Sepolia forks. No app or contract was deployed publicly.

Verified on 11 September 2026:

- `vp install --frozen-lockfile`: passed without dependency changes.
- `vp check`: passed with no warnings, lint errors, or type errors.
- `vp test run`: 14 tests passed after the artwork update. `forge test`: 7 tests passed during contract validation.
- `forge fmt --check`, `vp build`, and the Wrangler deployment dry run: passed.
- Two local mint transactions passed the complete check. Both tokens appeared in the mint page and collection.
- `vp run local:test`: passed twice. Each run started an isolated Anvil and app, deployed the contract, minted a Python, checked the pages and APIs, and removed its temporary servers. The normal chain on port 8545 and app on port 3002 stayed running.
- `vp run sepolia:check`: verified Ethereum Sepolia, chain ID 11155111.
- `vp run sepolia:test`: all 7 contract tests passed on a fork at block 11680802. Balance assertions include ETH that existed at the contract address before deployment.
- `vp run sepolia:simulate`: passed at block 11680804. Foundry reported `SIMULATION COMPLETE`; the transaction output is only in the ignored `broadcast/.../dry-run/` directory. No transaction was broadcast.
- The built Worker returned 200 for both pages, metadata, and artwork; 400 for invalid IDs; and 404 for an unknown page.
- The final production preview showed Robinhood Testnet and artwork previews. It did not load the local development or Sepolia settings.
- Browser layouts passed at 390px and 1280px, without horizontal overflow or broken images. The production browser check had no console errors.
- The Sepolia browser check showed Ethereum Sepolia on the mint and collection pages, with no broken images, horizontal overflow, or console errors.

- Vite+ runs application formatting, lint, type checks, tests, and the production build.
- Foundry runs the contract checks.
- Forge, Anvil, and Cast version 1.8.0 and Solidity 0.8.30 were used.
- `vp run local:check` submits a local mint and verifies the receipt, owner, updated count, metadata, artwork, and input rejection.
- Browser checks cover artwork changes, collection navigation, empty and minted states, wallet help, Escape dismissal, focus return, and mobile layout.
- The production Worker preview is checked separately from the development server.

Browser signing with a real wallet extension remains a manual check. The in-app browser has no wallet extension. Local mint transactions are submitted through Anvil's unlocked test account.

## Artwork version 2

- All 52 original PNGs match the Bitcoin source byte for byte. The new teal and lavender body alpha masks match the original body exactly.
- All 68 PNGs pass dimension, checksum, and scanline checks. The 16 new traits also passed transparency checks during asset creation.
- A deterministic 4,096-token sample reaches all 68 traits and meets the clothing and arm frequency checks. The hash rejection branch and a fixed version-2 recipe are covered by tests.
- `vp check` passed with no warnings or errors. `vp build` and the isolated local mint test passed.
- The production browser loaded versioned artwork URLs, changed the preview on button press, and displayed the new feather cap without broken images, horizontal overflow, or console errors.

## Browser Control tool follow-up

Browser Control v0.4.0 returned `Browser Control extension is not connected` before creating a browser session. Reproduce with `browser-control execute 'return page.title()'`. The expected result is a page title; the observed result is the connection error. No browser session was changed. The Codex in-app browser was used for validation. Connect the extension before using Browser Control for later wallet tests.
