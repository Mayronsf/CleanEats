import { defineConfig } from '@playwright/test';

/**
 * E2E do roteiro da demo (docs/roteiro-demo.md). Usa o Chrome instalado na máquina.
 * Pré-requisito: backend rodando na porta do frontend/.env.local (VITE_API_URL) com CORS para :5180.
 *   npx playwright test            (todos)
 *   npx playwright test publico    (um arquivo)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-relatorio' }]],
  use: {
    baseURL: 'http://localhost:5180',
    channel: 'chrome',
    locale: 'pt-BR',
    timezoneId: 'America/Recife',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
