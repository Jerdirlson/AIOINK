// Configuración de la CLI de Prisma (migrate, studio, generate).
// Desde Prisma 7 la URL de conexión no va en schema.prisma sino aquí, y el
// cliente en runtime se conecta con un driver adapter (ver prisma.service.ts).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
