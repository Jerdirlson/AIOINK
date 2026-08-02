import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env.validation';

/**
 * Prisma 7 se conecta a través de un driver adapter en vez de leer la URL del
 * schema. El adaptador de `pg` maneja el pool de conexiones.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg(config.get('DATABASE_URL', { infer: true })),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
