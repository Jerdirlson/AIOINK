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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryKind } from '@prisma/client';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las categorías del usuario' })
  @ApiQuery({ name: 'kind', enum: CategoryKind, required: false })
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('kind') kind?: CategoryKind,
  ) {
    return this.categories.findAll(usuario.id, kind);
  }

  @Get(':id')
  findOne(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categories.findOne(usuario.id, id);
  }

  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(usuario.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita una categoría (las del sistema no)' })
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina una categoría sin transacciones y que no sea del sistema',
  })
  remove(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categories.remove(usuario.id, id);
  }
}
