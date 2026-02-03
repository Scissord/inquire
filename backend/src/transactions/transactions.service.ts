import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { ITransaction } from './transactions.model';
import { LedgerService } from 'src/ledger/ledger.service';

// ALTER TABLE app.accounts
// ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

// SET LOCAL lock_timeout = '5s';

// 1 test
// const sender = 'A';
// const receiver = 'B';

// const requests = Array.from({ length: 10 }).map(() =>
//   service.createTransferTx(sender, receiver, '10.00', {}),
// );

// await Promise.all(requests);

// 2 test
// await Promise.all([
//   service.createTransferTx('A', 'B', '10.00', {}),
//   service.createTransferTx('B', 'A', '5.00', {}),
// ]);

@Injectable()
export class TransactionsService {
  constructor(
    private readonly pgService: PgService,
    private readonly ledgersService: LedgerService,
  ) {}

  // opus 4.5
  async createTransferTx(
    sender_account_id: string,
    receiver_account_id: string,
    amount: string, // строка!
    metadata: Record<string, unknown>,
  ) {
    const client = await this.pgService.getClient();

    try {
      await client.query('BEGIN');

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
        throw new Error('Account not found');
      }

      const sender = accounts.find((a) => a.id === sender_account_id)!;
      const receiver = accounts.find((a) => a.id === receiver_account_id)!;

      // 2️⃣ Проверки
      if (sender.currency !== receiver.currency) {
        throw new Error('Currency mismatch');
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
        throw new Error('Insufficient funds');
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

  async createExchangeTx(account_id: string, metadata: Record<any, unknown>) {
    const client = await this.pgService.getClient();

    let transaction: ITransaction | null = null;
    try {
      await client.query('BEGIN');

      // 1️⃣ Lock accounts
      // защита от double-spending
      // конкурирующие запросы ждут
      // SELECT * FROM accounts
      // WHERE id IN (...)
      // FOR UPDATE;
      await client.query(
        `
          SELECT * FROM app.accounts
          WHERE id = $1
          FOR UPDATE;
        `,
        [account_id],
      );

      // 2️⃣ Проверяешь баланс
      // хватает ли денег
      // валюта совпадает
      // аккаунты существуют
      // 3️⃣ Создаёшь transaction (сразу completed)
      transaction = await this.create(client, 'exchange', metadata);
      // 4️⃣ Создаёшь ledger entries
      // Минимум 2 записи:
      // INSERT INTO ledger (transaction_id, account_id, amount)
      // VALUES
      //   (txId, fromAccountId, -50.00),
      //   (txId, toAccountId, +50.00);
      // SUM(amount) === 0
      // 5️⃣ Обновляешь balances
      // UPDATE accounts
      // SET balance = balance - 50
      // WHERE id = fromAccountId;

      // UPDATE accounts
      // SET balance = balance + 50
      // WHERE id = toAccountId;

      // Проверка (логическая, не обязательно SQL):
      await this.ledgersService.create(client, transaction.id, 'account1', 100);

      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return transaction;
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

  async get(limit = 10, page = 1): Promise<ITransaction[]> {
    if (page == null || page == undefined) page = 1;
    if (limit == null || limit == undefined) limit = 10;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await this.pgService.query<ITransaction>(
      `
        SELECT
          id,
          type,
          status,
          created_at,
          metadata
        FROM app.transactions
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
      `,
      [limit, offset],
    );

    return result.rows ?? [];
  }
}
