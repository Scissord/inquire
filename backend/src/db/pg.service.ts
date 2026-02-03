import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pg from 'pg';

type QueryResult<T> = { rows: T[]; rowCount: number };

export interface PgPoolClient {
  query<T>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<QueryResult<T>>;
  release(): void;
}

interface PgPool {
  query<T>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<QueryResult<T>>;
  connect(): Promise<PgPoolClient>;
  end(): Promise<void>;
}

type PgPoolConfig = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

const PgPoolCtor = (
  pg as unknown as { Pool: new (config: PgPoolConfig) => PgPool }
).Pool;

@Injectable()
export class PgService implements OnModuleDestroy {
  private readonly pool: PgPool;

  constructor(private readonly configService: ConfigService) {
    const sslEnabled = this.configService.get<boolean>('DB_SSL') ?? false;

    this.pool = new PgPoolCtor({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      user: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    }) as unknown as PgPool;
  }

  query<T>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query(text, params);
  }

  getClient(): Promise<PgPoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
