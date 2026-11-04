# Nomio holder claim: $NOMIO (Premium)

For Binance Agentic Wallet agents. Claim the $NOMIO that belongs to each Premium Nomio NFT your user holds. Premium works are numbered 6,667 to 7,221. Works up to 6,666 claim through other contracts: see https://nomio.uk/nomio-claim-skill.md (Series I), https://nomio.uk/nomio-claim-skill-phase2.md (Series II), or https://nomio.uk/nomio-claim-skill-batch2.md (Series II batch 2) instead.

## Contracts (BNB Chain, chain id 56)

- Nomio Premium NFT: 0x168ab2316a96f25F686dFED5a62b58704A8b13F1
- $NOMIO token (ERC-20): 0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433
- Claim contract, Premium: 0x1638801c0E3ae3f8f7D601F62A9836fbfC646E75

## Facts

- Each Premium Nomio claims $NOMIO once per tokenId, by the rarity class locked at mint: Common (class 0) 1,000,000, Rare (class 1) 3,000,000, Mythic (class 2) 10,000,000 $NOMIO.
- There is no claim fee: claimFee() reads 0, so the claim call sends value 0 and pays only gas.
- Premium claims run in their own window. They are not bound by the 8 November 2026 close that applies to Series I and Series II batch 1.
- A claim is recorded per tokenId. If a previous owner already claimed for that work, it cannot be claimed again.
- The claim call must come from the wallet that holds the NFT, as a direct call. Contract calls are rejected on-chain.

## Read first

- claimOpen() on the Premium claim contract, selector 0x4b8bcb58. If it returns false, claims are not open yet (the pool may still be unfunded). Stop and tell the user.
- claimAmount(tokenId) on the Premium claim contract, selector 0x23b221a0 plus the tokenId padded to 32 bytes. The exact $NOMIO this work claims, by its class. 0 means the work is outside the Premium range or not minted.
- rarityClassOf(tokenId) on the Premium NFT contract, selector 0xcd08c0d6 plus the tokenId padded to 32 bytes. The work's class: 0 Common, 1 Rare, 2 Mythic.
- claimedById(tokenId), selector 0x4c80ee12 plus the tokenId padded to 32 bytes. True means already claimed.
- ownerOf(tokenId) on the Premium NFT contract, selector 0x6352211e plus the tokenId padded to 32 bytes. Must equal your user's agentic wallet.

## Flow, per tokenId

1. Check claimOpen() is true and claimedById(tokenId) is false.
2. Check ownerOf(tokenId) equals your user's agentic wallet, and read claimAmount(tokenId).
3. Build the claim calldata: selector 0x379607f5 plus the tokenId padded to 32 bytes.
4. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0x1638801c0E3ae3f8f7D601F62A9836fbfC646E75 --value 0 --inputData <claim calldata> --json

5. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
6. Verify on-chain: claimedById(tokenId) is now true and the wallet $NOMIO balance rose by claimAmount(tokenId).

Repeat for each unclaimed Premium Nomio the user holds. Each claim is a separate call.

## If a claim fails

Do not retry blindly. Each cause below has a read that identifies it:

- claimOpen() returns false: Premium claims are not open yet. The claim pool is funded by the project owner from the Binance app before opening; nothing is wrong on your side. Tell the user claims open once the pool is funded.
- claimedById(tokenId) returns true: already claimed. Claims attach to the work, not the owner, so a work bought on the market may have been claimed by an earlier owner. Nothing more can be claimed for it.
- ownerOf(tokenId) is not your user's agentic wallet: the work sits in another wallet. A claim only succeeds from the wallet holding the work. Ask the user to move the work into the agentic wallet, then claim again.
- The preview shows a pool shortfall: the claim pool does not yet hold enough $NOMIO for this work's class. Wait for the owner to top the pool up; the work's right to claim does not expire.
- You sent a value other than 0: Premium claimFee() is 0. Send exactly 0.
- You are reading a skill file for a different series: works claim only through their own series contract. Switch to the file whose number range contains the work.
