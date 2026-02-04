import { Optional } from '@nestjs/common';
import { IsNumberString, IsObject, IsUUID } from 'class-validator';

export class CreateTransferTransactionDto {
  @IsUUID()
  sender_account_id: string;

  @IsUUID()
  receiver_account_id: string;

  // "100.50"
  @IsNumberString()
  amount: string;

  @Optional()
  @IsObject()
  metadata: Record<string, unknown>;
}
