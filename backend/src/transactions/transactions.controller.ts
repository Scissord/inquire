import { Controller, Get, UseGuards, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtTokenGuard } from '../auth/jwt-token.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransferTransactionDto } from './dto/create-transfer-transaction.dto';
import { CreateExchangeTransactionDto } from './dto/create-exchange-transaction.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Post('/transfer')
  async transfer(@Body() dto: CreateTransferTransactionDto) {
    return this.transactionsService.createTransferTx(
      dto.sender_account_id,
      dto.receiver_account_id,
      dto.amount,
      dto.metadata,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Post('/exchange')
  async exchange(@Body() dto: CreateExchangeTransactionDto) {
    return this.transactionsService.createExchangeTx(
      dto.account_id,
      dto.metadata,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Get()
  async get(@Query('limit') limit: number, @Query('page') page: number) {
    return await this.transactionsService.get(limit, page);
  }
}
