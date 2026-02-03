import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { DatabaseModule } from '../db/database.module';
import { LedgerService } from './ledger.service';
import { JwtTokenGuard } from '../auth/jwt-token.guard';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN') ?? '1d',
        },
      }),
    }),
  ],
  providers: [LedgerService, JwtTokenGuard],
  exports: [LedgerService],
})
export class LedgerModule {}
