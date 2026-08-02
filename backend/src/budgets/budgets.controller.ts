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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista los presupuestos con lo gastado del periodo y su estado de alerta',
  })
  findAll(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.budgets.findAll(usuario.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgets.findOne(usuario.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Pone un límite mensual a una categoría de gasto' })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgets.create(usuario.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgets.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgets.remove(usuario.id, id);
  }
}
