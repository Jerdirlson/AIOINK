import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApplePayService } from './apple-pay.service';
import { ApplePayWebhookDto } from './dto/apple-pay-webhook.dto';
import { CreateShortcutTokenDto } from './dto/create-shortcut-token.dto';
import {
  CABECERA_TOKEN_ATAJO,
  type PeticionConAtajo,
  ShortcutTokenGuard,
} from './shortcut-token.guard';
import { ShortcutTokensService } from './shortcut-tokens.service';

@ApiTags('integrations')
@Controller()
export class IntegrationsController {
  constructor(
    private readonly tokens: ShortcutTokensService,
    private readonly applePay: ApplePayService,
  ) {}

  // --- Gestión de tokens (con la sesión normal del usuario) ---

  @Get('shortcut-tokens')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista los tokens de Atajo del usuario' })
  findAll(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.tokens.findAll(usuario.id);
  }

  @Post('shortcut-tokens')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Crea un token de Atajo. El valor en claro se devuelve una única vez.',
  })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateShortcutTokenDto,
  ) {
    return this.tokens.create(usuario.id, dto);
  }

  @Delete('shortcut-tokens/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoca un token de Atajo' })
  revoke(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tokens.revoke(usuario.id, id);
  }

  // --- Entrada del Atajo (autenticada con el token, no con el JWT) ---

  @Public()
  @UseGuards(ShortcutTokenGuard)
  @Post('integrations/apple-pay')
  @ApiHeader({
    name: CABECERA_TOKEN_ATAJO,
    description: 'Token de Atajo',
    required: true,
  })
  @ApiOperation({
    summary:
      'Registra un pago de Apple Pay enviado por la automatización de Atajos',
  })
  async applePayWebhook(
    @Req() request: PeticionConAtajo,
    @Body() dto: ApplePayWebhookDto,
  ) {
    const token = request.shortcutToken;
    const resultado = await this.applePay.registrar(token, dto);

    // No se espera: que falle el registro del último uso no debe tumbar el
    // alta de la transacción, que es lo que importa.
    void this.tokens.marcarUso(token.id).catch(() => undefined);

    return resultado;
  }
}
