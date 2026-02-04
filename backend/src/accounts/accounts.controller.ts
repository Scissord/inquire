import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtTokenGuard } from '../auth/jwt-token.guard';
import { AccountsService } from './accounts.service';
import { CurrentUser } from 'src/auth/current-user.decorator';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, JwtTokenGuard)
  @Get()
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'Filter by currency (e.g. USD, EUR)',
  })
  async accounts(
    @CurrentUser() user: { user_id: string },
    @Query('currency') currency?: string,
  ) {
    const accounts = await this.accountsService.get(user.user_id, currency);

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
