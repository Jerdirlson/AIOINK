import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { QueryMonthlyReportDto, QueryReportDto } from './dto/query-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Ingresos, gastos y saldo del periodo (por defecto, el mes actual)',
  })
  summary(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() query: QueryReportDto,
  ) {
    return this.reports.summary(usuario.id, query);
  }

  @Get('by-category')
  @ApiOperation({
    summary: 'Gasto por categoría del periodo, ordenado de mayor a menor',
  })
  byCategory(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() query: QueryReportDto,
  ) {
    return this.reports.byCategory(usuario.id, query);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Serie mensual de ingresos, gastos y saldo' })
  monthly(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() query: QueryMonthlyReportDto,
  ) {
    return this.reports.monthly(usuario.id, query);
  }
}
