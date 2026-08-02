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
});
