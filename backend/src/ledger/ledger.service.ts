import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { ITransaction } from './ledger.model';

@Injectable()
export class LedgerService {
  constructor(private readonly pgService: PgService) {}
  async create(
    client: PgPoolClient,
    transaction_id: string,
    account_id: string,
    amount: number,
  ) {
    const result = await client.query<ITransaction>(
      `
        INSERT INTO app.ledger (
          transaction_id,
          account_id,
          amount
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [transaction_id, account_id, amount],
    );

    return result.rows[0] ?? null;
  }
}
