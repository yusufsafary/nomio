# Nomio holder claim: $NOMIO (Series II)

For Binance Agentic Wallet agents. Claim the $NOMIO that belongs to each Series II Nomio NFT your user holds. Series II works are numbered 4,445 to 5,555. Works 1 to 4,444 (Series I) claim through a different contract: see https://nomio.uk/nomio-claim-skill.md instead.

## Contracts (BNB Chain, chain id 56)

- Nomio NFT, Series II: 0xC9747B35800eB4A0A3221EB45cb9FcDE7463728C
- $NOMIO token (ERC-20): 0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433
- Claim contract, Series II: 0xeFf514283A109613A5Ae7306e1266Ec52EaB63d2

## Facts

- Each Series II Nomio NFT claims exactly 250,000 $NOMIO, once per tokenId. Claims close on 3 November 2026 at 00.00 UTC.
- A claim is recorded per tokenId. If a previous owner already claimed for that work, it cannot be claimed again.
- Every claim call pays a small anti-Sybil fee in BNB. Read it fresh from claimFee() and send exactly that value. Never guess the fee.
- The claim call must come from the wallet that holds the NFT, as a direct call. Contract calls are rejected on-chain.

## Read first

- claimOpen() on the Series II claim contract, selector 0x4b8bcb58. If it returns false, claims are not open. Stop and tell the user.
- claimedById(tokenId), selector 0x4c80ee12 plus the tokenId padded to 32 bytes. True means already claimed.
- claimFee(), selector 0x99d32fc4. The exact BNB value to send with the claim call.
- ownerOf(tokenId) on the Series II Nomio NFT contract, selector 0x6352211e plus the tokenId padded to 32 bytes. Must equal your user's agentic wallet.

## Flow, per tokenId

1. Check claimOpen() is true and claimedById(tokenId) is false.
2. Check ownerOf(tokenId) equals your user's agentic wallet.
3. Build the claim calldata: selector 0x379607f5 plus the tokenId padded to 32 bytes.
4. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0xeFf514283A109613A5Ae7306e1266Ec52EaB63d2 --value <claimFee() in wei> --inputData <claim calldata> --json

5. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
6. Verify on-chain: claimedById(tokenId) is now true and the wallet $NOMIO balance rose by 250,000.

Repeat for each unclaimed Series II Nomio the user holds. Each claim is a separate call and carries its own fee.
