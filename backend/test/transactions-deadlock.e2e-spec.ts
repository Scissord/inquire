/**
 * e2e test for TransactionsService
 * to run all test: npm run test:e2e -- transactions-deadlock
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TransactionsService } from '../src/transactions/transactions.service';
import { PgService } from '../src/db/pg.service';

/**
 * Deadlock tests for TransactionsService
 *
 * We test createTransferTx and createExchangeTx to ensure there are no deadlocks
 * during parallel operations thanks to ORDER BY id in SELECT FOR UPDATE.
 *
 * IMPORTANT: To run these tests, a working database is required with:
 * - Test accounts
 * - An exchange_rates table with USD/EUR rates
 * - System exchange accounts
 */
describe('TransactionsService Deadlock Tests (e2e)', () => {
  let app: INestApplication;
  let transactionsService: TransactionsService;
  let pgService: PgService;

  // Test accounts User 1 (will be created in beforeAll)
  let user1AccountUSD: string;
  let user1AccountEUR: string;

  // Test accounts User 2
  let user2AccountUSD: string;
  let user2AccountEUR: string;

  // Test accounts User 3
  let user3AccountUSD: string;
  let user3AccountEUR: string;

  let testUser1Id: string;
  let testUser2Id: string;
  let testUser3Id: string;

  // Aliases for old tests (compatibility)
  let accountA: string;
  let accountB: string;
  let accountC: string;
  let accountD: string;

  const INITIAL_BALANCE = '10000.00';
  const TRANSFER_AMOUNT = '10.00';
  const TIMEOUT = 120000; // 120 seconds for test (increased for exchange)

  async function setupTestData() {
    // Create test users
    const user1Result = await pgService.query<{ id: string }>(
      `INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [`deadlock-test-user1-${Date.now()}@test.com`, 'test-hash'],
    );
    testUser1Id = user1Result.rows[0].id;

    const user2Result = await pgService.query<{ id: string }>(
      `INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [`deadlock-test-user2-${Date.now()}@test.com`, 'test-hash'],
    );
    testUser2Id = user2Result.rows[0].id;

    const user3Result = await pgService.query<{ id: string }>(
      `INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [`deadlock-test-user3-${Date.now()}@test.com`, 'test-hash'],
    );
    testUser3Id = user3Result.rows[0].id;

    // User 1: USD + EUR accounts
    user1AccountUSD = await createTestAccount(testUser1Id, 'USD');
    user1AccountEUR = await createTestAccount(testUser1Id, 'EUR');

    // User 2: USD + EUR accounts
    user2AccountUSD = await createTestAccount(testUser2Id, 'USD');
    user2AccountEUR = await createTestAccount(testUser2Id, 'EUR');

    // User 3: USD + EUR accounts
    user3AccountUSD = await createTestAccount(testUser3Id, 'USD');
    user3AccountEUR = await createTestAccount(testUser3Id, 'EUR');

    // Aliases for old tests (all USD for compatibility)
    accountA = user1AccountUSD;
    accountB = user2AccountUSD;
    accountC = user3AccountUSD;
    accountD = await createTestAccount(testUser1Id, 'USD'); // additional USD

    console.log('Test accounts created:', {
      user1: { USD: user1AccountUSD, EUR: user1AccountEUR },
      user2: { USD: user2AccountUSD, EUR: user2AccountEUR },
      user3: { USD: user3AccountUSD, EUR: user3AccountEUR },
      legacy: { A: accountA, B: accountB, C: accountC, D: accountD },
    });
  }

  async function createTestAccount(
    userId: string,
    currency: string,
  ): Promise<string> {
    const result = await pgService.query<{ id: string }>(
      `
        INSERT INTO app.accounts (user_id, currency, balance)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [userId, currency, INITIAL_BALANCE],
    );
    return result.rows[0].id;
  }

  async function cleanupTestData() {
    const userIds = [testUser1Id, testUser2Id, testUser3Id].filter(Boolean);
    if (userIds.length === 0) return;

    // Delete in the correct order (considering foreign keys)
    for (const userId of userIds) {
      await pgService.query(
        `
          DELETE FROM app.ledger
          WHERE account_id IN (
            SELECT id FROM app.accounts
            WHERE user_id = $1
          )
        `,
        [userId],
      );
      await pgService.query(`DELETE FROM app.accounts WHERE user_id = $1`, [
        userId,
      ]);
      await pgService.query(`DELETE FROM auth.users WHERE id = $1`, [userId]);
    }
  }

  async function getBalance(accountId: string): Promise<string> {
    const result = await pgService.query<{ balance: string }>(
      `
        SELECT balance
        FROM app.accounts
        WHERE id = $1
      `,
      [accountId],
    );
    return result.rows[0]?.balance ?? '0';
  }

  async function resetBalances() {
    const userIds = [testUser1Id, testUser2Id, testUser3Id].filter(Boolean);
    for (const userId of userIds) {
      await pgService.query(
        `UPDATE app.accounts SET balance = $1 WHERE user_id = $2`,
        [INITIAL_BALANCE, userId],
      );
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    transactionsService = app.get<TransactionsService>(TransactionsService);
    pgService = app.get<PgService>(PgService);

    // Create test user and accounts
    await setupTestData();
  }, TIMEOUT);

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  }, TIMEOUT);

  /**
   * Case 1: A → B and B → A (simultaneously)
   *
   * Classic scenario for deadlock, if locks are not ordered.
   * ORDER BY id deadlock is not possible.
   */
  describe('Case 1: Bidirectional transfers (A ↔ B)', () => {
    beforeEach(async () => {
      await resetBalances();
    });

    it(
      'should handle A→B and B→A simultaneously without deadlock',
      async () => {
        const iterations = 10;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          promises.push(
            transactionsService.createTransferTx(
              accountA,
              accountB,
              TRANSFER_AMOUNT,
              { test: 'A->B', iteration: i },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountB,
              accountA,
              TRANSFER_AMOUNT,
              { test: 'B->A', iteration: i },
            ),
          );
        }

        // All transactions should finish without deadlock
        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 1: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check that there were no deadlock errors
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Balances should be correct (sum did not change)
        const balanceA = await getBalance(accountA);
        const balanceB = await getBalance(accountB);
        const totalBalance = parseFloat(balanceA) + parseFloat(balanceB);

        expect(totalBalance).toBeCloseTo(parseFloat(INITIAL_BALANCE) * 2, 2);

        console.log(
          `Final balances: A=${balanceA}, B=${balanceB}, Total=${totalBalance}`,
        );
      },
      TIMEOUT,
    );

    it(
      'should handle rapid A↔B exchanges without deadlock',
      async () => {
        // More aggressive test - 50 parallel transactions
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < 25; i++) {
          promises.push(
            transactionsService.createTransferTx(accountA, accountB, '1.00', {
              rapid: true,
              direction: 'A->B',
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountB, accountA, '1.00', {
              rapid: true,
              direction: 'B->A',
            }),
          );
        }

        const results = await Promise.allSettled(promises);

        const deadlockErrors = results.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);
        console.log(
          `Case 1 (rapid): No deadlocks in ${promises.length} parallel transfers`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Case 2: A → C, B → C, D → C (many sources → one recipient)
   *
   * All transactions compete for the C account lock.
   */
  describe('Case 2: Multiple sources to single destination (A,B,D → C)', () => {
    beforeEach(async () => {
      await resetBalances();
    });

    it(
      'should handle multiple transfers to same account without deadlock',
      async () => {
        const iterations = 10;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          promises.push(
            transactionsService.createTransferTx(
              accountA,
              accountC,
              TRANSFER_AMOUNT,
              { test: 'A->C', iteration: i },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountB,
              accountC,
              TRANSFER_AMOUNT,
              { test: 'B->C', iteration: i },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountD,
              accountC,
              TRANSFER_AMOUNT,
              { test: 'D->C', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 2: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check for the absence of deadlock
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Check that the total sum did not change
        const balances = await Promise.all([
          getBalance(accountA),
          getBalance(accountB),
          getBalance(accountC),
          getBalance(accountD),
        ]);

        const totalBalance = balances.reduce(
          (sum, b) => sum + parseFloat(b),
          0,
        );

        expect(totalBalance).toBeCloseTo(parseFloat(INITIAL_BALANCE) * 4, 2);

        console.log(
          `Final balances: A=${balances[0]}, B=${balances[1]}, C=${balances[2]}, D=${balances[3]}`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Case 3: A → B, B → C, C → A (circular transfer)
   *
   * Circular dependency - classic scenario for deadlock.
   * ORDER BY id deadlock is not possible.
   */
  describe('Case 3: Circular transfers (A → B → C → A)', () => {
    beforeEach(async () => {
      await resetBalances();
    });

    it(
      'should handle circular transfers without deadlock',
      async () => {
        const iterations = 10;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          promises.push(
            transactionsService.createTransferTx(
              accountA,
              accountB,
              TRANSFER_AMOUNT,
              { test: 'A->B', iteration: i },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountB,
              accountC,
              TRANSFER_AMOUNT,
              { test: 'B->C', iteration: i },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountC,
              accountA,
              TRANSFER_AMOUNT,
              { test: 'C->A', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 3: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check for the absence of deadlock
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Check that the total sum did not change
        const balances = await Promise.all([
          getBalance(accountA),
          getBalance(accountB),
          getBalance(accountC),
        ]);

        const totalBalance = balances.reduce(
          (sum, b) => sum + parseFloat(b),
          0,
        );

        expect(totalBalance).toBeCloseTo(parseFloat(INITIAL_BALANCE) * 3, 2);

        console.log(
          `Final balances: A=${balances[0]}, B=${balances[1]}, C=${balances[2]}`,
        );
      },
      TIMEOUT,
    );

    it(
      'should handle aggressive circular transfers without deadlock',
      async () => {
        // Very aggressive test - 100 parallel circular transactions
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < 33; i++) {
          promises.push(
            transactionsService.createTransferTx(
              accountA,
              accountB,
              '1.00',
              {},
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountB,
              accountC,
              '1.00',
              {},
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              accountC,
              accountA,
              '1.00',
              {},
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const deadlockErrors = results.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);
        console.log(
          `Case 3 (aggressive): No deadlocks in ${promises.length} parallel circular transfers`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Bonus: Combined stress test
   *
   * All three patterns simultaneously.
   */
  describe('Bonus: Combined stress test', () => {
    beforeEach(async () => {
      await resetBalances();
    });

    it(
      'should handle all patterns simultaneously without deadlock',
      async () => {
        const promises: Promise<unknown>[] = [];

        // Case 1: A ↔ B
        for (let i = 0; i < 5; i++) {
          promises.push(
            transactionsService.createTransferTx(accountA, accountB, '1.00', {
              case: 1,
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountB, accountA, '1.00', {
              case: 1,
            }),
          );
        }

        // Case 2: many → C
        for (let i = 0; i < 5; i++) {
          promises.push(
            transactionsService.createTransferTx(accountA, accountC, '1.00', {
              case: 2,
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountB, accountC, '1.00', {
              case: 2,
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountD, accountC, '1.00', {
              case: 2,
            }),
          );
        }

        // Case 3: circular
        for (let i = 0; i < 5; i++) {
          promises.push(
            transactionsService.createTransferTx(accountA, accountB, '1.00', {
              case: 3,
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountB, accountC, '1.00', {
              case: 3,
            }),
          );
          promises.push(
            transactionsService.createTransferTx(accountC, accountA, '1.00', {
              case: 3,
            }),
          );
        }

        console.log(
          `Combined stress test: ${promises.length} parallel transfers`,
        );

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Combined: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // The main thing - no deadlock
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // Check that the total sum was preserved
        const balances = await Promise.all([
          getBalance(accountA),
          getBalance(accountB),
          getBalance(accountC),
          getBalance(accountD),
        ]);

        const totalBalance = balances.reduce(
          (sum, b) => sum + parseFloat(b),
          0,
        );

        expect(totalBalance).toBeCloseTo(parseFloat(INITIAL_BALANCE) * 4, 2);

        console.log(
          `Final balances: A=${balances[0]}, B=${balances[1]}, C=${balances[2]}, D=${balances[3]}`,
        );
        console.log(
          `Total: ${totalBalance} (expected: ${parseFloat(INITIAL_BALANCE) * 4})`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Case 4: Incoming transfer + Outgoing transfer on the same account
   *
   * User2 sends money to User1.USD
   * User1 at the same time transfers from User1.USD to User3.USD
   *
   * Both want to lock User1.USD
   */
  describe('Case 4: Incoming + Outgoing on same account', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle incoming transfer while owner transfers out',
      async () => {
        const iterations = 20;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User2 → User1.USD (incoming)
          promises.push(
            transactionsService.createTransferTx(
              user2AccountUSD,
              user1AccountUSD,
              '5.00',
              { test: 'incoming', iteration: i },
            ),
          );

          // User1.USD → User3.USD (outgoing from the owner)
          promises.push(
            transactionsService.createTransferTx(
              user1AccountUSD,
              user3AccountUSD,
              '5.00',
              { test: 'outgoing', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 4: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check for the absence of deadlock
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // The total sum should be preserved
        const balances = await Promise.all([
          getBalance(user1AccountUSD),
          getBalance(user2AccountUSD),
          getBalance(user3AccountUSD),
        ]);

        const totalBalance = balances.reduce(
          (sum, b) => sum + parseFloat(b),
          0,
        );

        expect(totalBalance).toBeCloseTo(parseFloat(INITIAL_BALANCE) * 3, 2);

        console.log(
          `Final balances: User1.USD=${balances[0]}, User2.USD=${balances[1]}, User3.USD=${balances[2]}`,
        );
      },
      TIMEOUT,
    );

    it(
      'should handle multiple incoming while owner transfers out rapidly',
      async () => {
        const promises: Promise<unknown>[] = [];

        // Many incoming from different users
        for (let i = 0; i < 15; i++) {
          promises.push(
            transactionsService.createTransferTx(
              user2AccountUSD,
              user1AccountUSD,
              '1.00',
              { from: 'user2' },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              user3AccountUSD,
              user1AccountUSD,
              '1.00',
              { from: 'user3' },
            ),
          );
          // The owner tries to withdraw
          promises.push(
            transactionsService.createTransferTx(
              user1AccountUSD,
              user2AccountUSD,
              '1.00',
              { from: 'user1-out' },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const deadlockErrors = results.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);
        console.log(
          `Case 4 (rapid): No deadlocks in ${promises.length} parallel operations`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Case 5: Exchange + Transfer parallel
   *
   * User1 makes Exchange USD → EUR
   * User2 sends money to User1.USD (or User1.EUR)
   *
   * Exchange locks: User1.USD, User1.EUR, System.USD, System.EUR
   * Transfer locks: User2.USD, User1.USD
   *
   * The total resource: User1.USD
   */
  describe('Case 5: Exchange + Transfer on same account', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle exchange while receiving transfer on source account',
      async () => {
        // Minimum iterations - system accounts serialize all exchanges
        const iterations = 3;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1 makes Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User2 sends USD to User1.USD (conflict with source account exchange)
          promises.push(
            transactionsService.createTransferTx(
              user2AccountUSD,
              user1AccountUSD,
              '10.00',
              { test: 'transfer-to-source', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 5a: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check for the absence of DEADLOCK (lock_timeout errors are allowed)
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        if (rejected.length > 0) {
          console.log(
            'Rejected (expected lock_timeout):',
            rejected
              .slice(0, 3)
              .map((r) =>
                r.status === 'rejected' ? (r.reason as Error).message : '',
              ),
          );
        }
      },
      TIMEOUT,
    );

    it(
      'should handle exchange while receiving transfer on destination account',
      async () => {
        const iterations = 3;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1 makes Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User2 sends EUR to User1.EUR (conflict with destination account exchange)
          promises.push(
            transactionsService.createTransferTx(
              user2AccountEUR,
              user1AccountEUR,
              '10.00',
              { test: 'transfer-to-dest', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 5b: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);
      },
      TIMEOUT,
    );

    it(
      'should handle exchange while owner transfers FROM same account',
      async () => {
        const iterations = 3;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1 makes Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User1 transfers USD to someone (same source as exchange!)
          promises.push(
            transactionsService.createTransferTx(
              user1AccountUSD,
              user2AccountUSD,
              '10.00',
              { test: 'transfer-from-source', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 5c: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);
      },
      TIMEOUT,
    );
  });

  /**
   * Case 6: Two Exchanges simultaneously (different users)
   *
   * User1 makes Exchange USD → EUR
   * User2 makes Exchange EUR → USD
   *
   * Both compete for system accounts (System.USD, System.EUR)
   *
   * IMPORTANT: System accounts are the "bottleneck", all exchanges
   * are serialized through them. This is not a deadlock, but a contention.
   * lock_timeout = 5s will help reject requests instead of infinite waiting.
   */
  describe('Case 6: Multiple exchanges competing for system accounts', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle opposite exchanges without deadlock',
      async () => {
        // Minimum iterations - all exchanges are serialized through system accounts
        const iterations = 2;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1: USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '100.00',
              { user: 'user1', direction: 'USD->EUR', iteration: i },
            ),
          );

          // User2: EUR → USD (opposite direction!)
          promises.push(
            transactionsService.createExchangeTx(
              user2AccountEUR,
              user2AccountUSD,
              '100.00',
              { user: 'user2', direction: 'EUR->USD', iteration: i },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 6: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Check for the absence of DEADLOCK (lock_timeout errors - expected)
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        if (rejected.length > 0) {
          console.log(
            'Rejected (expected lock_timeout):',
            rejected
              .slice(0, 3)
              .map((r) =>
                r.status === 'rejected' ? (r.reason as Error).message : '',
              ),
          );
        }
      },
      TIMEOUT,
    );

    it(
      'should handle three users exchanging simultaneously',
      async () => {
        // Minimum - 1 exchange from each of 3 users = 3 operations
        const iterations = 1;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1: USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { user: 'user1' },
            ),
          );

          // User2: EUR → USD
          promises.push(
            transactionsService.createExchangeTx(
              user2AccountEUR,
              user2AccountUSD,
              '50.00',
              { user: 'user2' },
            ),
          );

          // User3: USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user3AccountUSD,
              user3AccountEUR,
              '50.00',
              { user: 'user3' },
            ),
          );
        }

        const results = await Promise.allSettled(promises);

        const deadlockErrors = results.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        console.log(
          `Case 6 (3 users): ${fulfilled.length}/${promises.length} succeeded, no deadlocks`,
        );
      },
      TIMEOUT,
    );
  });

  /**
   * Case 7: Combined stress test with Exchange
   *
   * Transfer + Exchange together
   * Reduced number of operations due to contention on system accounts
   */
  describe('Case 7: Ultimate stress test (Transfer + Exchange)', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle all operations mixed without deadlock',
      async () => {
        const promises: Promise<unknown>[] = [];

        // Transfers between users (USD) - fast, can be more
        for (let i = 0; i < 5; i++) {
          promises.push(
            transactionsService.createTransferTx(
              user1AccountUSD,
              user2AccountUSD,
              '5.00',
              { type: 'transfer', dir: '1->2' },
            ),
          );
          promises.push(
            transactionsService.createTransferTx(
              user2AccountUSD,
              user1AccountUSD,
              '5.00',
              { type: 'transfer', dir: '2->1' },
            ),
          );
        }

        // Transfers between users (EUR)
        for (let i = 0; i < 3; i++) {
          promises.push(
            transactionsService.createTransferTx(
              user1AccountEUR,
              user2AccountEUR,
              '5.00',
              { type: 'transfer-eur', dir: '1->2' },
            ),
          );
        }

        // Exchanges - minimum due to contention on system accounts
        // Only 2 exchange operations - they are serialized through system accounts
        promises.push(
          transactionsService.createExchangeTx(
            user1AccountUSD,
            user1AccountEUR,
            '20.00',
            { type: 'exchange', user: 1 },
          ),
        );
        promises.push(
          transactionsService.createExchangeTx(
            user2AccountEUR,
            user2AccountUSD,
            '20.00',
            { type: 'exchange', user: 2 },
          ),
        );

        console.log(
          `Ultimate stress test: ${promises.length} parallel operations`,
        );

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Ultimate: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // The main thing - no deadlock!
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // Show error types (lock_timeout expected, deadlock - no)
        if (rejected.length > 0) {
          const errorTypes = new Map<string, number>();
          for (const r of rejected) {
            if (r.status === 'rejected') {
              const msg = (r.reason as Error).message || 'unknown';
              const key = msg.substring(0, 50);
              errorTypes.set(key, (errorTypes.get(key) || 0) + 1);
            }
          }
          console.log(
            'Error types (lock_timeout expected):',
            Object.fromEntries(errorTypes),
          );
        }
      },
      TIMEOUT,
    );
  });
});
