import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtTokenGuard } from '../auth/jwt-token.guard';
import { AccountsService } from './accounts.service';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Get()
  async accounts() {
    const accounts = await this.accountsService.get();

    return { accounts };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Get('/:id/balance')
  async findBalance(@Param('id') id: string) {
    const account = await this.accountsService.find(id);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return { account };
  }
}
