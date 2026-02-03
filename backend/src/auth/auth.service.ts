import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PgService } from '../db/pg.service';
import type { IUser } from '../users/users.model';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly pgService: PgService,
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Login a user
   * @param email - The email of the user
   * @param password - The password of the user
   * @returns The user
   */
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const password_valid = await bcrypt.compare(password, user.password_hash);

    if (!password_valid) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        access_token: await this.jwtService.signAsync({
          user_id: user.id,
          email: user.email,
          created_at: user.created_at,
        }),
      },
    };
  }

  /**
   * Register a new user
   * @param email - The email of the user
   * @param password - The password of the user
   * @returns The user
   */
  async registerTx(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const client = await this.pgService.getClient();
    let user: IUser | null = null;

    try {
      await client.query('BEGIN');

      user = await this.usersService.create(client, email, password_hash);
      if (!user) {
        throw new Error('Failed to create user');
      }

      await this.accountsService.create(client, user.id, 'USD', 1000);
      await this.accountsService.create(client, user.id, 'EUR', 500);

      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        access_token: await this.jwtService.signAsync({
          user_id: user.id,
          email: user.email,
          created_at: user.created_at,
        }),
      },
    };
  }
}
