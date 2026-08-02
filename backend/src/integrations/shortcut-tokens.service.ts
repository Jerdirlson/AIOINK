import { Injectable, NotFoundException } from '@nestjs/common';
import type { ShortcutToken } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateShortcutTokenDto } from './dto/create-shortcut-token.dto';

export interface TokenRecienCreado {
  id: string;
  name: string;
  accountId: string;
  /** Valor en claro. Se devuelve una única vez: después solo queda el hash. */
  token: string;
  createdAt: Date;
}

export type TokenPublico = Omit<ShortcutToken, 'tokenHash'>;

@Injectable()
export class ShortcutTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Los tokens se guardan hasheados, como una API key. Se usa SHA-256 y no
   * argon2 a propósito: el token es aleatorio de 256 bits, así que no es
   * susceptible a fuerza bruta y el hash tiene que ser rápido — se verifica
   * en cada llamada del Atajo.
   */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(
    userId: string,
    dto: CreateShortcutTokenDto,
  ): Promise<TokenRecienCreado> {
    const cuenta = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
      select: { id: true },
    });

    if (!cuenta) {
      throw new NotFoundException('La cuenta no existe o no es tuya');
    }

    const token = randomBytes(32).toString('base64url');

    const creado = await this.prisma.shortcutToken.create({
      data: {
        userId,
        name: dto.name.trim(),
        accountId: dto.accountId,
        tokenHash: this.hash(token),
      },
    });

    return {
      id: creado.id,
      name: creado.name,
      accountId: creado.accountId,
      token,
      createdAt: creado.createdAt,
    };
  }

  findAll(userId: string): Promise<TokenPublico[]> {
    return this.prisma.shortcutToken.findMany({
      where: { userId },
      omit: { tokenHash: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Revoca sin borrar, para que quede el rastro de que existió. */
  async revoke(userId: string, id: string): Promise<void> {
    const token = await this.prisma.shortcutToken.findFirst({
      where: { id, userId },
    });

    if (!token) {
      throw new NotFoundException('El token no existe');
    }

    await this.prisma.shortcutToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Resuelve un token en claro al registro vigente. Devuelve null si no
   * existe o si fue revocado.
   */
  async resolver(token: string): Promise<ShortcutToken | null> {
    const encontrado = await this.prisma.shortcutToken.findUnique({
      where: { tokenHash: this.hash(token) },
    });

    if (!encontrado || encontrado.revokedAt !== null) {
      return null;
    }

    return encontrado;
  }

  marcarUso(id: string): Promise<unknown> {
    return this.prisma.shortcutToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
