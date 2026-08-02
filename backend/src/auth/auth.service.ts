import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { User } from '@prisma/client';
import { CATEGORIAS_POR_DEFECTO } from '../categories/categorias-por-defecto';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt.strategy';

export interface RespuestaAuth {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    currency: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<RespuestaAuth> {
    const email = dto.email.toLowerCase().trim();

    const existente = await this.prisma.user.findUnique({ where: { email } });
    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const passwordHash = await hash(dto.password);

    // El usuario y su catálogo de categorías se crean juntos: un usuario sin
    // categorías no podría registrar ni una transacción.
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        categories: {
          createMany: { data: [...CATEGORIAS_POR_DEFECTO] },
        },
      },
    });

    return this.construirRespuesta(user);
  }

  async login(dto: LoginDto): Promise<RespuestaAuth> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Mismo mensaje para "no existe" y "contraseña incorrecta": distinguirlos
    // permitiría enumerar qué correos están registrados.
    const credencialesInvalidas = new UnauthorizedException(
      'Correo o contraseña incorrectos',
    );

    if (!user) {
      throw credencialesInvalidas;
    }

    const coincide = await verify(user.passwordHash, dto.password);
    if (!coincide) {
      throw credencialesInvalidas;
    }

    return this.construirRespuesta(user);
  }

  private construirRespuesta(user: User): RespuestaAuth {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwt.sign(payload, {
        expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
    };
  }
}
