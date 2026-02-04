import {
  Controller,
  Get,
  UseGuards,
  Post,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtTokenGuard } from '../auth/jwt-token.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransferTransactionDto } from './dto/create-transfer-transaction.dto';
import { CreateExchangeTransactionDto } from './dto/create-exchange-transaction.dto';
import { CurrentUser } from 'src/auth/current-user.decorator';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Post('/transfer')
  async transfer(
    @Body() dto: CreateTransferTransactionDto,
    @Req() req: Request<unknown, unknown, CreateTransferTransactionDto>,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const metadata = {
      ...dto.metadata,
      ip,
      user_agent,
    };

    return this.transactionsService.createTransferTx(
      dto.sender_account_id,
      dto.receiver_account_id,
      dto.amount,
      metadata,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Post('/exchange')
  async exchange(
    @Body() dto: CreateExchangeTransactionDto,
    @Req() req: Request<unknown, unknown, CreateExchangeTransactionDto>,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const metadata = {
      ...dto.metadata,
      ip,
      user_agent,
    };

    return this.transactionsService.createExchangeTx(
      dto.source_account_id,
      dto.destination_account_id,
      dto.amount,
      metadata,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Get()
  async get(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('type') type: 'transfer' | 'exchange' | undefined,
    @CurrentUser() user: { user_id: string },
  ) {
    const result = await this.transactionsService.get(
      user.user_id,
      limit,
      page,
      type,
    );

    return result;
  }
}
