# Legal Documents Dataset

Dataset of TOS, EULAs, and privacy policies for building a tool to surface sneaky/consumer-hostile clauses.

## Structure

```
terms-of-service/
  defense/     16 PDFs - military/defense/surveillance companies
  tech/        28 PDFs - major tech, fintech, gaming, media
  synthetic/    6 PDFs - fake companies with intentionally buried sneaky clauses
  google_tos.pdf
privacy-policies/
  google_privacy.pdf
eulas/
  defense/     1 PDF  - Cellebrite
  tech/        8 PDFs - F5, Arista, Wipro, RSA, Citrix, PacBio, ForNAV, miniOrange
```

## Stats

- **61 PDFs**, all content verified
- Longest: Coinbase (51K words), Airbnb (40K), Cash App (44K), Venmo (35K), Robinhood (32K)

## Notable Companies

**Defense/Surveillance:** L3Harris, RTX/Raytheon, Northrop Grumman, General Dynamics, Leidos, CACI, Kratos, SAIC, DJI, Axon, NSO Group, Cellebrite, Teledyne FLIR, US Army

**Tech/Fintech:** Meta, TikTok, Spotify, Airbnb, X/Twitter, Snapchat, Discord, Zoom, Adobe, Netflix, Palantir, LinkedIn, PayPal, Robinhood, Coinbase, Venmo, Cash App, Epic Games, EA, Steam, Hulu, Twitch, Peloton, Ring, Instacart, Grubhub, Roku, Samsung

## Synthetic Test Documents

Fake but realistic TOS with intentionally buried sneaky clauses for tool validation.

| Document | Hidden Clause | Location |
|----------|--------------|----------|
| NexaCloud (cloud) | Uploads grant irrevocable license for AI training, no compensation | 5.3 |
| VaultPay (fintech) | They invest your funds & keep returns; bankrupt = creditors first; <$5 balances forfeited; transaction data shared w/ marketers, no real opt-out | 4.2, 4.3, 7.3, 12.2 |
| Synthetica AI | Your company logo used in investor decks unless opt-out within 7 days; inputs train models forever | 17.3, 4.4 |
| Gridlock Gaming | Anti-cheat runs at kernel level on boot even when not playing; voice chat recorded 90 days; $50 liability cap | 9.2, 8.2, 12 |
| OmniVault (smart home) | Camera footage shared w/ police without notice; devices remotely bricked on termination; footage trains CV models | 5.4, 5.5, 12.2 |
| Cerebro Health (wearable) | Health data shared w/ insurers & employers for premium adjustments; pharma gets anonymized data; zero liability for injury/death | 4.4, 4.5, 11.1 |
