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
import {
  ContribuirDto,
  CreateSavingGoalDto,
  UpdateSavingGoalDto,
} from './dto/saving-goal.dto';
import { SavingsService } from './savings.service';

@ApiTags('savings')
@ApiBearerAuth()
@Controller('savings')
export class SavingsController {
  constructor(private readonly savings: SavingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las metas de ahorro con su progreso' })
  findAll(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.savings.findAll(usuario.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savings.findOne(usuario.id, id);
  }

  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateSavingGoalDto,
  ) {
    return this.savings.create(usuario.id, dto);
  }

  @Post(':id/contribute')
  @ApiOperation({
    summary: 'Registra un aporte (o un retiro, con monto negativo)',
  })
  contribuir(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContribuirDto,
  ) {
    return this.savings.contribuir(usuario.id, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingGoalDto,
  ) {
    return this.savings.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savings.remove(usuario.id, id);
  }
}
