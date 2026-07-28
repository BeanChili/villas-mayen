import { vi, beforeEach } from "vitest"
import { TEST_DATABASE_URL } from "./test-env"

// La base de prueba tiene que quedar seteada ANTES de que cualquier import
// construya el PrismaClient de @/lib/db (dotenv no pisa env vars existentes).
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.NEXTAUTH_SECRET = "test-secret"

// Mock de next-auth: cada test decide la sesion activa con mockSession()
export const sessionHolder: { current: any } = { current: null }

vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>()
  return {
    ...actual,
    getServerSession: vi.fn(async () => sessionHolder.current),
  }
})

beforeEach(() => {
  sessionHolder.current = null
})
