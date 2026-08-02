import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { DeleteAccountDto } from './dto/delete-account.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

/** Campos del usuario que se exponen al cliente (nunca el passwordHash). */
const CAMPOS_PERFIL = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  currency: true,
  country: true,
  locale: true,
  plan: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: CAMPOS_PERFIL,
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.currency !== undefined
          ? { currency: dto.currency.toUpperCase() }
          : {}),
        ...(dto.country !== undefined
          ? { country: dto.country.toUpperCase() }
          : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
      },
      select: CAMPOS_PERFIL,
    });
  }

  /**
   * Borrado real de la cuenta y de todo lo asociado, como exige el derecho de
   * cancelación de la Ley 1581 (ver docs/07). No es un "soft delete": las
   * cuentas, categorías, transacciones y tokens caen en cascada.
   *
   * Se pide la contraseña porque es irreversible.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    const coincide = await verify(user.passwordHash, dto.password);
    if (!coincide) {
      throw new UnauthorizedException('La contraseña no es correcta');
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }
}
