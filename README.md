Hello, and thanks for your time!
1. git clone https://github.com/Scissord/inquire.git

Now you have 2 variety:

2. Check e2e.test
cd ./backend -> npm run test:e2e -- transactions-deadlock

You should see:
 PASS  test/transactions-deadlock.e2e-spec.ts (215.112 s)
  TransactionsService Deadlock Tests (e2e)
    Case 1: Bidirectional transfers (A ↔ B)
      √ should handle A→B and B→A simultaneously without deadlock (11637 ms)
      √ should handle rapid A↔B exchanges without deadlock (27546 ms)
    Case 2: Multiple sources to single destination (A,B,D → C)
      √ should handle multiple transfers to same account without deadlock (16946 ms)
    Case 3: Circular transfers (A → B → C → A)
      √ should handle circular transfers without deadlock (16764 ms)
      √ should handle aggressive circular transfers without deadlock (55296 ms)
    Bonus: Combined stress test
      √ should handle all patterns simultaneously without deadlock (20614 ms)
    Case 4: Incoming + Outgoing on same account
      √ should handle incoming transfer while owner transfers out (22027 ms)
      √ should handle multiple incoming while owner transfers out rapidly (24927 ms)
    Case 5: Exchange + Transfer on same account
      √ should handle exchange while receiving transfer on source account (2241 ms)
      √ should handle exchange while receiving transfer on destination account (2193 ms)
      √ should handle exchange while owner transfers FROM same account (2239 ms)
    Case 6: Multiple exchanges competing for system accounts
      √ should handle opposite exchanges without deadlock (819 ms)
      √ should handle three users exchanging simultaneously (807 ms)
    Case 7: Ultimate stress test (Transfer + Exchange)
      √ should handle all operations mixed without deadlock (5972 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        215.46 s
Ran all test suites matching transactions-deadlock.

3. Start Docker
1) go to main route -> /inquire
2) docker compose up
3) go to localhost:3000 in browser
4) start to test interface

