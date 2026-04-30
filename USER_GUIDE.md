# Tokenized Deposit Platform — User Guide

> **Audience:** First‑time users (Administrators, Banks, and Retail Users)  
> **Environment:** Local Hardhat network (Chain ID `31337`) running at `http://127.0.0.1:8545`  
> **Dashboard URL:** `http://localhost:3000`

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Dashboard](#understanding-the-dashboard)
3. [Guide for Administrators](#guide-for-administrators)
4. [Guide for Banks](#guide-for-banks)
5. [Guide for Retail Users](#guide-for-retail-users)
6. [Glossary](#glossary)

---

## Getting Started

### Prerequisites

- **MetaMask** browser extension installed
- The platform has been started by your team (if running locally, use `npm run dev`)
- You have a wallet address and its corresponding private key

### Initial Platform State

When the platform first starts, **everything is empty** — no banks, no users, no tokens in circulation. Only the Admin account has been granted the necessary permissions to set things up:

| Account | Roles | TDHK Balance |
|---|---|---|
| Admin (`0xf39F…2266`) | `DEFAULT_ADMIN_ROLE`, `COMPLIANCE_ROLE`, `BANK_ROLE` | 0 |
| Everyone else | None | 0 |

The Admin must use the frontend to **add banks**, **whitelist users**, and **issue deposits** before anyone else can interact with the platform.

### Connecting Your Wallet

1. Open `http://localhost:3000` in your browser
2. Click the **Connect Wallet** button in the top‑right corner
3. In the RainbowKit popup, choose **MetaMask** (or your browser wallet)
4. If prompted to add a network, enter:
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
5. Select the account you want to use

You will see three stat cards appear with your balances (initially all zero) and connection status.

### The Navigation Tabs

After connecting, you will see a row of tabs below the Account Snapshot:

| Tab | Who Uses It | Purpose |
|---|---|---|
| **Dashboard** | Everyone | View balances, stake tokens, transfer tokens |
| **Banking** | Admin, Banks | Issue deposits, redeem deposits, accrue interest, claim fees |
| **Compliance** | Admin only | Manage KYC whitelist, check KYC status |
| **Administration** | Admin only | Add banks, update interest rates, reevaluate shares |
| **Governance** | Admin, Banks | Create and vote on proposals, register validators |
| **Validators** | Everyone (read‑only) | View all registered banks and their statistics |
| **Bridge** | Admin only | Initiate cross‑chain transfers |

> **Note:** If a tab is empty or shows errors, your account may not have the required role. See the "Guide for your role" section below.

---

## Understanding the Dashboard

### What You See on Every Page

At the top of every page:

**Header Banner**
Shows the platform name, your wallet address, and the Connect/Disconnect button.

**Network Warning** (amber banner)
Appears if your wallet is on a network other than Hardhat Localhost (Chain ID 31337). Click "Switch Network" to change.

**KYC Warning** (red banner)
Appears if your address is not in the KYC whitelist. You need an Administrator to whitelist you before most actions work.

**Stat Cards**
Three cards showing:
- **Token Balance** — how many TDHK tokens you hold
- **Staked Balance** — how many TDHK tokens you have locked in staking
- **Session Status** — whether your wallet is connected

**Account Snapshot**
A table showing your wallet address, current network, and the addresses of the deployed contracts.

### How Transactions Work

1. Navigate to the appropriate tab
2. Fill in the required fields (addresses, amounts, etc.)
3. Click the action button (e.g., "Stake Deposit", "Issue Deposit")
4. MetaMask will prompt you to confirm the transaction — review the gas fee and click **Confirm**
5. Wait a few seconds for the transaction to be mined
6. A green toast notification confirms success, or a red one explains the error

**Tips:**
- All token amounts are entered in TDHK (e.g., `100` means 100 TDHK, not 100 wei)
- All addresses must be valid 42‑character hex addresses starting with `0x`
- If a button is greyed out, you may be on the wrong network or your wallet is not connected

---

## Guide for Administrators

> **Your Account:** Account 1 (`0xf39Fd6e5…`)  
> **Your Roles:** `DEFAULT_ADMIN_ROLE`, `COMPLIANCE_ROLE`, `BANK_ROLE`  
> **Your Balance:** 0 TDHK initially

As an Administrator, you manage the entire platform: you whitelist users, issue and redeem deposits, add banks, update system parameters, execute governance decisions, and oversee cross‑chain operations.

---

### First‑Time Setup — One‑Time Only

When the platform starts fresh, no banks, users, or tokens exist. Follow this sequence **in order** to bootstrap the system:

#### Step 1: Add Banks

Banks are validators that earn fees. Add at least one bank so there is a fee distribution pool.

1. Click the **Administration** tab
2. Under "Add Bank":
   - Enter the bank's wallet address (e.g., Account 2: `0x7099…79C8`)
   - Enter a contribution (e.g., `3000000` for a founder bank, or `1000000` for a non‑founder)
   - Check "Founder bank" for the first bank
3. Click **Add Bank**
4. Repeat for additional banks (uncheck "Founder bank" for subsequent ones)

> **Tip:** Founders use fixed share formulas. Non‑founders require `totalSupply > 0`, so add founders first or issue a deposit before adding non‑founders.

#### Step 2: Whitelist Users

Users cannot interact with the platform unless they are KYC‑whitelisted.

1. Click the **Compliance** tab
2. Under "Whitelist User", enter each user's address
3. Click **Whitelist User** for each one

Also whitelist the bank addresses so they can receive fees and participate in governance.

#### Step 3: Enter Users into the System

Give each new user their 200 TDHK welcome incentive.

1. Click the **Banking** tab
2. Under "Enter System", enter a user's address
3. Click **Enter System**
4. Repeat for each user

#### Step 4: Issue Deposits

Mint TDHK tokens to users so they have a balance to stake and transfer.

1. Click the **Banking** tab
2. Under "Issue Deposit", enter a user's address and an amount (e.g., `1000`)
3. Click **Issue Deposit**
4. Repeat for each user

After completing these steps, the platform is fully operational. Banks can earn fees, users can stake and transfer, and governance proposals can be created.

---

### Managing Users (Compliance Tab)

#### Whitelisting a New User

Before any user can stake, transfer, or receive tokens, they must be added to the KYC whitelist.

1. Obtain the user's wallet address (a 42‑character hex string starting with `0x`)
2. Click the **Compliance** tab
3. Under "Whitelist User", paste the address into the input field
4. Click **Whitelist User**
5. Confirm the transaction in MetaMask
6. A green toast confirms: "User whitelisted."

#### Checking KYC Status

1. Click the **Compliance** tab
2. Scroll to "KYC Status Lookup"
3. Enter the address you want to check
4. The page will show a status badge:
   - **Green "Whitelisted"** — the user can interact with the platform
   - **Red "Not Whitelisted"** — the user will be blocked from most actions

#### Removing a User from Whitelist

1. Click the **Compliance** tab
2. Under "Remove from Whitelist", enter the user's address
3. Click **Remove from Whitelist**
4. Confirm the transaction
5. The user can no longer interact with the platform

---

### Banking Operations (Banking Tab)

> The Banking tab also allows you to act as a Bank. If you prefer to test using a dedicated Bank account, switch to Account 2.

#### Issuing Deposits (Minting Tokens)

Use this to give TDHK tokens to a whitelisted user.

1. Click the **Banking** tab
2. Under "Issue Deposit":
   - Enter the user's address in "User Address"
   - Enter the amount (in TDHK) in "Amount"
3. Click **Issue Deposit**
4. Confirm in MetaMask
5. The user's balance increases by the specified amount

#### Redeeming Deposits (Burning Tokens)

Use this to remove TDHK tokens from a user's account.

1. Click the **Banking** tab
2. Under "Redeem Deposit":
   - Enter the user's address
   - Enter the amount to redeem
3. Click **Redeem Deposit**
4. The user's balance decreases

#### Onboarding a User (System Entry)

Grants a one‑time 200 TDHK incentive to a new user.

1. Click the **Banking** tab
2. Under "Enter System", enter the user's address
3. Check the badge — it should say "Not yet entered"
4. Click **Enter System**
5. The user receives 200 TDHK. The badge changes to "Already entered"
6. Attempting again for the same user will fail with "Already received incentive"

#### Accruing Interest

Compounds interest for a user based on their balance, the current interest rate, and how long since their last accrual.

1. Click the **Banking** tab
2. Under "Accrue Interest", enter the user's address (or leave empty for yourself)
3. If the user has had interest accrued before, their last accrual time is displayed
4. Click **Accrue Interest**
5. Interest is added to the user's balance. A small protocol fee is taken for the bank pool.
6. You must wait 1 full day between accruals for the same user

#### Claiming Fees

Claims the dividends your bank has earned from protocol fees.

1. Click the **Banking** tab
2. Scroll to "Claim Fees" at the bottom
3. The "Claimable fees" field shows how many TDHK you can claim
4. Click **Claim Fees**
5. Your balance increases by the claimed amount

---

### Managing the System (Administration Tab)

#### Adding a Bank

Banks are validators that earn fees from platform activity and participate in governance.

1. Click the **Administration** tab
2. Under "Add Bank":
   - Enter the bank's wallet address
   - Enter the contribution amount (in TDHK, e.g., `1000000`)
   - Check "Founder bank" if this is a founding institution
3. Click **Add Bank**
4. The bank receives `BANK_ROLE`, is registered as a validator, and receives a governance share proportional to its contribution

#### Viewing and Updating the Interest Rate

The base interest rate determines how much interest users earn. It is measured in basis points (100 bps = 1%).

1. Click the **Administration** tab
2. Scroll to "Interest Rate"
3. The current rate is displayed (e.g., `500 bps (5%)`)
4. To change it, enter a new value (e.g., `600` for 6%) and click **Update Rate**

#### Reevaluating Shares

Every 90 days, bank shares can be redistributed based on how many fees each bank has generated.

1. Click the **Administration** tab
2. Under "Reevaluate Shares", check the eligibility status:
   - "Last reevaluation" shows the date of the last reevaluation
   - "Next eligible" shows when the next one can occur
3. If eligible, click **Reevaluate Shares**
4. All bank shares are recalculated based on their fee generation

---

### Governance (Governance Tab)

The Governance tab has two contracts you can toggle between:
- **Interest Rate** — proposals about the base interest rate
- **Transaction Validation** — proposals about transaction approvals

Each contract has three sub‑tabs: **As Validator**, **As Proxy**, and **Admin**.

#### Executing a Proposal

Once a proposal has been voted on and `votesFor > votesAgainst`, you can execute it.

1. Click the **Governance** tab
2. Select the correct contract toggle (Interest Rate or Transaction Validation)
3. Click the **Admin** sub‑tab
4. Under "Execute Proposal", enter the proposal ID (e.g., `1`)
5. Click **Execute**
6. The proposal is marked as "Executed" in the proposals table

#### Registering a Validator

Validators are entities that can create and vote on governance proposals.

1. Click the **Governance** tab
2. Click the **Admin** sub‑tab
3. Under "Register Validator":
   - Enter the address
   - Enter the share (voting weight, e.g., `1e18` — this means 1 share scaled to 18 decimals)
4. Click **Register**

#### Setting Validator Shares

Adjust an existing validator's voting weight.

1. Click the **Governance** tab → **Admin** sub‑tab
2. Under "Set Validator Share":
   - Enter the validator's address
   - Enter the new share value
3. Click **Set Share**

#### Viewing All Proposals

The proposals table at the bottom of the Governance tab shows all proposals with:
- **ID** — proposal number
- **Rate / TX Hash** — the proposed value
- **For / Against / Declined** — vote counts
- **Status** — Pending, Approved, Declined, or Executed

---

### Bridge Operations (Bridge Tab)

Initiate a token transfer to another blockchain (emits a `BridgeInitiated` event).

1. Click the **Bridge** tab
2. Enter the user's address, the amount (in TDHK), and the target chain name (e.g., `Ethereum`)
3. Click **Initiate Bridge**
4. The bridge event is emitted on‑chain

---

## Guide for Banks

> **Prerequisite:** An Administrator must add your address as a Bank via the **Administration** tab before you can use these features.  
> **Your Balance:** 0 TDHK initially (you earn TDHK through fees and claiming)

As a Bank, you manage deposits for users, accrue interest for them, claim the fees you generate, and participate in governance through proposals and voting.

---

### Banking (Banking Tab)

#### Issuing Deposits to Users

When a customer deposits money with your bank, issue them TDHK tokens:

1. Click the **Banking** tab
2. Under "Issue Deposit", enter the customer's address and the amount (in TDHK)
3. Click **Issue Deposit**
4. Confirm in MetaMask
5. The customer's token balance increases

#### Redeeming Deposits

When a customer withdraws, burn their TDHK tokens:

1. Click the **Banking** tab
2. Under "Redeem Deposit", enter the customer's address and the amount
3. Click **Redeem Deposit**
4. The customer's token balance decreases

#### Onboarding a New Customer

Give a first‑time customer their 200 TDHK welcome incentive:

1. Click the **Banking** tab
2. Under "Enter System", enter the customer's address
3. Verify the badge says "Not yet entered"
4. Click **Enter System**
5. The customer receives 200 TDHK

#### Accruing Interest for Customers

Compound the interest a customer has earned:

1. Click the **Banking** tab
2. Under "Accrue Interest", enter the customer's address
3. Click **Accrue Interest**
4. Interest is calculated based on their balance, the current rate, and time elapsed
5. You earn a protocol fee for performing this action

#### Claiming Your Earned Fees

As a bank, you accumulate fees from user transfers and interest accruals. Claim them to your wallet:

1. Click the **Banking** tab
2. Scroll to "Claim Fees"
3. Observe your claimable amount
4. Click **Claim Fees**
5. Your token balance increases by the claimed amount

---

### Governance (Governance Tab)

#### Creating a Proposal

As a bank validator, you can propose changes to the interest rate or validate transactions.

1. Click the **Governance** tab
2. Toggle between "Interest Rate" or "Transaction Validation"
3. Stay on the **As Validator** sub‑tab
4. Enter the proposal value:
   - For Interest Rate: a number in basis points (e.g., `700` for 7%)
   - For Transaction Validation: a transaction hash string
5. Click **Create**

Your proposal appears in the proposals table with ID, value, and your vote weight already registered.

#### Voting on Proposals

1. Click the **Governance** tab
2. Stay on the **As Validator** sub‑tab
3. Under "Vote":
   - Enter the proposal ID
   - Select your choice: **For**, **Against**, or **Decline**
4. Click **Vote**

Your vote is weighted by your bank's share. The proposal table will reflect your vote.

**Important:** You can only vote once per proposal. Trying again will revert.

#### Viewing Validator Statistics

1. Click the **Validators** tab
2. See all registered banks in a table with:
   - Address, contribution, share, founder status
   - Fees generated, claimable fees
   - Entry date

---

### Typical Bank Workflow

Here is a typical day as a Bank on the platform:

1. A new customer comes in → use **Enter System** to give them 200 TDHK
2. The customer deposits money → use **Issue Deposit** to give them TDHK
3. After some time has passed → use **Accrue Interest** to compound their earnings
4. Users have been transferring tokens → check **Claim Fees** to collect your earnings
5. A quarterly review is coming up → create a **Governance Proposal** to adjust the interest rate
6. Other banks have created proposals → **Vote** on them before the deadline

---

## Guide for Retail Users

> **Prerequisite:** An Administrator must whitelist you (KYC) and issue you a TDHK deposit before you can use these features.  
> **Your Balance:** 0 TDHK initially — you receive tokens when an admin issues a deposit or enters you into the system

As a Retail User, you hold TDHK tokens, stake them to earn protocol benefits, and transfer tokens to other users. All actions are on the **Dashboard** tab.

---

### Dashboard

#### Viewing Your Balances

After connecting your wallet, the three stat cards show:

- **Token Balance** — your freely available TDHK
- **Staked Balance** — your locked TDHK (currently earning you nothing, but required for certain platform features)
- **Session Status** — confirms you are connected

#### Staking Tokens

Staking locks your TDHK for 30 days. This is a core platform interaction.

1. On the **Dashboard** tab, find the "Staking Interface" card
2. Enter the amount you want to stake (e.g., `100`)
3. Click **Stake Deposit**
4. Confirm in MetaMask
5. Your Token Balance goes down and your Staked Balance goes up

**Important notes about staking:**
- The minimum stake is any amount greater than 0
- Once staked, your tokens are **locked for 30 days**
- If you already have staked tokens, you cannot stake more until the existing lock expires
- You cannot unstake any tokens until the 30‑day lock period ends

#### Withdrawing Staked Tokens

After your 30‑day lock expires:

1. On the **Dashboard** tab, under "Withdraw Staked Amount"
2. Enter the amount you want to unstake (must be ≤ your staked balance)
3. Click **Withdraw Stake**
4. Confirm in MetaMask
5. Your Staked Balance goes down and Token Balance goes up

#### Transferring Tokens to Another User

Use the `swapTokens` function to send TDHK to another address. A tiered fee is applied:

| Transfer Size | Fee Rate |
|---|---|
| Less than 10,000 TDHK | 0.25% |
| 10,000 – 99,999 TDHK | 0.20% |
| 100,000 TDHK or more | 0.15% |
| Fee cap | 100 TDHK maximum |

To transfer:

1. On the **Dashboard** tab, find the "Transfer Interface" card
2. Enter the recipient's address (must be a valid 42‑character hex address)
3. Enter the amount (in TDHK, e.g., `50`)
4. Click **Transfer Tokens**
5. Confirm in MetaMask
6. The recipient receives the amount minus the fee

**Requirements for transfers:**
- Both you and the recipient must be KYC‑whitelisted
- You must have enough TDHK to cover the full amount (the fee is deducted from the sender's side)
- The recipient's address must be valid

#### What If Something Goes Wrong?

| Error | What It Means | What To Do |
|---|---|---|
| "User not KYC whitelisted" | Your address is not in the KYC system | Ask an Admin to whitelist you (via the Compliance tab) |
| "Recipient not KYC whitelisted" | The person you're sending to is not whitelisted | Ask an Admin to whitelist them |
| "Stake amount exceeds your token balance" | You don't have enough TDHK | Enter a smaller amount |
| "Transfer amount exceeds your token balance" | You don't have enough TDHK | Enter a smaller amount |
| "Existing stake locked" | You already have staked tokens and can't add more yet | Wait 30 days or use a different wallet |
| "1‑month lock active" | Your staked tokens are still locked | Wait for the 30‑day period to expire |
| "AccessControlUnauthorizedAccount" | You tried to do something that requires a Bank or Admin role | You can only use the Dashboard tab as a user |

---

### Typical User Workflow

1. Connect your wallet → verify you are KYC‑whitelisted (if not, ask an Admin)
2. Check your balances on the Dashboard
3. **Stake** some TDHK to lock them for 30 days
4. **Transfer** some TDHK to another user (e.g., Bob or Alice)
5. After 30 days, **unstake** your tokens back
6. Let your Bank accrue interest on your behalf

---

## Glossary

| Term | Definition |
|---|---|
| **TDHK** | The platform's native token (TokenizedDeposit Hong Kong Dollar) |
| **KYC** | Know Your Customer — all users must be whitelisted to interact |
| **Staking** | Locking your TDHK tokens for 30 days as a commitment to the platform |
| **Basis Point (bps)** | 1/100th of a percent. 500 bps = 5% |
| **BANK_ROLE** | Permission to issue/redeem deposits, accrue interest, and claim fees |
| **COMPLIANCE_ROLE** | Permission to whitelist or remove users from KYC |
| **DEFAULT_ADMIN_ROLE** | Full administrative control — can add banks, reevaluate shares, execute proposals |
| **VALIDATOR_ROLE** | Permission to create and vote on governance proposals |
| **GOVERNANCE_PROXY_ROLE** | Permission to submit proposals and vote on behalf of validators |
| **Pull‑Payment** | The bank's fee distribution model — fees accumulate globally, and each bank claims their share individually |
| **swapTokens** | The platform's tiered‑fee transfer function (not a token swap in the DEX sense) |
| **enterSystem** | A one‑time 200 TDHK onboarding incentive for new users |
