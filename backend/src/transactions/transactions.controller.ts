import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista transacciones con filtros y paginación',
  })
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.transactions.findAll(usuario.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactions.findOne(usuario.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Registra un gasto o un ingreso' })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactions.create(usuario.id, dto);
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Registra una transferencia entre dos cuentas propias',
  })
  createTransfer(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transactions.createTransfer(usuario.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Elimina una transacción (si es transferencia, elimina ambas patas)',
  })
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactions.remove(usuario.id, id);
  }
}
