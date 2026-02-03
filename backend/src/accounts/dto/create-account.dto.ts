import { IsString, IsNumber, IsUUID, Min, Length } from 'class-validator';

export class CreateAccountDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsNumber()
  @Min(0)
  balance: number;
}
