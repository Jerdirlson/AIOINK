import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Traduce los errores conocidos de Prisma a excepciones HTTP con significado,
 * en vez de dejar que salgan como 500 genéricos.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  override catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const traducida = this.traducir(exception);

    if (traducida instanceof InternalServerErrorException) {
      this.logger.error(
        `Error de Prisma sin traducir (${exception.code}): ${exception.message}`,
      );
    }

    super.catch(traducida, host);
  }

  private traducir(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2002': {
        const campos = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        return new ConflictException(
          campos
            ? `Ya existe un registro con ese valor en: ${campos}`
            : 'Ya existe un registro con esos datos',
        );
      }
      case 'P2025':
        return new NotFoundException('El registro no existe');
      case 'P2003':
        return new ConflictException(
          'La operación viola una referencia existente',
        );
      default:
        return new InternalServerErrorException();
    }
  }
}
