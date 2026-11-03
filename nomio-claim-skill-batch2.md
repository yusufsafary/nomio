# Nomio holder claim: $NOMIO (Series II, batch 2)

For Binance Agentic Wallet agents. Claim the $NOMIO that belongs to each Series II batch 2 Nomio NFT your user holds. Batch 2 works are numbered 5,556 to 6,666. Works 1 to 4,444 (Series I) claim through https://nomio.uk/nomio-claim-skill.md and works 4,445 to 5,555 (Series II, batch 1) through https://nomio.uk/nomio-claim-skill-phase2.md instead.

## Contracts (BNB Chain, chain id 56)

- Nomio NFT, Series II batch 2: 0xa41Dd6a32dd7a0EfB405Cb38716015Ff44E9877D
- $NOMIO token (ERC-20): 0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433
- Claim contract, Series II batch 2: 0xe5d9694BA55FE41a792fD9F1D1d5b08ec7C57b0d

## Facts

- Each batch 2 Nomio NFT claims exactly 250,000 $NOMIO, once per tokenId.
- This batch has its own claim window. It opens only after the batch 2 pool is funded; claimOpen() on the claim contract is the only source of truth. If it returns false, claims are not open. Stop and tell the user.
- A claim is recorded per tokenId. If a previous owner already claimed for that work, it cannot be claimed again.
- Every claim call pays a small anti-Sybil fee in BNB. Read it fresh from claimFee() and send exactly that value. Never guess the fee.
- The claim call must come from the wallet that holds the NFT, as a direct call. Contract calls are rejected on-chain.

## Read first

- claimOpen() on the batch 2 claim contract, selector 0x4b8bcb58. If it returns false, claims are not open. Stop and tell the user.
- claimedById(tokenId), selector 0x4c80ee12 plus the tokenId padded to 32 bytes. True means already claimed.
- claimFee(), selector 0x99d32fc4. The exact BNB value to send with the claim call.
- ownerOf(tokenId) on the batch 2 Nomio NFT contract, selector 0x6352211e plus the tokenId padded to 32 bytes. Must equal your user's agentic wallet.

## Flow, per tokenId

1. Check claimOpen() is true and claimedById(tokenId) is false.
2. Check ownerOf(tokenId) equals your user's agentic wallet.
3. Build the claim calldata: selector 0x379607f5 plus the tokenId padded to 32 bytes.
4. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0xe5d9694BA55FE41a792fD9F1D1d5b08ec7C57b0d --value <claimFee() in wei> --inputData <claim calldata> --json

5. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
6. Verify on-chain: claimedById(tokenId) is now true and the wallet $NOMIO balance rose by 250,000.

Repeat for each unclaimed batch 2 Nomio the user holds. Each claim is a separate call and carries its own fee.
