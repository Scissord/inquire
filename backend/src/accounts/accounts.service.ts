import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { IAccount } from './accounts.model';

@Injectable()
export class AccountsService {
  constructor(private readonly pgService: PgService) {}

  async create(
    client: PgPoolClient,
    user_id: string,
    currency: string,
    balance: number,
  ) {
    const result = await client.query<IAccount>(
      `
        INSERT INTO app.accounts (
          user_id,
          currency,
          balance
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          user_id,
          currency,
          balance,
          created_at
      `,
      [user_id, currency, balance],
    );

    return result.rows[0] ?? null;
  }

  private readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

  async get(currentUserId: string, currency?: string) {
    const params: string[] = [currentUserId, this.SYSTEM_USER_ID];
    let currencyFilter = '';

    if (currency) {
      params.push(currency);
      currencyFilter = `AND t1.currency = $${params.length}`;
    }

    const result = await this.pgService.query<IAccount[]>(
      `
        SELECT
          t1.id,
          t2.id as user_id,
          t1.currency,
          t1.balance,
          t1.created_at,
          t2.email as user_email
        FROM app.accounts t1
        JOIN auth.users t2 ON t2.id = t1.user_id
        WHERE t2.deleted_at IS NULL
          AND t1.user_id != $1
          AND t1.user_id != $2
          ${currencyFilter}
        ORDER BY t1.created_at DESC
      `,
      params,
    );

    return result.rows ?? [];
  }

  async find(id: string) {
    const result = await this.pgService.query<IAccount>(
      `
        SELECT
          id,
          user_id,
          currency,
          balance,
          created_at
        FROM app.accounts
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByUserId(user_id: string) {
    const result = await this.pgService.query<IAccount>(
      `
        SELECT
          id,
          user_id,
          currency,
          balance,
          created_at
        FROM app.accounts
        WHERE user_id = $1
      `,
      [user_id],
    );

    return result.rows ?? null;
  }
}
