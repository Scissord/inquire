import { Optional } from '@nestjs/common';
import { IsNumberString, IsObject, IsUUID } from 'class-validator';

export class CreateExchangeTransactionDto {
  @IsUUID()
  source_account_id: string;

  @IsUUID()
  destination_account_id: string;

  @IsNumberString()
  amount: string;

  @Optional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
