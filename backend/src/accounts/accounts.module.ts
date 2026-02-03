import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { DatabaseModule } from '../db/database.module';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
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
  controllers: [AccountsController],
  providers: [AccountsService, JwtTokenGuard],
  exports: [AccountsService],
})
export class AccountsModule {}
