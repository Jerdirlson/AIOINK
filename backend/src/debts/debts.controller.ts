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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { DebtsService } from './debts.service';
import { AbonarDto, CreateDebtDto, UpdateDebtDto } from './dto/debt.dto';

@ApiTags('debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las deudas con lo abonado y lo pendiente' })
  findAll(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.debts.findAll(usuario.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Totales de lo que debo y de lo que me deben' })
  resumen(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.debts.resumen(usuario.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.debts.findOne(usuario.id, id);
  }

  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateDebtDto,
  ) {
    return this.debts.create(usuario.id, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Registra un abono que reduce el pendiente' })
  abonar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AbonarDto,
  ) {
    return this.debts.abonar(usuario.id, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.debts.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.debts.remove(usuario.id, id);
  }
}
