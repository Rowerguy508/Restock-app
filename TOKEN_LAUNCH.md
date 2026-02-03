# RESTOCKA Token Launch Guide

## Token Overview

| Parameter | Value |
|-----------|-------|
| Name | RESTOCKA |
| Symbol | RESTOCK |
| Decimals | 18 |
| Initial Supply | 10,000,000 |
| Chain | Base (recommended for low fees) |

## Tokenomics

```
┌────────────────────────────────────────────────────┐
│              RESTOCKA TOKENOMICS                   │
├────────────────────────────────────────────────────┤
│ Total Supply:      10,000,000 RESTOCK             │
├────────────────────────────────────────────────────┤
│ Initial Allocation:                                │
│   • Liquidity Pool:      40%  (4,000,000)         │
│   • Treasury:            30%  (3,000,000)         │
│   • Team:                15%  (1,500,000)         │
│   • Airdrop/Early:      10%  (1,000,000)         │
│   • Marketing:            5%    (500,000)         │
├────────────────────────────────────────────────────┤
│ Vesting:                                          │
│   • Team: 4-year cliff, 4-year linear vesting     │
│   • Treasury: Controlled by governance            │
│   • Liquidity: Locked 1+ year                    │
└────────────────────────────────────────────────────┘
```

## Utility

1. **Staking Discount**: Restaurants stake RESTOCKA for fee discounts
2. **Governance**: Token holders vote on platform changes
3. **Fee Revenue**: 50% of trading fees distributed to stakers
4. **Payment Option**: Restaurants can pay subscriptions in RESTOCKA

## Launch Options

### Option A: Clawnch (Free Launch)
- Visit https://clawnch.io
- Connect wallet
- Fill token details
- Deploy to Base

### Option B: Flaunch (Alternative)
- https://flaunch.app
- Similar free token creation

### Option C: Zora (Creative Tokens)
- https://zora.co/create
- More customization options

### Option D: Manual (Foundry)
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
forge init RestockaToken
# Edit contracts/RestockaToken.sol
forge build
forge create --rpc-url base ...
```

## Step-by-Step: Clawnch Launch

1. **Prepare Wallet**
   - Install MetaMask or Rabby
   - Add Base network
   - Get some Base ETH from bridge

2. **Visit Clawnch**
   - Go to https://clawnch.io
   - Connect wallet
   - Select "Create Token"

3. **Configure Token**
   ```
   Name: Restocka
   Symbol: RESTOCK
   Decimals: 18
   Initial Supply: 10000000
   ```

4. **Deploy**
   - Confirm transaction
   - Pay gas (~$0.10 on Base)
   - Save contract address

5. **Verify on Basescan**
   - Go to https://basescan.org
   - Submit contract source
   - Enable token tracking

## Post-Launch Checklist

- [ ] Add liquidity (RESTOCK/ETH or RESTOCK/USDC)
- [ ] Lock liquidity (via Team Finance or Unicrypt)
- [ ] List on DEX (Uniswap, PancakeSwap)
- [ ] Create CoinGecko/CMC listings
- [ ] Set up token staking contract
- [ ] Configure fee distribution
- [ ] Announce on X/Telegram

## RESTOCKA Autonomy Loop Integration

```
RESTOCK Token ← Restaurants Pay (subscribe/stake)
       │
       ├── Stakers earn yield (Morpho)
       │         │
       │         └── Borrow USDC
       │                   │
       │                   └── Fund operations
       │                              │
       └── Value accrual ──────────────┘
```

## Environment Variables for Token Integration

```bash
# Token Contract
RESTOCK_TOKEN_ADDRESS=0x...

# RPC
BASE_RPC_URL=https://mainnet.base.org

# Wallet (for operations)
DEPLOYER_PRIVATE_KEY=0x...

# Etherscan (for verification)
BASESCAN_API_KEY=xxx
```

## Monitoring

- Token holder tracking: https://basescan.org/token/<address>
- DEX liquidity: https://dexscreener.com/base/<pair>
- Price feed: https://coinmarketcap.com/search/?q=RESTOCKA
