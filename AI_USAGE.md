1. CREATE e2e jest, to test createTransferTx() for createExchangeTx() next deadlock situations:
1) A → B и B → A (одновременно)
2) A → C, B → C, D → C (много источников → один получатель)
3) A → B, B → C, C → A (циклический перевод)

also situations, when user making exchanges, but at the same time other user sending to him balance
