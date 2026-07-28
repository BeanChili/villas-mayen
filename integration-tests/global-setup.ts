import { execSync } from "child_process"
import { TEST_DATABASE_URL } from "./test-env"

// Corre UNA vez por ejecucion de la suite: deja la base de prueba con el
// esquema real (las mismas migraciones que corre produccion) y vacia.
export default function globalSetup() {
  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  })
}
