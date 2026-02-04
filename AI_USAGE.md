1. CREATE e2e jest, to test createTransferTx() for createExchangeTx() next deadlock situations:
1) A → B и B → A (at the same time)
2) A → C, B → C, D → C (many sources → one receiver)
3) A → B, B → C, C → A (cycle)

also situations, when user making exchanges, but at the same time other user sending to him balance

2. some front was craeted by ai, cuz no time left, thanks for understanding
