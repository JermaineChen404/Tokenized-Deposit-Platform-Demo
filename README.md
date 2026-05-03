# Tokenized Deposit Platform

Regulated tokenized deposits on-chain — built with Hardhat + Next.js.

## Quick Start

```bash
npm install
cd frontend && npm install && cd ..
npm run dev
```

One command starts everything: local chain → deploy contracts → sync ABI → bootstrap test data → frontend dev server → auto-open `http://localhost:3000`.

`Ctrl+C` stops all processes cleanly.

## Prerequisites

- **Node.js** ≥ 18
- **MetaMask** browser extension with Hardhat network added:
  - Network Name: `Hardhat Localhost`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency: `ETH`

## Project Structure

```
├── contracts/           # Solidity contracts (single-file: Project.sol)
├── scripts/
│   ├── deploy.js        # Deploy contracts to localhost
│   ├── bootstrap-local.js # Whitelist accounts, add bank, issue test balances
│   └── start-dev.js     # All-in-one dev launcher
├── test/
│   └── Project.js       # Hardhat JS tests
├── frontend/            # Next.js 16 app
│   └── src/
│       ├── constants/   # ABI and contract addresses
│       ├── providers/   # Wagmi + RainbowKit web3 provider
│       ├── components/  # UI components
│       └── app/         # Page routes
├── extract_abi.js       # Sync compiled ABI → frontend constants
├── hardhat.config.js    # Hardhat configuration
└── package.json         # Root scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | **Start everything** (chain + deploy + frontend) |
| `npm run setup:local` | Deploy + ABI sync + bootstrap (requires running node) |
| `npm run deploy:local` | Deploy contracts only |
| `npm run sync:abi` | Extract ABI from artifacts to frontend constants |
| `npm run bootstrap:local` | Whitelist accounts & issue test balances |
| `npx hardhat compile` | Compile contracts |
| `npx hardhat test` | Run JavaScript tests |

## Smart Contract

The `TokenizedDeposit` contract (TDHK token) implements:

- **ERC20** token with AccessControl roles
- **Bank onboarding** with validator shares
- **Deposit issuance / redemption** with KYC whitelist gating
- **Interest accrual** with tiered fee margins
- **Pull-payment dividend system** for fee distribution
- **Quarterly share reevaluation** based on fee generation
- **Compliance**, **InterestManager**, **CrossChainBridge**, **Governance** modules

## Frontend

- **Next.js 16** with webpack (Turbopack disabled for stability)
- **RainbowKit + wagmi** for wallet connection
- **Tailwind CSS v4** for styling
- **Hardhat Localhost** (chain 31337) only

## Wallet Connection

1. Run `npm run dev` from project root
2. Open `http://localhost:3000`
3. Click **Connect Wallet**
4. Select **Browser Wallet** (MetaMask)
5. Approve the connection in MetaMask
