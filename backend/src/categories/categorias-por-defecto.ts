import { CategoryKind, Prisma } from '@prisma/client';

/**
 * Nombres de las categorías de sistema. Se referencian por nombre desde los
 * servicios (saldo inicial y transferencias), así que viven en una constante
 * en vez de repetirse como string suelto.
 */
export const CATEGORIA_SALDO_INICIAL = 'Saldo inicial';
export const CATEGORIA_TRANSFERENCIA = 'Transferencia';

type CategoriaSemilla = Omit<Prisma.CategoryCreateManyInput, 'userId'>;

/**
 * Catálogo que recibe todo usuario al registrarse. Los `colorSlot` siguen el
 * orden fijo de la paleta de gráficos (docs/09 §8): se asignan en secuencia y
 * nunca se reciclan — la categoría 9 en adelante va sin slot y se agrupa como
 * "Otros" en los reportes.
 */
export const CATEGORIAS_POR_DEFECTO: readonly CategoriaSemilla[] = [
  // Sistema — no editables ni borrables.
  {
    name: CATEGORIA_SALDO_INICIAL,
    icon: 'banknote.fill',
    kind: CategoryKind.SYSTEM,
    isSystem: true,
  },
  {
    name: CATEGORIA_TRANSFERENCIA,
    icon: 'arrow.left.arrow.right',
    kind: CategoryKind.SYSTEM,
    isSystem: true,
  },

  // Gastos.
  {
    name: 'Comida',
    icon: 'fork.knife',
    kind: CategoryKind.EXPENSE,
    colorSlot: 1,
  },
  {
    name: 'Carro',
    icon: 'car.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 2,
  },
  {
    name: 'Vivienda',
    icon: 'house.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 3,
  },
  {
    name: 'Suscripciones',
    icon: 'play.tv.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 4,
  },
  {
    name: 'Mercado',
    icon: 'cart.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 5,
  },
  {
    name: 'Salud',
    icon: 'cross.case.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 6,
  },
  {
    name: 'Ocio',
    icon: 'figure.walk',
    kind: CategoryKind.EXPENSE,
    colorSlot: 7,
  },
  {
    name: 'Otros',
    icon: 'ellipsis.circle.fill',
    kind: CategoryKind.EXPENSE,
    colorSlot: 8,
  },

  // Ingresos.
  {
    name: 'Salario',
    icon: 'creditcard.fill',
    kind: CategoryKind.INCOME,
  },
  {
    name: 'Otros ingresos',
    icon: 'plus.circle.fill',
    kind: CategoryKind.INCOME,
  },
];
