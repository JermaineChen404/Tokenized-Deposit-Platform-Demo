## Tokenized Deposit Frontend

This frontend connects to locally deployed contracts on Hardhat `localhost` (`31337`).

## Quick Start (one command)

From the project root (one level above this `frontend` folder):

```bash
npm run dev
```

This single command:

1. Starts the Hardhat local chain (`localhost:8545`)
2. Deploys all contracts via `setup:local`
3. Syncs the ABI to `frontend/src/constants/abi.ts`
4. Bootstraps test data (compliance roles, whitelist, bank, starter TDHK balances)
5. Starts the frontend dev server
6. Automatically opens [http://localhost:3000](http://localhost:3000)

`Ctrl+C` stops everything cleanly.

## Individual Commands

From project root:

```bash
npm run setup:local   # deploy + ABI sync + bootstrap (requires running node)
npm run deploy:local  # deploy only
npm run sync:abi      # extract ABI from artifacts
npm run bootstrap:local # whitelist accounts & issue test balances
```

From this `frontend` directory:

```bash
npm run dev           # start frontend only (requires running node + deployed contracts)
```

## Connect Wallet

- Network: Hardhat Localhost (`31337`)
- RPC URL: `http://127.0.0.1:8545`
- Use account #0 private key from the Hardhat node output

## Useful Root Commands

```bash
npm run dev             # start everything (chain + deploy + frontend)
npx hardhat compile     # compile contracts
npx hardhat test        # run JavaScript tests
forge build             # compile via Foundry (if installed)
forge test              # run Solidity tests (if installed)
```
