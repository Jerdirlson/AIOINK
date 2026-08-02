import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    ReportsModule,
    IntegrationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard global: todo exige JWT salvo lo marcado con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
