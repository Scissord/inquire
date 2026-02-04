import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { ITransaction } from './transactions.model';
import { LedgerService } from 'src/ledger/ledger.service';

// ALTER TABLE app.accounts
// ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

// System user ID (defined in migration 006)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly pgService: PgService,
    private readonly ledgersService: LedgerService,
  ) {}

  // Cache for system exchange accounts (loaded from DB)
  private systemExchangeAccounts: Record<string, string> | null = null;

  /**
   * Get system exchange account ID for a currency.
   * Loads from DB on first call, then caches.
   */
  private async getSystemExchangeAccount(
    currency: string,
  ): Promise<string | null> {
    if (!this.systemExchangeAccounts) {
      const { rows } = await this.pgService.query<{
        id: string;
        currency: string;
      }>(
        `
          SELECT id, currency
          FROM app.accounts
          WHERE user_id = $1;
        `,
        [SYSTEM_USER_ID],
      );

      this.systemExchangeAccounts = {};
      for (const row of rows) {
        this.systemExchangeAccounts[row.currency] = row.id;
      }
    }

    return this.systemExchangeAccounts[currency] ?? null;
  }

  async get(
    user_id: string,
    limit = 10,
    page = 1,
    type: 'transfer' | 'exchange' | undefined,
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    if (page == null || page == undefined) page = 1;
    if (limit == null || limit == undefined) limit = 10;
    const safeLimit = Math.max(1, Number(limit));
    const safePage = Math.max(1, Number(page));
    const offset = (safePage - 1) * safeLimit;

    const allowedTypes = ['transfer', 'exchange'] as const;
    if (type && !allowedTypes.includes(type)) {
      throw new BadRequestException('Invalid transaction type');
    }

    // NOTE:
    // app.transactions doesn't have user_id. A transaction "belongs" to a user
    // if there is at least one ledger entry for one of user's accounts.
    const conditions: string[] = [
      `
        EXISTS (
          SELECT 1
          FROM app.ledger l
          JOIN app.accounts a ON a.id = l.account_id
          WHERE l.transaction_id = t.id
            AND a.user_id = $1
        )
      `,
    ];
    const valuesBase: unknown[] = [user_id];

    if (type) {
      conditions.push(`t.type = $2`);
      valuesBase.push(type);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const valuesData = [...valuesBase, safeLimit, offset];
    const limitParam = `$${valuesBase.length + 1}`;
    const offsetParam = `$${valuesBase.length + 2}`;

    const result = await this.pgService.query<ITransaction>(
      `
        SELECT
          t.id,
          t.type,
          t.status,
          t.created_at,
          t.metadata
        FROM app.transactions t
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      valuesData,
    );

    const count_result = await this.pgService.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM app.transactions t
        ${whereClause}
      `,
      valuesBase,
    );

    return {
      transactions: result.rows ?? [],
      total: parseInt(count_result.rows[0]?.count || '0', 10),
    };
  }

  async createTransferTx(
    sender_account_id: string,
    receiver_account_id: string,
    amount: string, // строка!
    metadata: Record<string, unknown>,
  ) {
    const client = await this.pgService.getClient();

    try {
      await client.query('BEGIN');

      // Устанавливаем таймаут на блокировки (5 секунд)
      await client.query("SET LOCAL lock_timeout = '5s'");

      // 1️⃣ Блокируем аккаунты (фиксированный порядок)
      const { rows: accounts } = await client.query<{
        id: string;
        currency: string;
        balance: string; // numeric -> string
      }>(
        `
          SELECT
            id,
            currency,
            balance
          FROM app.accounts
          WHERE id IN ($1, $2)
          ORDER BY id
          FOR UPDATE;
        `,
        [sender_account_id, receiver_account_id],
      );

      if (accounts.length !== 2) {
        throw new NotFoundException('Account not found');
      }

      const sender = accounts.find((a) => a.id === sender_account_id)!;
      const receiver = accounts.find((a) => a.id === receiver_account_id)!;

      // 2️⃣ Проверки
      if (sender.currency !== receiver.currency) {
        throw new BadRequestException('Currency mismatch');
      }

      // balance и amount сравниваем в SQL, а не в JS
      const { rowCount } = await client.query(
        `
          SELECT 1
          WHERE $1::numeric <= $2::numeric;
        `,
        [amount, sender.balance],
      );

      if (rowCount === 0) {
        throw new BadRequestException('Insufficient funds');
      }

      // 3️⃣ Transaction
      const {
        rows: [transaction],
      } = await client.query<ITransaction>(
        `
          INSERT INTO app.transactions (
            type,
            status,
            metadata
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            type,
            status,
            created_at,
            metadata;
        `,
        ['transfer', 'completed', metadata],
      );

      // 4️⃣ Ledger
      await client.query(
        `
          INSERT INTO app.ledger (
            transaction_id,
            account_id,
            amount
          )
          VALUES
            ($1, $2, -$3::numeric),
            ($1, $4,  $3::numeric);
        `,
        [transaction.id, sender_account_id, amount, receiver_account_id],
      );

      // 5️⃣ Балансы
      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance - $2::numeric
          WHERE id = $1;
        `,
        [sender_account_id, amount],
      );

      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance + $2::numeric
          WHERE id = $1;
        `,
        [receiver_account_id, amount],
      );

      await client.query('COMMIT');

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Exchange currency between user's own wallets
   *
   * Business logic:
   * 1. User converts X amount from source currency to destination currency
   * 2. Creates 4 ledger entries to maintain sum = 0 per currency:
   *    - Source currency: user -X, system +X (sum = 0)
   *    - Dest currency: system -Y, user +Y (sum = 0) where Y = X * rate
   * 3. Accounts locked in consistent order by ID to prevent deadlock
   */
  async createExchangeTx(
    source_account_id: string,
    destination_account_id: string,
    amount: string,
    metadata: Record<string, unknown>,
  ) {
    const client = await this.pgService.getClient();

    try {
      await client.query('BEGIN');

      // Устанавливаем таймаут на блокировки (5 секунд)
      // Если не получим лок за это время - откат и retry на клиенте
      await client.query("SET LOCAL lock_timeout = '5s'");

      // 1️⃣ Получаем аккаунты пользователя (без блокировки пока)
      const { rows: userAccounts } = await client.query<{
        id: string;
        user_id: string;
        currency: string;
        balance: string;
      }>(
        `
          SELECT
            id,
            user_id,
            currency,
            balance
          FROM app.accounts
          WHERE id IN ($1, $2);
        `,
        [source_account_id, destination_account_id],
      );

      if (userAccounts.length !== 2) {
        throw new NotFoundException('One or both accounts not found');
      }

      const sourceAccount = userAccounts.find(
        (a) => a.id === source_account_id,
      )!;
      const destAccount = userAccounts.find(
        (a) => a.id === destination_account_id,
      )!;

      // Проверка: это должны быть разные валюты
      if (sourceAccount.currency === destAccount.currency) {
        throw new BadRequestException(
          'Exchange requires different currencies. Use transfer for same currency.',
        );
      }

      // Проверка: аккаунты должны принадлежать одному пользователю
      if (sourceAccount.user_id !== destAccount.user_id) {
        throw new BadRequestException(
          'Exchange only allowed between your own accounts',
        );
      }

      // 2️⃣ Получаем курс обмена
      const { rows: rateRows } = await client.query<{
        rate: string;
      }>(
        `
          SELECT rate
          FROM app.exchange_rates
          WHERE from_currency = $1 AND to_currency = $2;
        `,
        [sourceAccount.currency, destAccount.currency],
      );

      if (rateRows.length === 0) {
        throw new BadRequestException(
          `Exchange rate not found for ${sourceAccount.currency} -> ${destAccount.currency}`,
        );
      }

      const rate = rateRows[0].rate;

      // 3️⃣ Определяем системные аккаунты (из БД, с кэшированием)
      const systemSourceAccount = await this.getSystemExchangeAccount(
        sourceAccount.currency,
      );
      const systemDestAccount = await this.getSystemExchangeAccount(
        destAccount.currency,
      );

      if (!systemSourceAccount || !systemDestAccount) {
        throw new BadRequestException(
          `System exchange account not configured for ${sourceAccount.currency} or ${destAccount.currency}`,
        );
      }

      // 4️⃣ Блокируем ВСЕ 4 аккаунта в фиксированном порядке (по ID)
      // Это предотвращает deadlock при параллельных операциях
      const allAccountIds = [
        source_account_id,
        destination_account_id,
        systemSourceAccount,
        systemDestAccount,
      ].sort();

      const { rows: lockedAccounts } = await client.query<{
        id: string;
        currency: string;
        balance: string;
      }>(
        `
          SELECT id, currency, balance
          FROM app.accounts
          WHERE id = ANY($1::uuid[])
          ORDER BY id
          FOR UPDATE;
        `,
        [allAccountIds],
      );

      if (lockedAccounts.length !== 4) {
        throw new NotFoundException('System exchange accounts not found');
      }

      // Перечитываем балансы после блокировки
      const lockedSource = lockedAccounts.find(
        (a) => a.id === source_account_id,
      )!;
      const lockedSystemDest = lockedAccounts.find(
        (a) => a.id === systemDestAccount,
      )!;

      // 5️⃣ Проверка баланса пользователя
      const { rowCount: hasFunds } = await client.query(
        `
          SELECT 1
          WHERE $1::numeric <= $2::numeric;
        `,
        [amount, lockedSource.balance],
      );

      if (hasFunds === 0) {
        throw new BadRequestException('Insufficient funds');
      }

      // 6️⃣ Рассчитываем сумму в целевой валюте
      const { rows: convertedRows } = await client.query<{
        converted_amount: string;
      }>(
        `
          SELECT ROUND($1::numeric * $2::numeric, 2) as converted_amount;
        `,
        [amount, rate],
      );
      const convertedAmount = convertedRows[0].converted_amount;

      // Проверка: достаточно ли у системы средств в целевой валюте
      const { rowCount: systemHasFunds } = await client.query(
        `
          SELECT 1
          WHERE $1::numeric <= $2::numeric;
        `,
        [convertedAmount, lockedSystemDest.balance],
      );

      if (systemHasFunds === 0) {
        throw new BadRequestException(
          'Exchange temporarily unavailable. Insufficient liquidity.',
        );
      }

      // 7️⃣ Создаём транзакцию
      const {
        rows: [transaction],
      } = await client.query<ITransaction>(
        `
          INSERT INTO app.transactions (
            type,
            status,
            metadata
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            type,
            status,
            created_at,
            metadata;
        `,
        [
          'exchange',
          'completed',
          {
            ...metadata,
            source_currency: sourceAccount.currency,
            destination_currency: destAccount.currency,
            source_amount: amount,
            destination_amount: convertedAmount,
            rate,
          },
        ],
      );

      // 8️⃣ Создаём 4 записи в ledger
      // Source currency side: user -amount, system +amount (sum = 0)
      // Dest currency side: system -converted, user +converted (sum = 0)
      await client.query(
        `
          INSERT INTO app.ledger (
            transaction_id,
            account_id,
            amount
          )
          VALUES
            ($1, $2, -$3::numeric),
            ($1, $4,  $3::numeric),
            ($1, $5, -$6::numeric),
            ($1, $7,  $6::numeric);
        `,
        [
          transaction.id,
          source_account_id, // user source: -amount
          amount,
          systemSourceAccount, // system source: +amount
          systemDestAccount, // system dest: -converted
          convertedAmount,
          destination_account_id, // user dest: +converted
        ],
      );

      // 9️⃣ Обновляем балансы всех 4 аккаунтов
      // User source: -amount
      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance - $2::numeric
          WHERE id = $1;
        `,
        [source_account_id, amount],
      );

      // System source: +amount
      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance + $2::numeric
          WHERE id = $1;
        `,
        [systemSourceAccount, amount],
      );

      // System dest: -converted
      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance - $2::numeric
          WHERE id = $1;
        `,
        [systemDestAccount, convertedAmount],
      );

      // User dest: +converted
      await client.query(
        `
          UPDATE app.accounts
          SET balance = balance + $2::numeric
          WHERE id = $1;
        `,
        [destination_account_id, convertedAmount],
      );

      await client.query('COMMIT');

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async create(
    client: PgPoolClient,
    type: string,
    metadata: Record<any, unknown>,
  ) {
    const result = await client.query<ITransaction>(
      `
        INSERT INTO app.transactions (
          type,
          status,
          metadata
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [type, 'success', metadata],
    );

    return result.rows[0] ?? null;
  }
}
