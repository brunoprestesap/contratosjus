import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Carrega `.env.test` no processo do Playwright (fixtures precisam de
// NEXTAUTH_SECRET e DATABASE_URL). O webServer herda o mesmo ambiente
// mais o que o Next carrega automaticamente de `.env.test`.
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Config do Playwright para a suíte E2E do wizard de Pesquisa de Preços.
 *
 *   - webServer sobe `npm run dev:e2e` (Next dev em 3001, NODE_ENV=test)
 *   - testDir: e2e/tests
 *   - só chromium por padrão — CI pode expandir
 *   - trace em primeira retry para depuração; screenshot + vídeo
 *     preservados em falha
 *
 * Setup inicial: `npm run test:e2e:init` (cria DB contratos_test +
 * migrations), depois `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false, // escreve/limpa mesmo DB — rodar serial evita flaky
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
