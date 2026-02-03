import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { ITransaction } from './transactions.model';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly pgService: PgService,
    private readonly ledgersService: LedgerService,
  ) {}

  async createTx(type: string, metadata: Record<any, unknown>) {
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

      // 2️⃣ Проверяешь баланс
      // хватает ли денег
      // валюта совпадает
      // аккаунты существуют

      // 3️⃣ Создаёшь transaction (сразу completed)
      transaction = await this.create(client, type, metadata);
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

      Проверка (логическая, не обязательно SQL):
      await this.ledgersService.create(client, metadata);

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
      [type, 'pending', metadata],
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
