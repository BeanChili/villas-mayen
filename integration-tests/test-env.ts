// URL de la base de prueba. Se puede sobreescribir con TEST_DATABASE_URL
// (en CI apunta al service container de Postgres).
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://villasmayen:villasmayen@localhost:5432/villasmayen_test"
