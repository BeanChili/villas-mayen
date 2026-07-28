import { defineConfig } from "vitest/config"
import path from "path"

// Dos proyectos:
// - unit: logica pura junto al codigo (src/**/*.test.ts), sin base de datos
// - integration: route handlers reales contra Postgres de prueba
//   (integration-tests/**), corre en serie porque comparte la base
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["integration-tests/**/*.test.ts"],
          globalSetup: ["./integration-tests/global-setup.ts"],
          setupFiles: ["./integration-tests/setup.ts"],
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
    ],
  },
})
