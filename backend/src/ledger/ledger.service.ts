import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { ITransaction } from './ledger.model';

@Injectable()
export class LedgerService {
  constructor(private readonly pgService: PgService) {}
  async create(
    client: PgPoolClient,
    type: string,
    metadata: Record<any, unknown>,
  ) {
    const result = await client.query<ITransaction>(
      `
        INSERT INTO app.ledger (
          transaction_id,
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
}
