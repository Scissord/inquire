import { Injectable } from '@nestjs/common';
import { PgPoolClient, PgService } from '../db/pg.service';
import type { IUser } from './users.model';

@Injectable()
export class UsersService {
  constructor(private readonly pgService: PgService) {}

  // 1. CREATE USER
  async create(client: PgPoolClient, email: string, password_hash: string) {
    const result = await client.query<IUser>(
      `
        INSERT INTO auth.users (
          email,
          password_hash
        )
        VALUES ($1, $2)
        RETURNING
          id,
          email,
          password_hash,
          created_at
      `,
      [email, password_hash],
    );

    return result.rows[0] ?? null;
  }

  // 2. FIND USER BY EMAIL
  async findByEmail(email: string) {
    const result = await this.pgService.query<IUser>(
      `
        SELECT
          id,
          email,
          password_hash,
          created_at
        FROM auth.users
        WHERE email = $1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  // 3. GET USER BY ID
  async findById(id: string) {
    const result = await this.pgService.query<IUser>(
      `
        SELECT
          id,
          email,
          password_hash,
          created_at
        FROM auth.users
        WHERE id = $1`,
      [id],
    );

    return result.rows[0] ?? null;
  }
}
