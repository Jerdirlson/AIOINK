-- La deduplicacion de importaciones pasa a ser por usuario: dos usuarios
-- distintos pueden recibir el mismo externalId de sus respectivos Atajos y no
-- deben colisionar entre si.
DROP INDEX "transactions_source_externalId_key";

CREATE UNIQUE INDEX "transactions_userId_source_externalId_key"
  ON "transactions"("userId", "source", "externalId");
