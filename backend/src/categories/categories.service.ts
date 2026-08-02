import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Category, CategoryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CATEGORIA_SALDO_INICIAL,
  CATEGORIA_TRANSFERENCIA,
} from './categorias-por-defecto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, kind?: CategoryKind): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      orderBy: [{ isSystem: 'asc' }, { colorSlot: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string): Promise<Category> {
    const categoria = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!categoria) {
      throw new NotFoundException('La categoría no existe');
    }

    return categoria;
  }

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name.trim(),
        icon: dto.icon ?? 'ellipsis.circle.fill',
        kind: dto.kind,
        colorSlot: dto.colorSlot ?? null,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const categoria = await this.findOne(userId, id);
    this.rechazarSiEsDelSistema(categoria, 'editar');

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.colorSlot !== undefined ? { colorSlot: dto.colorSlot } : {}),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const categoria = await this.findOne(userId, id);
    this.rechazarSiEsDelSistema(categoria, 'eliminar');

    const enUso = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (enUso > 0) {
      throw new ConflictException(
        `No se puede eliminar: la categoría tiene ${enUso} transacción(es). Reasignalas primero.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Busca una categoría de sistema por nombre. La usan los servicios de
   * cuentas (saldo inicial) y transacciones (transferencias).
   */
  async obtenerDelSistema(
    userId: string,
    nombre: typeof CATEGORIA_SALDO_INICIAL | typeof CATEGORIA_TRANSFERENCIA,
  ): Promise<Category> {
    const categoria = await this.prisma.category.findFirst({
      where: { userId, name: nombre, isSystem: true },
    });

    if (!categoria) {
      // No debería pasar: se crean al registrar al usuario.
      throw new NotFoundException(
        `Falta la categoría de sistema "${nombre}" para este usuario`,
      );
    }

    return categoria;
  }

  /**
   * Categoría a la que van las transacciones que entran por un canal
   * automático y todavía no se han clasificado (Apple Pay, ver docs/06).
   * Prefiere "Otros"; si el usuario la renombró o borró, cae en cualquier
   * categoría de gasto suya.
   */
  async obtenerParaAutoCategorizar(userId: string): Promise<Category> {
    const otros = await this.prisma.category.findFirst({
      where: { userId, kind: 'EXPENSE', name: 'Otros' },
    });

    if (otros) {
      return otros;
    }

    const cualquiera = await this.prisma.category.findFirst({
      where: { userId, kind: 'EXPENSE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!cualquiera) {
      throw new NotFoundException(
        'El usuario no tiene ninguna categoría de gasto',
      );
    }

    return cualquiera;
  }

  private rechazarSiEsDelSistema(categoria: Category, accion: string): void {
    if (categoria.isSystem) {
      throw new ForbiddenException(
        `No se puede ${accion} una categoría del sistema`,
      );
    }
  }
}
