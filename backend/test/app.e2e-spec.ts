import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AccountType, TransactionType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { BigIntSerializerInterceptor } from '../src/common/interceptors/bigint-serializer.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

// Formas de las respuestas de la API. `res.body` de supertest es `any`, así
// que se tipa explícitamente con `cuerpo()` para que el compilador también
// revise los tests.
interface RespuestaAuth {
  accessToken: string;
  user: { id: string; email: string; name: string };
}

interface CuentaResp {
  id: string;
  name: string;
  balance: number;
}

interface CategoriaResp {
  id: string;
  name: string;
  isSystem: boolean;
}

interface TransaccionResp {
  id: string;
  amount: number;
  description: string;
  transferGroupId: string | null;
}

interface ListaTransaccionesResp {
  items: TransaccionResp[];
  total: number;
}

interface ErrorResp {
  message: string;
  statusCode: number;
}

interface ResumenResp {
  income: number;
  expense: number;
  balance: number;
}

interface PorCategoriaResp {
  total: number;
  items: {
    categoryId: string;
    name: string;
    total: number;
    percentage: number;
    colorSlot: number | null;
  }[];
}

interface MesResp {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface TokenAtajoResp {
  id: string;
  name: string;
  token: string;
}

interface ApplePayResp {
  transaction: TransaccionResp;
  duplicated: boolean;
}

interface PerfilResp {
  id: string;
  name: string;
  locale: string;
  currency: string;
}

interface PresupuestoResp {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'OK' | 'WARNING' | 'EXCEEDED';
}

interface MetaResp {
  id: string;
  currentAmount: number;
  targetAmount: number;
  remaining: number;
  percentage: number;
  completed: boolean;
}

interface DeudaResp {
  id: string;
  totalAmount: number;
  remainingAmount: number;
  paid: number;
  percentagePaid: number;
  settled: boolean;
}

interface ResumenDeudasResp {
  owedByMe: number;
  owedToMe: number;
  net: number;
}

const cuerpo = <T>(res: request.Response): T => res.body as T;

/**
 * Recorre el flujo completo contra una base de datos real: registro, creación
 * de cuentas, gasto, transferencia y verificación de saldos.
 */
describe('IAOINK API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.Agent;

  // Correo único por corrida para no chocar con datos previos.
  const email = `e2e-${Date.now()}@iaoink.test`;
  let token: string;
  let cuentaPrincipalId: string;
  let cuentaAhorrosId: string;
  let categoriaComidaId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new BigIntSerializerInterceptor());
    app.useGlobalFilters(
      new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
    );

    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    // Borrar el usuario arrastra sus cuentas, categorías y transacciones.
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('salud', () => {
    it('GET /api/health responde sin autenticación', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(cuerpo<{ status: string }>(res).status).toBe('ok');
    });
  });

  describe('autenticación', () => {
    it('rechaza el acceso sin token', async () => {
      await http().get('/api/accounts').expect(401);
    });

    it('POST /api/auth/register crea la cuenta con sus categorías por defecto', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email, name: 'Usuario E2E', password: 'contrasena-segura' })
        .expect(201);

      const registro = cuerpo<RespuestaAuth>(res);
      expect(registro.accessToken).toEqual(expect.any(String));
      expect(registro.user.email).toBe(email);
      token = registro.accessToken;

      const categorias = await http()
        .get('/api/categories')
        .set(auth())
        .expect(200);

      const lista = cuerpo<CategoriaResp[]>(categorias);
      expect(lista.length).toBeGreaterThan(5);
      expect(lista.some((c) => c.isSystem)).toBe(true);

      const comida = lista.find((c) => c.name === 'Comida');
      expect(comida).toBeDefined();
      categoriaComidaId = comida!.id;
    });

    it('rechaza registrar el mismo correo dos veces', async () => {
      await http()
        .post('/api/auth/register')
        .send({ email, name: 'Duplicado', password: 'contrasena-segura' })
        .expect(409);
    });

    it('rechaza una contraseña corta', async () => {
      await http()
        .post('/api/auth/register')
        .send({ email: `otro-${email}`, name: 'Nombre', password: 'corta' })
        .expect(400);
    });

    it('POST /api/auth/login devuelve un token', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email, password: 'contrasena-segura' })
        .expect(200);

      expect(cuerpo<RespuestaAuth>(res).accessToken).toEqual(
        expect.any(String),
      );
    });

    it('rechaza credenciales incorrectas sin revelar si el correo existe', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email, password: 'contrasena-equivocada' })
        .expect(401);

      expect(cuerpo<ErrorResp>(res).message).toBe(
        'Correo o contraseña incorrectos',
      );
    });
  });

  describe('cuentas', () => {
    it('POST /api/accounts crea una cuenta con saldo inicial', async () => {
      const res = await http()
        .post('/api/accounts')
        .set(auth())
        .send({
          name: 'Principal',
          type: AccountType.DEBIT,
          initialBalance: 1000000000, // $10.000.000
        })
        .expect(201);

      const cuenta = cuerpo<CuentaResp>(res);
      expect(cuenta.balance).toBe(1000000000);
      cuentaPrincipalId = cuenta.id;
    });

    it('materializa el saldo inicial como una transacción', async () => {
      const res = await http()
        .get(`/api/transactions?accountId=${cuentaPrincipalId}`)
        .set(auth())
        .expect(200);

      const lista = cuerpo<ListaTransaccionesResp>(res);
      expect(lista.total).toBe(1);
      expect(lista.items[0].description).toBe('Saldo inicial');
      expect(lista.items[0].amount).toBe(1000000000);
    });

    it('crea una segunda cuenta sin saldo inicial', async () => {
      const res = await http()
        .post('/api/accounts')
        .set(auth())
        .send({ name: 'Colchón', type: AccountType.SAVINGS })
        .expect(201);

      const cuenta = cuerpo<CuentaResp>(res);
      expect(cuenta.balance).toBe(0);
      cuentaAhorrosId = cuenta.id;
    });
  });

  describe('transacciones', () => {
    it('POST /api/transactions registra un gasto y baja el saldo', async () => {
      await http()
        .post('/api/transactions')
        .set(auth())
        .send({
          accountId: cuentaPrincipalId,
          categoryId: categoriaComidaId,
          amount: -8000000, // −$80.000
          type: TransactionType.EXPENSE,
          description: 'Pago con vale',
          occurredAt: new Date().toISOString(),
        })
        .expect(201);

      const res = await http()
        .get(`/api/accounts/${cuentaPrincipalId}`)
        .set(auth())
        .expect(200);

      expect(cuerpo<CuentaResp>(res).balance).toBe(1000000000 - 8000000);
    });

    it('rechaza un gasto con monto positivo', async () => {
      await http()
        .post('/api/transactions')
        .set(auth())
        .send({
          accountId: cuentaPrincipalId,
          categoryId: categoriaComidaId,
          amount: 8000000,
          type: TransactionType.EXPENSE,
          description: 'Signo incorrecto',
          occurredAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('rechaza campos no declarados en el DTO', async () => {
      await http()
        .post('/api/transactions')
        .set(auth())
        .send({
          accountId: cuentaPrincipalId,
          categoryId: categoriaComidaId,
          amount: -1000,
          type: TransactionType.EXPENSE,
          description: 'Con basura',
          occurredAt: new Date().toISOString(),
          campoInventado: 'no deberia pasar',
        })
        .expect(400);
    });
  });

  describe('transferencias', () => {
    const monto = 50000000; // $500.000

    it('POST /api/transactions/transfer mueve el saldo entre cuentas', async () => {
      await http()
        .post('/api/transactions/transfer')
        .set(auth())
        .send({
          fromAccountId: cuentaPrincipalId,
          toAccountId: cuentaAhorrosId,
          amount: monto,
          description: 'Paso al colchón',
          occurredAt: new Date().toISOString(),
        })
        .expect(201);

      const res = await http().get('/api/accounts').set(auth()).expect(200);
      const lista = cuerpo<CuentaResp[]>(res);

      const principal = lista.find((c) => c.id === cuentaPrincipalId);
      const ahorros = lista.find((c) => c.id === cuentaAhorrosId);

      expect(principal?.balance).toBe(1000000000 - 8000000 - monto);
      expect(ahorros?.balance).toBe(monto);
    });

    it('la suma de las dos cuentas no cambia con la transferencia', async () => {
      const res = await http().get('/api/accounts').set(auth()).expect(200);
      const total = cuerpo<CuentaResp[]>(res).reduce(
        (acc, c) => acc + c.balance,
        0,
      );

      expect(total).toBe(1000000000 - 8000000);
    });

    it('rechaza transferir a la misma cuenta', async () => {
      await http()
        .post('/api/transactions/transfer')
        .set(auth())
        .send({
          fromAccountId: cuentaPrincipalId,
          toAccountId: cuentaPrincipalId,
          amount: 1000,
          occurredAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('al eliminar una pata elimina ambas y restaura los saldos', async () => {
      const res = await http()
        .get('/api/transactions?limit=200')
        .set(auth())
        .expect(200);

      const pata = cuerpo<ListaTransaccionesResp>(res).items.find(
        (t) => t.transferGroupId !== null,
      );
      expect(pata).toBeDefined();

      await http()
        .delete(`/api/transactions/${pata!.id}`)
        .set(auth())
        .expect(204);

      const cuentas = await http().get('/api/accounts').set(auth()).expect(200);
      const ahorros = cuerpo<CuentaResp[]>(cuentas).find(
        (c) => c.id === cuentaAhorrosId,
      );

      expect(ahorros?.balance).toBe(0);
    });
  });

  describe('categorías del sistema', () => {
    it('no permite eliminar una categoría del sistema', async () => {
      const res = await http().get('/api/categories').set(auth()).expect(200);

      const sistema = cuerpo<CategoriaResp[]>(res).find((c) => c.isSystem);
      expect(sistema).toBeDefined();

      await http()
        .delete(`/api/categories/${sistema!.id}`)
        .set(auth())
        .expect(403);
    });

    it('no permite eliminar una categoría con transacciones', async () => {
      await http()
        .delete(`/api/categories/${categoriaComidaId}`)
        .set(auth())
        .expect(409);
    });
  });

  describe('reportes', () => {
    // En este punto el usuario tiene: saldo inicial de $10.000.000 (categoría
    // de sistema) y un gasto de $80.000 en Comida. La transferencia ya se
    // eliminó en el bloque anterior.

    it('el resumen no cuenta el saldo inicial como ingreso', async () => {
      const res = await http()
        .get('/api/reports/summary')
        .set(auth())
        .expect(200);

      const resumen = cuerpo<ResumenResp>(res);

      // Si contara el saldo inicial, income seria 1.000.000.000.
      expect(resumen.income).toBe(0);
      expect(resumen.expense).toBe(8000000);
      expect(resumen.balance).toBe(-8000000);
    });

    it('el gasto por categoría devuelve totales positivos y porcentajes', async () => {
      const res = await http()
        .get('/api/reports/by-category')
        .set(auth())
        .expect(200);

      const reporte = cuerpo<PorCategoriaResp>(res);

      expect(reporte.total).toBe(8000000);
      expect(reporte.items).toHaveLength(1);
      expect(reporte.items[0].name).toBe('Comida');
      expect(reporte.items[0].total).toBe(8000000);
      expect(reporte.items[0].percentage).toBe(100);
    });

    it('la serie mensual incluye el mes en curso', async () => {
      const res = await http()
        .get('/api/reports/monthly?months=3')
        .set(auth())
        .expect(200);

      const meses = cuerpo<MesResp[]>(res);
      const mesActual = new Date().toISOString().slice(0, 7);
      const actual = meses.find((m) => m.month === mesActual);

      expect(actual).toBeDefined();
      expect(actual!.expense).toBe(8000000);
    });

    it('rechaza un rango de fechas invertido', async () => {
      await http()
        .get('/api/reports/summary?from=2026-08-10&to=2026-08-01')
        .set(auth())
        .expect(400);
    });
  });

  describe('Atajo de iOS y Apple Pay', () => {
    let tokenAtajo: string;
    let tokenAtajoId: string;

    it('crea un token y devuelve el valor en claro una sola vez', async () => {
      const res = await http()
        .post('/api/shortcut-tokens')
        .set(auth())
        .send({ name: 'iPhone de pruebas', accountId: cuentaPrincipalId })
        .expect(201);

      const creado = cuerpo<TokenAtajoResp>(res);
      expect(creado.token).toEqual(expect.any(String));
      tokenAtajo = creado.token;
      tokenAtajoId = creado.id;

      // Al listarlos, el token en claro ya no aparece.
      const lista = await http()
        .get('/api/shortcut-tokens')
        .set(auth())
        .expect(200);

      const tokens = cuerpo<Record<string, unknown>[]>(lista);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBeUndefined();
      expect(tokens[0].tokenHash).toBeUndefined();
    });

    it('rechaza el webhook sin token', async () => {
      await http()
        .post('/api/integrations/apple-pay')
        .send({ merchant: 'Juan Valdez', amountCents: 1500000 })
        .expect(401);
    });

    it('rechaza el webhook con un token inventado', async () => {
      await http()
        .post('/api/integrations/apple-pay')
        .set({ 'x-shortcut-token': 'token-que-no-existe' })
        .send({ merchant: 'Juan Valdez', amountCents: 1500000 })
        .expect(401);
    });

    it('registra el pago como gasto en la cuenta del token', async () => {
      const res = await http()
        .post('/api/integrations/apple-pay')
        .set({ 'x-shortcut-token': tokenAtajo })
        .send({
          merchant: 'Juan Valdez',
          amountCents: 1500000, // $15.000
          externalId: 'apple-pay-001',
        })
        .expect(201);

      const resultado = cuerpo<ApplePayResp>(res);
      expect(resultado.duplicated).toBe(false);
      // El Atajo manda positivo; se guarda como gasto (negativo).
      expect(resultado.transaction.amount).toBe(-1500000);
      expect(resultado.transaction.description).toBe('Juan Valdez');

      const cuenta = await http()
        .get(`/api/accounts/${cuentaPrincipalId}`)
        .set(auth())
        .expect(200);

      expect(cuerpo<CuentaResp>(cuenta).balance).toBe(
        1000000000 - 8000000 - 1500000,
      );
    });

    it('reenviar el mismo pago no lo duplica', async () => {
      const res = await http()
        .post('/api/integrations/apple-pay')
        .set({ 'x-shortcut-token': tokenAtajo })
        .send({
          merchant: 'Juan Valdez',
          amountCents: 1500000,
          externalId: 'apple-pay-001',
        })
        .expect(201);

      expect(cuerpo<ApplePayResp>(res).duplicated).toBe(true);

      const cuenta = await http()
        .get(`/api/accounts/${cuentaPrincipalId}`)
        .set(auth())
        .expect(200);

      // El saldo no se movió con el reenvío.
      expect(cuerpo<CuentaResp>(cuenta).balance).toBe(
        1000000000 - 8000000 - 1500000,
      );
    });

    it('rechaza un monto negativo', async () => {
      await http()
        .post('/api/integrations/apple-pay')
        .set({ 'x-shortcut-token': tokenAtajo })
        .send({ merchant: 'Negativo', amountCents: -1000 })
        .expect(400);
    });

    it('un token revocado deja de funcionar', async () => {
      await http()
        .delete(`/api/shortcut-tokens/${tokenAtajoId}`)
        .set(auth())
        .expect(204);

      await http()
        .post('/api/integrations/apple-pay')
        .set({ 'x-shortcut-token': tokenAtajo })
        .send({ merchant: 'Despues de revocar', amountCents: 1000 })
        .expect(401);
    });
  });

  describe('perfil', () => {
    it('GET /api/users/me devuelve el perfil sin el hash de contraseña', async () => {
      const res = await http().get('/api/users/me').set(auth()).expect(200);

      const perfil = cuerpo<Record<string, unknown>>(res);
      expect(perfil.email).toBe(email);
      expect(perfil.passwordHash).toBeUndefined();
    });

    it('PATCH /api/users/me edita el perfil', async () => {
      const res = await http()
        .patch('/api/users/me')
        .set(auth())
        .send({ name: 'Nombre Editado', locale: 'en' })
        .expect(200);

      const perfil = cuerpo<PerfilResp>(res);
      expect(perfil.name).toBe('Nombre Editado');
      expect(perfil.locale).toBe('en');
    });

    it('no permite cambiar el correo por esta vía', async () => {
      await http()
        .patch('/api/users/me')
        .set(auth())
        .send({ email: 'otro@correo.com' })
        .expect(400);
    });
  });

  describe('presupuestos', () => {
    let presupuestoId: string;

    it('rechaza presupuestar una categoría del sistema', async () => {
      const categorias = await http()
        .get('/api/categories')
        .set(auth())
        .expect(200);

      const sistema = cuerpo<CategoriaResp[]>(categorias).find(
        (c) => c.isSystem,
      );

      await http()
        .post('/api/budgets')
        .set(auth())
        .send({ categoryId: sistema!.id, amount: 10000000 })
        .expect(400);
    });

    it('crea un presupuesto y refleja lo ya gastado en la categoría', async () => {
      // Comida lleva $80.000 gastados de los bloques anteriores.
      const res = await http()
        .post('/api/budgets')
        .set(auth())
        .send({ categoryId: categoriaComidaId, amount: 10000000 }) // $100.000
        .expect(201);

      const presupuesto = cuerpo<PresupuestoResp>(res);
      presupuestoId = presupuesto.id;

      expect(presupuesto.spent).toBe(8000000);
      expect(presupuesto.remaining).toBe(2000000);
      expect(presupuesto.percentage).toBe(80);
      // Justo en el umbral del 80 %.
      expect(presupuesto.status).toBe('WARNING');
    });

    it('no permite dos presupuestos para la misma categoría', async () => {
      await http()
        .post('/api/budgets')
        .set(auth())
        .send({ categoryId: categoriaComidaId, amount: 5000000 })
        .expect(409);
    });

    it('al subir el límite vuelve a estado OK', async () => {
      const res = await http()
        .patch(`/api/budgets/${presupuestoId}`)
        .set(auth())
        .send({ amount: 50000000 }) // $500.000
        .expect(200);

      const presupuesto = cuerpo<PresupuestoResp>(res);
      expect(presupuesto.status).toBe('OK');
      expect(presupuesto.percentage).toBe(16);
    });

    it('un gasto nuevo lo empuja a excedido', async () => {
      await http()
        .post('/api/transactions')
        .set(auth())
        .send({
          accountId: cuentaPrincipalId,
          categoryId: categoriaComidaId,
          amount: -45000000, // $450.000 más
          type: TransactionType.EXPENSE,
          description: 'Mercado grande',
          occurredAt: new Date().toISOString(),
        })
        .expect(201);

      const res = await http()
        .get(`/api/budgets/${presupuestoId}`)
        .set(auth())
        .expect(200);

      const presupuesto = cuerpo<PresupuestoResp>(res);
      expect(presupuesto.spent).toBe(53000000);
      expect(presupuesto.status).toBe('EXCEEDED');
      expect(presupuesto.remaining).toBeLessThan(0);
    });

    it('rechaza un límite negativo', async () => {
      await http()
        .post('/api/budgets')
        .set(auth())
        .send({ categoryId: categoriaComidaId, amount: -1000 })
        .expect(400);
    });

    it('elimina el presupuesto', async () => {
      await http()
        .delete(`/api/budgets/${presupuestoId}`)
        .set(auth())
        .expect(204);

      const res = await http().get('/api/budgets').set(auth()).expect(200);
      expect(cuerpo<PresupuestoResp[]>(res)).toHaveLength(0);
    });
  });

  describe('metas de ahorro', () => {
    let metaId: string;

    it('crea una meta y calcula el progreso', async () => {
      const res = await http()
        .post('/api/savings')
        .set(auth())
        .send({
          name: 'Viaje a fin de año',
          targetAmount: 200000000, // $2.000.000
          currentAmount: 50000000, // $500.000
        })
        .expect(201);

      const meta = cuerpo<MetaResp>(res);
      metaId = meta.id;

      expect(meta.percentage).toBe(25);
      expect(meta.remaining).toBe(150000000);
      expect(meta.completed).toBe(false);
    });

    it('un aporte sube el acumulado', async () => {
      const res = await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: 50000000 })
        .expect(201);

      const meta = cuerpo<MetaResp>(res);
      expect(meta.currentAmount).toBe(100000000);
      expect(meta.percentage).toBe(50);
    });

    it('acepta un aporte negativo para corregir', async () => {
      const res = await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: -20000000 })
        .expect(201);

      expect(cuerpo<MetaResp>(res).currentAmount).toBe(80000000);
    });

    it('no deja retirar más de lo ahorrado', async () => {
      await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: -999999999 })
        .expect(400);
    });

    it('rechaza un aporte de 0', async () => {
      await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: 0 })
        .expect(400);
    });

    it('marca la meta como cumplida al llegar al objetivo', async () => {
      const res = await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: 120000000 })
        .expect(201);

      const meta = cuerpo<MetaResp>(res);
      expect(meta.completed).toBe(true);
      expect(meta.percentage).toBe(100);
      expect(meta.remaining).toBe(0);
    });

    it('el porcentaje no pasa de 100 aunque se ahorre de más', async () => {
      const res = await http()
        .post(`/api/savings/${metaId}/contribute`)
        .set(auth())
        .send({ amount: 100000000 })
        .expect(201);

      const meta = cuerpo<MetaResp>(res);
      expect(meta.percentage).toBe(100);
      expect(meta.remaining).toBe(0);
    });
  });

  describe('deudas', () => {
    let deudaId: string;

    it('crea una deuda propia con el pendiente igual al total', async () => {
      const res = await http()
        .post('/api/debts')
        .set(auth())
        .send({
          name: 'Préstamo del carro',
          counterparty: 'Banco',
          direction: 'OWED_BY_ME',
          totalAmount: 1200000000, // $12.000.000
        })
        .expect(201);

      const deuda = cuerpo<DeudaResp>(res);
      deudaId = deuda.id;

      expect(deuda.remainingAmount).toBe(1200000000);
      expect(deuda.paid).toBe(0);
      expect(deuda.settled).toBe(false);
    });

    it('rechaza un pendiente mayor que el total', async () => {
      await http()
        .post('/api/debts')
        .set(auth())
        .send({
          name: 'Incoherente',
          direction: 'OWED_BY_ME',
          totalAmount: 1000,
          remainingAmount: 5000,
        })
        .expect(400);
    });

    it('un abono reduce el pendiente', async () => {
      const res = await http()
        .post(`/api/debts/${deudaId}/pay`)
        .set(auth())
        .send({ amount: 300000000 }) // $3.000.000
        .expect(201);

      const deuda = cuerpo<DeudaResp>(res);
      expect(deuda.remainingAmount).toBe(900000000);
      expect(deuda.paid).toBe(300000000);
      expect(deuda.percentagePaid).toBe(25);
    });

    it('no deja abonar más que el pendiente', async () => {
      await http()
        .post(`/api/debts/${deudaId}/pay`)
        .set(auth())
        .send({ amount: 999999999999 })
        .expect(400);
    });

    it('el resumen separa lo que debo de lo que me deben', async () => {
      await http()
        .post('/api/debts')
        .set(auth())
        .send({
          name: 'Le presté a Camilo',
          direction: 'OWED_TO_ME',
          totalAmount: 50000000,
        })
        .expect(201);

      const res = await http()
        .get('/api/debts/summary')
        .set(auth())
        .expect(200);

      const resumen = cuerpo<ResumenDeudasResp>(res);
      expect(resumen.owedByMe).toBe(900000000);
      expect(resumen.owedToMe).toBe(50000000);
      expect(resumen.net).toBe(50000000 - 900000000);
    });

    it('saldar la deuda la marca como settled', async () => {
      const res = await http()
        .post(`/api/debts/${deudaId}/pay`)
        .set(auth())
        .send({ amount: 900000000 })
        .expect(201);

      const deuda = cuerpo<DeudaResp>(res);
      expect(deuda.settled).toBe(true);
      expect(deuda.remainingAmount).toBe(0);
      expect(deuda.percentagePaid).toBe(100);
    });

    it('no deja abonar a una deuda ya saldada', async () => {
      await http()
        .post(`/api/debts/${deudaId}/pay`)
        .set(auth())
        .send({ amount: 1000 })
        .expect(400);
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('un usuario no ve ni toca las cuentas de otro', async () => {
      const otroEmail = `e2e-otro-${Date.now()}@iaoink.test`;
      const res = await http()
        .post('/api/auth/register')
        .send({
          email: otroEmail,
          name: 'Otro Usuario',
          password: 'contrasena-segura',
        })
        .expect(201);

      const otroToken = cuerpo<RespuestaAuth>(res).accessToken;

      const cuentas = await http()
        .get('/api/accounts')
        .set({ Authorization: `Bearer ${otroToken}` })
        .expect(200);

      expect(cuerpo<CuentaResp[]>(cuentas)).toHaveLength(0);

      await http()
        .get(`/api/accounts/${cuentaPrincipalId}`)
        .set({ Authorization: `Bearer ${otroToken}` })
        .expect(404);

      await prisma.user.deleteMany({ where: { email: otroEmail } });
    });
  });

  // Va de último: destruye el usuario con el que trabajan los demás bloques.
  describe('eliminar cuenta (Ley 1581)', () => {
    it('exige la contraseña correcta', async () => {
      await http()
        .delete('/api/users/me')
        .set(auth())
        .send({ password: 'contrasena-equivocada' })
        .expect(401);

      // Sigue existiendo.
      await http().get('/api/users/me').set(auth()).expect(200);
    });

    it('borra de verdad al usuario y todos sus datos asociados', async () => {
      const usuario = await prisma.user.findUniqueOrThrow({ where: { email } });

      await http()
        .delete('/api/users/me')
        .set(auth())
        .send({ password: 'contrasena-segura' })
        .expect(204);

      // No es un borrado lógico: la fila desaparece.
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

      // Y todo lo asociado cae en cascada — el derecho de cancelación no se
      // cumple dejando las transacciones huérfanas en la base.
      const [cuentas, categorias, transacciones, tokens] = await Promise.all([
        prisma.account.count({ where: { userId: usuario.id } }),
        prisma.category.count({ where: { userId: usuario.id } }),
        prisma.transaction.count({ where: { userId: usuario.id } }),
        prisma.shortcutToken.count({ where: { userId: usuario.id } }),
      ]);

      expect({ cuentas, categorias, transacciones, tokens }).toEqual({
        cuentas: 0,
        categorias: 0,
        transacciones: 0,
        tokens: 0,
      });
    });

    it('el token de sesión ya no sirve', async () => {
      await http().get('/api/users/me').set(auth()).expect(401);
    });
  });
});
