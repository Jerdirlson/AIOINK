import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ApplePayService } from './apple-pay.service';
import { IntegrationsController } from './integrations.controller';
import { ShortcutTokenGuard } from './shortcut-token.guard';
import { ShortcutTokensService } from './shortcut-tokens.service';

@Module({
  imports: [CategoriesModule],
  controllers: [IntegrationsController],
  providers: [ShortcutTokensService, ApplePayService, ShortcutTokenGuard],
  exports: [ShortcutTokensService],
})
export class IntegrationsModule {}
