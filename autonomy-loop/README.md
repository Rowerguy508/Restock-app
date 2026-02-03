# Poniente Autonomy Loop

**Self-funding SaaS. No VCs. No grants. Agents fund themselves.**

## The Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Poniente TOKEN → RESTAURANTS PAY → YIELD EARNED               │
│         │              │                 │                      │
│         ▼              ▼                 ▼                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │              MORPHO / AAVE                      │           │
│   │         Deposit Tokens → Earn Yield             │           │
│   └─────────────────────────────────────────────────┘           │
│                      │                                         │
│                      ▼                                         │
│   ┌─────────────────────────────────────────────────┐           │
│   │              BORROW USDC                         │           │
│   │    Use collateral to borrow for operations      │           │
│   └─────────────────────────────────────────────────┘           │
│                      │                                         │
│                      ▼                                         │
│   ┌─────────────────────────────────────────────────┐           │
│   │              FUND OPERATIONS                     │           │
│   │   • Server costs (Vercel/Railway)               │           │
│   │   • API credits (OpenRouter, Supabase)          │           │
│   │   • Development (Anzio's time)                  │           │
│   └─────────────────────────────────────────────────┘           │
│                      │                                         │
│                      ▼                                         │
│   ┌─────────────────────────────────────────────────┐           │
│   │            IMPROVE PRODUCT                      │           │
│   │   • More features                              │           │
│   │   • Better UX                                   │           │
│   │   • More restaurants on-boarded                │           │
│   └─────────────────────────────────────────────────┘           │
│                      │                                         │
│                      ▼                                         │
│              MORE USERS → MORE FEES                             │
│                      │                                         │
│                      └────────────────────────────────►        │
│                                                          │       │
│                    REPEAT FOREVER ◄──────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tokenomics

| Parameter | Value |
|-----------|-------|
| Token | Poniente |
| Launch Platform | Clawnch (free) |
| Initial Supply | 10M |
| Restaurant Stake | 100-1000 Poniente |
| Fee | 1-2% of subscription |
| Holder Rewards | 50% of fees |
| Treasury | 50% of fees |

## Revenue Flow

```
Monthly Revenue (Subscriptions)
        │
        ├── 50% → Token Buyback/Burn
        │           │
        │           └── Reduces supply → Higher price
        │
        ├── 30% → Treasury (Morpho deposit)
        │           │
        │           └── Earn yield → Borrow USDC for ops
        │
        └── 20% → Operations Fund
                    │
                    ├── Server costs
                    ├── API credits
                    └── Development
```

## Smart Contract Integration

### Morpho (Yield & Borrowing)

```solidity
// Deposit Poniente, earn yield
// Borrow USDC against collateral
```

### Clawnch (Token Launch)

- Free token launch
- Liquidity bootstrapping
- Trading fees in WETH

### Bankr (Fee Claiming)

- Claim trading fees
- Convert to USDC/ETH

## Success Metrics

| Metric | Target (Month 1) | Target (Month 6) |
|--------|-----------------|------------------|
| Token Holders | 100 | 1000 |
| Restaurants | 50 | 500 |
| TVL (Morpho) | $10K | $500K |
| Monthly Revenue | $1K | $50K |
| Self-Funding | 10% | 100% |

## Autonomy Level

**Level 1 (Now):** Manual execution
- Monitor metrics
- Rebalance collateral
- Claim fees weekly

**Level 2 (Soon):** Semi-automated
- Scripts handle claims
- Auto-rebalancing
- Alerts on liquidation risk

**Level 3 (Future):** Fully autonomous
- Agent monitors 24/7
- Auto-optimizes yield
- Self-healing infrastructure

---

*Built by Claude VOTT. Agents fund themselves.*
