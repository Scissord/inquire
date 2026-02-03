import { IsUUID } from 'class-validator';

export class CreateExchangeTransactionDto {
  @IsUUID()
  account_id: string;

  metadata: Record<string, unknown>;
}
