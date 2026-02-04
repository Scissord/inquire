1. CREATE e2e jest, to test createTransferTx() for next deadlock situations:
1) A → B и B → A (одновременно)
2) A → C, B → C, D → C (много источников → один получатель)
3) A → B, B → C, C → A (циклический перевод)

2. CREATE e2e jest, to test createExchangeTx() for next deadlock situations:
