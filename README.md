# Pixel Pythons - Bitcoin Ordinals Minting Platform

A Bitcoin Ordinals minting platform that generates unique pixel art Ordinals on-chain. Implements proper [provenance](https://docs.ordinals.com/inscriptions/provenance.html) via parent inscriptions for collection integrity, handling the full process from image generation to transaction broadcasting using PSBTs.

## Features

- Generate Bitcoin Ordinals with dynamic pixel art and trait systems
- Full Bitcoin transaction handling with PSBT construction
- Multi-wallet support via LaserEyes
- Live UTXO management and mempool integration
- TypeScript with Zod validation

## Bitcoin Ordinals Implementation

The minting process follows Bitcoin's two-phase inscription protocol:

### Commit Transaction

- Constructs PSBT with user's payment UTXOs
- Creates taproot output containing the inscription data
- Handles fee estimation and change outputs
- Validates sufficient funds before transaction creation

### Reveal Transaction

- Spends the commit transaction output
- Reveals the inscription data on-chain via witness script
- Uses taproot scripting to minimize transaction size
- Broadcasts the final inscription to Bitcoin network

### Provenance Integration

- Oracle wallet signs parent inscription reference
- Establishes collection hierarchy per [Ordinals provenance spec](https://docs.ordinals.com/inscriptions/provenance.html)
- Links child inscriptions to parent for collection integrity
- Validates parent inscription exists before minting

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Blockchain**: Bitcoin
- **Database**: Supabase Postgres
- **Styling**: Tailwind CSS 4 with custom components
- **Testing**: Vitest with comprehensive mocking
- **State Management**: Zustand for efficient client state

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Bitcoin web wallet
- Supabase account
- Ordiscan API access

### Installation

1. Clone the repository:

```bash
git clone https://github.com/dylanvanh/pixel-pythons.git
cd pixel-pythons
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Fill in your environment variables:

- `MEMPOOL_URL`: Bitcoin mempool API endpoint
- `ORDISCAN_URL` & `ORDISCAN_API_KEY`: Ordiscan API credentials
- `ORACLE_*`: Bitcoin wallet configuration for transaction signing
- `SUPABASE_*`: Database connection details
- `NEXT_PUBLIC_*`: Client-side configuration

### Development

Start the development server:

```bash
pnpm dev
```

The app runs on [http://localhost:3001](http://localhost:3001).

### Testing

Run the test suite:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

### Production Build

```bash
pnpm build
pnpm start
```

## Architecture

### Core Components

- **`/src/lib/bitcoin/`** - Bitcoin transaction handling, UTXO management, and inscription creation
- **`/src/lib/error/`** - Comprehensive error handling with custom error types
- **`/src/lib/image-gen/`** - Server-side image generation with trait algorithms
- **`/src/components/`** - Reusable React components and UI elements
- **`/src/app/`** - Next.js App Router pages and API endpoints

### Key Features

**Bitcoin Integration**:

- PSBT (Partially Signed Bitcoin Transaction) construction
- Multi-signature transaction support
- UTXO management with inscription/rune filtering
- Network fee estimation and optimization

**Ordinal Generation**:

- Trait-based pixel art generation
- Rarity algorithm implementation
- Server-side canvas rendering for consistency
- Metadata generation and storage

## API Endpoints

- `POST /api/prepare-commit` - Prepare Bitcoin commit transaction
- `POST /api/prepare-reveal` - Prepare inscription reveal transaction
- `POST /api/broadcast-reveal` - Broadcast reveal transaction to network
- `GET /api/mint-index` - Get current mint progress

## Environment Variables

See `.env.example` for all required configuration. Key variables:

- **Bitcoin Network**: Mempool API and Ordiscan integration
- **Wallet Configuration**: Oracle wallet for transaction signing
- **Database**: Supabase connection and authentication
- **App Configuration**: Base URLs and inscription parameters

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Wallet integration via [LaserEyes](https://github.com/omnisat/lasereyes)
