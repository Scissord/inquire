import { IsString, Length } from 'class-validator';

export class CreateLedgerDto {
  @IsString()
  @Length(0, 10)
  type: string;

  metadata: Record<string, unknown>;
}
