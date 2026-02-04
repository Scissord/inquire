/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TransactionsService } from '../src/transactions/transactions.service';
import { PgService } from '../src/db/pg.service';

// npm run test:e2e -- transactions-deadlock

/**
 * Deadlock тесты для TransactionsService
 *
 * Тестируем createTransferTx и createExchangeTx на отсутствие deadlock
 * при параллельных операциях благодаря ORDER BY id в SELECT FOR UPDATE.
 *
 * ВАЖНО: Для запуска нужна работающая база данных с:
 * - Тестовыми аккаунтами
 * - Таблицей exchange_rates с курсами USD/EUR
 * - Системными exchange аккаунтами
 */
describe('TransactionsService Deadlock Tests (e2e)', () => {
  let app: INestApplication;
  let transactionsService: TransactionsService;
  let pgService: PgService;

  // Тестовые аккаунты User 1 (будут созданы в beforeAll)
  let user1AccountUSD: string;
  let user1AccountEUR: string;

  // Тестовые аккаунты User 2
  let user2AccountUSD: string;
  let user2AccountEUR: string;

  // Тестовые аккаунты User 3
  let user3AccountUSD: string;
  let user3AccountEUR: string;

  let testUser1Id: string;
  let testUser2Id: string;
  let testUser3Id: string;

  // Алиасы для старых тестов (совместимость)
  let accountA: string;
  let accountB: string;
  let accountC: string;
  let accountD: string;

  const INITIAL_BALANCE = '10000.00';
  const TRANSFER_AMOUNT = '10.00';
  const TIMEOUT = 120000; // 120 секунд на тест (увеличено для exchange)

  async function setupTestData() {
    // Создаём тестовых пользователей
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

    // User 1: USD + EUR аккаунты
    user1AccountUSD = await createTestAccount(testUser1Id, 'USD');
    user1AccountEUR = await createTestAccount(testUser1Id, 'EUR');

    // User 2: USD + EUR аккаунты
    user2AccountUSD = await createTestAccount(testUser2Id, 'USD');
    user2AccountEUR = await createTestAccount(testUser2Id, 'EUR');

    // User 3: USD + EUR аккаунты
    user3AccountUSD = await createTestAccount(testUser3Id, 'USD');
    user3AccountEUR = await createTestAccount(testUser3Id, 'EUR');

    // Алиасы для старых тестов (все USD для совместимости)
    accountA = user1AccountUSD;
    accountB = user2AccountUSD;
    accountC = user3AccountUSD;
    accountD = await createTestAccount(testUser1Id, 'USD'); // дополнительный USD

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

    // Удаляем в правильном порядке (учитывая foreign keys)
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

    // Создаём тестового пользователя и аккаунты
    await setupTestData();
  }, TIMEOUT);

  afterAll(async () => {
    // Очищаем тестовые данные
    await cleanupTestData();
    await app.close();
  }, TIMEOUT);

  /**
   * Кейс 1: A → B и B → A (одновременно)
   *
   * Классический сценарий для deadlock, если блокировки не упорядочены.
   * С ORDER BY id deadlock невозможен.
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

        // Все транзакции должны завершиться без deadlock
        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        console.log(
          `Case 1: ${fulfilled.length} succeeded, ${rejected.length} failed`,
        );

        // Проверяем, что не было deadlock ошибок
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Балансы должны быть корректными (сумма не изменилась)
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
        // Более агрессивный тест - 50 параллельных транзакций
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
   * Кейс 2: A → C, B → C, D → C (много источников → один получатель)
   *
   * Все транзакции конкурируют за блокировку аккаунта C.
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

        // Проверяем отсутствие deadlock
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Проверяем, что общая сумма не изменилась
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
   * Кейс 3: A → B, B → C, C → A (циклический перевод)
   *
   * Циклическая зависимость - классический сценарий для deadlock.
   * С ORDER BY id deadlock невозможен.
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

        // Проверяем отсутствие deadlock
        for (const result of rejected) {
          if (result.status === 'rejected') {
            const errorMessage =
              (result.reason as Error).message?.toLowerCase() ?? '';
            expect(errorMessage).not.toContain('deadlock');
          }
        }

        // Проверяем, что общая сумма не изменилась
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
        // Очень агрессивный тест - 100 параллельных циклических транзакций
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
   * Бонус: Комбинированный стресс-тест
   *
   * Все три паттерна одновременно.
   */
  describe('Bonus: Combined stress test', () => {
    beforeEach(async () => {
      await resetBalances();
    });

    it(
      'should handle all patterns simultaneously without deadlock',
      async () => {
        const promises: Promise<unknown>[] = [];

        // Кейс 1: A ↔ B
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

        // Кейс 2: многие → C
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

        // Кейс 3: циклический
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

        // Главное - нет deadlock
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // Проверяем сохранение общей суммы
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
   * Кейс 4: Входящий перевод + Исходящий перевод на том же аккаунте
   *
   * User2 кидает деньги на User1.USD
   * User1 в это время переводит с User1.USD на User3.USD
   *
   * Оба хотят заблокировать User1.USD
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
          // User2 → User1.USD (входящий)
          promises.push(
            transactionsService.createTransferTx(
              user2AccountUSD,
              user1AccountUSD,
              '5.00',
              { test: 'incoming', iteration: i },
            ),
          );

          // User1.USD → User3.USD (исходящий от владельца)
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

        // Проверяем отсутствие deadlock
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // Общая сумма должна сохраниться
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

        // Много входящих от разных пользователей
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
          // Владелец пытается вывести
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
   * Кейс 5: Exchange + Transfer параллельно
   *
   * User1 делает Exchange USD → EUR
   * User2 кидает деньги на User1.USD (или User1.EUR)
   *
   * Exchange блокирует: User1.USD, User1.EUR, System.USD, System.EUR
   * Transfer блокирует: User2.USD, User1.USD
   *
   * Общий ресурс: User1.USD
   */
  describe('Case 5: Exchange + Transfer on same account', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle exchange while receiving transfer on source account',
      async () => {
        // Минимум итераций - системные аккаунты сериализуют все exchanges
        const iterations = 3;
        const promises: Promise<unknown>[] = [];

        for (let i = 0; i < iterations; i++) {
          // User1 делает Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User2 кидает USD на User1.USD (конфликт с source аккаунтом exchange)
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

        // Проверяем отсутствие DEADLOCK (lock_timeout ошибки допустимы)
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
          // User1 делает Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User2 кидает EUR на User1.EUR (конфликт с destination аккаунтом exchange)
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
          // User1 делает Exchange USD → EUR
          promises.push(
            transactionsService.createExchangeTx(
              user1AccountUSD,
              user1AccountEUR,
              '50.00',
              { test: 'exchange', iteration: i },
            ),
          );

          // User1 переводит USD кому-то (с того же source что и exchange!)
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
   * Кейс 6: Два Exchange одновременно (разные пользователи)
   *
   * User1 делает Exchange USD → EUR
   * User2 делает Exchange EUR → USD
   *
   * Оба конкурируют за системные аккаунты (System.USD, System.EUR)
   *
   * ВАЖНО: Системные аккаунты - это "бутылочное горлышко", все exchange
   * сериализуются через них. Это не deadlock, а contention.
   * lock_timeout = 5s поможет отклонить запросы вместо бесконечного ожидания.
   */
  describe('Case 6: Multiple exchanges competing for system accounts', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle opposite exchanges without deadlock',
      async () => {
        // Минимум итераций - все exchanges сериализуются через системные аккаунты
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

          // User2: EUR → USD (противоположное направление!)
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

        // Проверяем отсутствие DEADLOCK (lock_timeout ошибки - ожидаемы)
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
        // Минимум - 1 exchange от каждого из 3 пользователей = 3 операции
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
   * Кейс 7: Комбинированный стресс-тест с Exchange
   *
   * Transfer + Exchange все вместе
   * Уменьшено количество операций из-за contention на системных аккаунтах
   */
  describe('Case 7: Ultimate stress test (Transfer + Exchange)', () => {
    beforeEach(async () => {
      await resetBalances();
    }, TIMEOUT);

    it(
      'should handle all operations mixed without deadlock',
      async () => {
        const promises: Promise<unknown>[] = [];

        // Transfers между пользователями (USD) - быстрые, можно больше
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

        // Transfers между пользователями (EUR)
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

        // Exchanges - минимум из-за contention на системных аккаунтах
        // Только 2 exchange операции - они сериализуются через системные аккаунты
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

        // Главное - нет deadlock!
        const deadlockErrors = rejected.filter(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as Error).message?.toLowerCase().includes('deadlock'),
        );

        expect(deadlockErrors.length).toBe(0);

        // Показываем типы ошибок (lock_timeout ожидаем, deadlock - нет)
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
