# Pixel Pythons

This is one TanStack Start app in the original Bitcoin repository. Robinhood is the default at `/`. Bitcoin uses `/bitcoin`.

- **Python**: pixel artwork belonging to a chain-specific collection.
- **Trait**: one 24 × 24 PNG layer in `public/sneks`.
- **Bitcoin inscription**: PNG artwork inscribed through the Bitcoin commit and reveal flow. Its catalog contains the original 52 traits.
- **Robinhood Python**: an ERC-721 token. Its catalog contains 68 traits. Its public, deterministic version 2 formula uses the token ID.
- **Preview**: sample art, not proof of minting or ownership.
- **Mint**: a confirmed chain transaction that creates a Python.
- **Local chain**: Anvil, chain ID 31337, for local tests only.
- **Sepolia**: Ethereum Sepolia, separate from Robinhood Testnet.

Both chains share one document, router, deployment, and artwork directory. Their wallets, transactions, collection data, and selection rules stay separate. The collections are not interchangeable. Freeze the Robinhood catalog and formula before public minting. The ERC-721 contract is for testing until launch settings have been selected.
