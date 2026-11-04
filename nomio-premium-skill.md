# Nomio Premium: mint

For Binance Agentic Wallet agents. Mint Nomio Premium works for your user. Premium works are numbered 6,667 to 7,221 (555 works). Works up to 6,666 belong to Series I and II and mint through other contracts: see the mint section at https://nomio.uk instead.

## Contracts (BNB Chain, chain id 56)

- Nomio Premium NFT: 0x168ab2316a96f25F686dFED5a62b58704A8b13F1

## Facts

- Price: read currentPrice() on the contract and send exactly that value (0.004 BNB at launch). Never guess the price.
- One work per mint() call. At most 10 Premium works per wallet, ever.
- Rarity is locked on chain at mint by the work's seed: rarityClassOf(tokenId) returns 0 (Common, about 70 in 100), 1 (Rare, about 27 in 100), or 2 (Mythic, about 3 in 100). The class can never change. It also sets the Premium claim: Common 1,000,000, Rare 3,000,000, Mythic 10,000,000 $NOMIO.
- The mint call must come from a wallet holding a Binance Agent ID, as a direct call. Contract calls are rejected on-chain.

## Read first

- mintOpen(), selector 0x24bbd049. If false, minting is not open. Stop and tell the user.
- currentPrice(), selector 0x9d1b464a. The exact BNB value to send.
- holdsAgentId(your wallet), selector 0x11213086 plus your wallet address padded to 32 bytes. False means no Agent ID: stop, and tell the user to claim one in the Binance Wallet app first.
- mintedBy(your wallet), selector 0x3cef28d2 plus your wallet address padded to 32 bytes. At 10, the wallet limit is reached.
- totalSupply(), selector 0x18160ddd. At 555 the phase is sold out.

## Flow

1. Run the reads above.
2. Build the mint calldata: 0x1249c58b.
3. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0x168ab2316a96f25F686dFED5a62b58704A8b13F1 --value <currentPrice() in wei> --inputData 0x1249c58b --json

4. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
5. Verify on-chain: totalSupply() rose by one, and read rarityClassOf(new tokenId) and seedOf(new tokenId) on the contract. Tell the user the work's number and its rarity class (0 Common, 1 Rare, 2 Mythic).

## If a mint fails

Do not retry blindly, and never retry with a different value. Each cause below has a read that identifies it:

- holdsAgentId(your wallet) returns false: no Agent ID in the wallet. The user claims one in the Binance Wallet app first.
- The value sent differs from currentPrice(): the price is compared exactly, wei for wei. Read it again and send precisely that.
- mintedBy(your wallet) reads 10: the wallet already holds its ten Premium works. No more can be minted from this wallet.
- totalSupply() reads 555: the phase is sold out. Premium works trade on Element afterwards.
- The call was routed through another contract: the contract accepts only direct calls from the agentic wallet itself (the caller must be the transaction origin).
- Too little BNB: a mint needs the price plus gas. Ask the user to top up BNB, then retry.
