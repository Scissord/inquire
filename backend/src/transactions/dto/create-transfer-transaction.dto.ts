import { IsNumberString, IsUUID } from 'class-validator';

export class CreateTransferTransactionDto {
  @IsUUID()
  sender_account_id: string;

  @IsUUID()
  receiver_account_id: string;

  // "100.50"
  @IsNumberString()
  amount: string;

  metadata: Record<string, unknown>;
}
