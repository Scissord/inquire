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

  async get() {
    const result = await this.pgService.query<IAccount[]>(
      `
        SELECT
          id,
          user_id,
          currency,
          balance,
          created_at
        FROM app.accounts
      `,
      [],
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
}
