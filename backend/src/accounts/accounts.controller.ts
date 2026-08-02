import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las cuentas con su saldo calculado' })
  @ApiQuery({ name: 'incluirArchivadas', required: false, type: Boolean })
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('incluirArchivadas', new ParseBoolPipe({ optional: true }))
    incluirArchivadas?: boolean,
  ) {
    return this.accounts.findAll(usuario.id, incluirArchivadas ?? false);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accounts.findOne(usuario.id, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crea una cuenta y, si trae saldo inicial, su transacción de apertura',
  })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accounts.create(usuario.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una cuenta sin transacciones' })
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accounts.remove(usuario.id, id);
  }
}
