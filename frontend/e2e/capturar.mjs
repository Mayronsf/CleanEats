// Capturas logadas para comparar com telas-html (não é teste; uso manual).
//   node e2e/capturar.mjs <pasta-saida> <email> <rota>[,<rota>...] [largura]
import { chromium } from '@playwright/test';

const [saida, email, rotas, largura = '1440'] = process.argv.slice(2);
const navegador = await chromium.launch({ channel: 'chrome' });
const pagina = await navegador.newPage({ viewport: { width: Number(largura), height: 900 }, locale: 'pt-BR', timezoneId: 'America/Recife' });
await pagina.goto('http://localhost:5180/login');
await pagina.getByLabel('Email').fill(email);
await pagina.getByLabel('Senha', { exact: true }).fill('CleanEats@2026');
await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
await pagina.waitForURL((u) => !u.pathname.startsWith('/login'));
for (const rota of rotas.split(',')) {
  await pagina.goto(`http://localhost:5180${rota}`);
  await pagina.waitForLoadState('networkidle');
  await pagina.waitForTimeout(800);
  const nome = rota.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'raiz';
  await pagina.screenshot({ path: `${saida}/app-${nome}-${largura}.png`, fullPage: true });
  console.log(`✓ ${rota}`);
}
await navegador.close();
