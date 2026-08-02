import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard global: todo exige JWT salvo lo marcado con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
