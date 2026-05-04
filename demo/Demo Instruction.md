# Comprehensive Demo — Weighted Governance on Tokenized Deposit Platform

*5 accounts, 2 banks (different sizes), 2 users, 1 admin.

requisites

1. Run `npm run dev` from project root
2. Import these 5 accounts into MetaMask (**Settings** → **Import Account** → paste private key):

| # | Role             | Address                                       | Private Key                                                          |
|---|------------------|-----------------------------------------------|----------------------------------------------------------------------|
| 0 | Admin            | `0xf39F...2266`                               | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | Bank A (large)   | `0x7099...79C8`                               | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | User A           | `0x3C44...93BC`                               | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | Bank B (small)   | `0x90F7...b906`                               | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | User B           | `0x15d3...6A65`                               | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

3. Open `http://localhost:3000`

---

## Expected Share Distribution

*(after adding both banks, auto-computed)*

| | Bank A | Bank B | Admin | Total |
|---|---|---|---|---|
| Share | 3.000 | 1.000 | 0.444 | 4.444 |
| % | 67.5% | 22.5% | 10.0% | 100% |

---

## Round 1 — Admin Onboarding

**Connect:** Admin (Account #0)

### 1.1 Add Bank A *(large founding bank)*

**Tab:** Administration

- **Bank Address:** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Contribution:** `5000000`
- ☑ **Founder bank**
- **Click** `Add Bank`

> [!info] Demonstrates
> `addBank` — grants `BANK_ROLE`, sets share (3.000), auto-registers as validator on both governance contracts. Admin auto-gets 0.333 share.

### 1.2 Add Bank B *(small non-founding bank)*

- **Bank Address:** `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- **Contribution:** `3000000`
- ☐ **Founder bank** (unchecked)
- **Click** `Add Bank`

> [!info] Demonstrates
> Admin share auto-recalculates to 0.444

**→ Switch to Validators tab** — confirm the table:

| Validator | Share | % |
|-----------|-------|---|
| Admin (amber row) | 0.444 | 10% |
| Bank A | 3.000 | 67.5% |
| Bank B | 1.000 | 22.5% |

### 1.3 Whitelist Users

> [!note] Note
> `issueDeposit` now auto-whitelists — this step demonstrates the manual function.

**Tab:** Compliance → `Whitelist User`

- `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (User A) → **Click** `Whitelist User`
- `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (User B) → **Click** `Whitelist User`

> [!info] Demonstrates
> `whitelistUser`

### 1.4 Verify KYC

**Tab:** Compliance → `Check KYC Status`

- **Enter:** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

> [!info] Demonstrates
> Shows `Whitelisted: Yes` — `isWhitelisted`

> [!info] Banks are already governance validators
> `addBank` auto-registers them. No manual `registerValidator` step needed.

**→ Verify:** Switch to Governance → **Interest Rate**. Banks can create proposals immediately.

---

## Round 2 — Issue Deposits & Transfers

### 2.1 Issue Deposit to User A

**Connect:** Bank A (Account #1)  
**Tab:** Banking

- **Issue Deposit:** User A address, **Amount:** `10000` → **Click** `Issue Deposit`

> [!info] Demonstrates
> `issueDeposit`

### 2.2 Enter System — User A

- **Enter System:** User A address → **Click** `Enter System`

> [!info] Demonstrates
> `enterSystem` → +200 TDHK. User A now has 10,200 TDHK.

### 2.3 Issue Deposit to User B

**Connect:** Bank B (Account #3)  
**Tab:** Banking

- **Issue Deposit:** User B address, **Amount:** `5000` → **Click** `Issue Deposit`

### 2.4 Enter System — User B

- **Enter System:** User B address → **Click** `Enter System`

> User B now has 5,200 TDHK.

### 2.5 Transfer from User A to User B

**Connect:** User A (Account #2)  
**Tab:** Dashboard

- **View balance:** ~10,200 TDHK

**Transfer:**
- **Recipient:** `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (User B)
- **Amount:** `2000` → **Click** `Transfer Tokens`

> [!info] Demonstrates
> `swapTokens` — tiered fee: 0.25% of 2,000 = 5 TDHK. User B receives 1,995.

**Verify:** Connect User B (Account #4) → Dashboard shows ~7,195 TDHK.

---

## Round 3 — Fee Collection *(Weighted)*

### 3.1 Bank A Claims Fees

**Connect:** Bank A (Account #1)  
**Tab:** Banking → `Claim Fees`

> 67.5% of 5 TDHK fee pool → ~3.375 TDHK.

> [!info] Demonstrates
> `claimFees`

### 3.2 Bank B Claims Fees

**Connect:** Bank B (Account #3)  
**Tab:** Banking → `Claim Fees`

> 22.5% → ~1.125 TDHK.

### 3.3 Admin Claims Fees

**Connect:** Admin (Account #0)  
**Tab:** Banking → `Claim Fees`

> 10% → ~0.500 TDHK. Admin's share generates real revenue.

---

## Round 4 — Interest & Redemption

### 4.1 Accrue Interest

**Connect:** Bank A (Account #1)  
**Tab:** Banking

- **Accrue Interest** → User A → **Click** `Accrue Interest`

> [!info] Demonstrates
> `accrueInterest` — tiered margin (50/30/10 bps).

> [!warning] Note
> Requires 1+ day since last accrual.

### 4.2 Redeem Deposit

- **Redeem Deposit** → User A, **Amount:** `1000` → **Click** `Redeem Deposit`

> [!info] Demonstrates
> `redeemDeposit` — burns 1,000 TDHK (reverse of `issueDeposit`).

---

## Round 5 — Weighted Governance ★

### Scenario A: Proposal PASSES *(large bank + admin outvote small bank)*

#### 5.1 Create Proposal

**Connect:** Bank A (Account #1)  
**Tab:** Governance → **Interest Rate** → **As Validator**

- **Rate:** `400` (propose 4%) → **Click** `Create`

> [!info] Demonstrates
> `createProposal` → Proposal #1

#### 5.2 Bank A Votes FOR *(weight: 3.000)*

- **Proposal ID:** `1`, **Choice:** `for` → **Click** `Vote`

#### 5.3 Bank B Votes AGAINST *(weight: 1.000)*

**Connect:** Bank B (Account #3)  
**Tab:** Governance → **Interest Rate** → **As Validator**

- **Proposal ID:** `1`, **Choice:** `against` → **Click** `Vote`

> Tally: **For = 3.000**, **Against = 1.000**

#### 5.4 Admin Votes FOR *(weight: 0.444)*

**Connect:** Admin (Account #0)  
**Tab:** Governance → **Interest Rate** → **As Validator**

- **Proposal ID:** `1`, **Choice:** `for` → **Click** `Vote`

> [!success] Final: For = 3.444, Against = 1.000 → **PASSES**

#### 5.5 Execute Proposal

Scroll down to the Proposals table → Proposal #1 shows **"Approved"** with an ▶ `Execute` button.

- **Click** `Execute`

> [!info] Demonstrates
> Anyone can execute — no admin-only gate. `executeProposal` → `interestManager.updateRate(400)` auto-applied.

> [!success] Governance tab now shows badge: **Current: 400 bps (4%)**

---

## Complete Coverage

| # | Function | Step | Actor |
|---|----------|------|-------|
| 1 | `addBank` | 1.1 | Admin |
| 2 | `addBank` (non-founder) | 1.2 | Admin |
| 3 | `_recalculateAdminShare` | 1.1, 1.2 | Auto |
| 4 | `whitelistUser` | 1.3 | Admin |
| 5 | `isWhitelisted` | 1.4 | Admin |
| 6 | `issueDeposit` | 2.1, 2.3 | Bank A, Bank B |
| 7 | `enterSystem` | 2.2, 2.4 | Bank A, Bank B |
| 8 | `swapTokens` | 2.5 | User A |
| 9 | `claimFees` | 3.1–3.3 | Bank A, B, Admin |
| 10 | `accrueInterest` | 4.1 | Bank A |
| 11 | `redeemDeposit` | 4.2 | Bank A |
| 12 | `createProposal` | 5.1, 5.6 | Bank A, B |
| 13 | `vote` | 5.2–5.4, 5.7–5.8 | All |
| 14 | `executeProposal` | 5.5 | Anyone (▶ button) |
| 15 | `updateRate` | 5.5 (auto) | Governance |
| 16 | `initiateBridge` | 6.1 | Admin |
| 17 | `grantRole` | 6.2 | Admin |
| 18 | `revokeRole` | 6.3 | Admin |
| 19 | `removeWhitelist` | 6.4 | Admin |
