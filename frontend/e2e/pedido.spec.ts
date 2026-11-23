import { expect, test } from '@playwright/test';
import { API, apagarPedido, DEMO, entrarPelaTela, token } from './apoio';

/** Roteiro, Ato 2 (o pedido do Breno): detalhe → carrinho → checkout → confirmado → acompanhamento → histórico. */
test.describe('Pedido do cliente', () => {
  test('CE-9 / CE-14: compra completa com cupom, consumo do dia e cancelamento', async ({ page }) => {
    let idPedido: string | undefined;
    try {
      const tk = await token(DEMO.cliente);
      const kcalAntes = (await fetch(`${API}/consumo-diario`, { headers: { Authorization: `Bearer ${tk}` } }).then((r) => r.json())).consumo.calorias;

      await entrarPelaTela(page, DEMO.cliente);
      await expect(page).toHaveURL(/\/app$/);
      await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cleaneats.carrinho')).forEach((k) => localStorage.removeItem(k)));

      // 12 → adiciona 2× Frango Grelhado Fitness
      await page.goto('/app/marmitas/00000000-0000-4000-b000-000000000001');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Frango Grelhado');
      await page.getByRole('button', { name: 'Aumentar' }).click();
      await page.getByRole('button', { name: 'Adicionar ao pedido' }).first().click();

      // 16 → checkout
      await expect(page).toHaveURL(/\/app\/carrinho$/);
      await expect(page.getByText('Finalize seu')).toBeVisible();
      await expect(page.getByRole('radio', { name: /Rua das Acácias/ })).toHaveAttribute('aria-checked', 'true');
      await page.getByLabel('Código do cupom').fill('VERAO2025');
      await page.getByRole('button', { name: 'Aplicar' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'expirou' })).toBeVisible();
      await page.getByLabel('Código do cupom').fill('nutri15');
      await page.getByRole('button', { name: 'Aplicar' }).click();
      await expect(page.getByText(/Cupom NUTRI15 \(−10%\)/)).toBeVisible();
      await expect(page.getByText(/Desconto Pro \(−5%\)/)).toBeVisible();
      await page.screenshot({ path: 'e2e-capturas/tela-16.png', fullPage: true });
      await page.getByRole('button', { name: 'Confirmar pedido' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmar pedido?' })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: /^Confirmar R\$/ }).click();

      // 17 → confirmado
      await expect(page).toHaveURL(/\/app\/pedidos\/[0-9a-f-]+\/confirmado$/);
      idPedido = page.url().split('/').at(-2);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu pedido');
      await expect(page.getByText(/#CE-\d+/).first()).toBeVisible();
      await expect(page.getByText('Seu dia foi')).toBeVisible();
      await page.screenshot({ path: 'e2e-capturas/tela-17.png', fullPage: true });
      const kcalDepois = (await fetch(`${API}/consumo-diario`, { headers: { Authorization: `Bearer ${tk}` } }).then((r) => r.json())).consumo.calorias;
      expect(kcalDepois).toBe(kcalAntes + 840);   // 2 × 420 kcal

      // 18 → acompanhamento e cancelamento
      await page.getByRole('link', { name: /Acompanhar entrega/ }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Aguardando o restaurante aceitar' })).toBeVisible();
      await page.screenshot({ path: 'e2e-capturas/tela-18.png', fullPage: true });
      await page.getByRole('button', { name: 'Cancelar pedido' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar pedido' }).click();
      await expect(page.getByText('Pedido cancelado').first()).toBeVisible();
      const kcalFinal = (await fetch(`${API}/consumo-diario`, { headers: { Authorization: `Bearer ${tk}` } }).then((r) => r.json())).consumo.calorias;
      expect(kcalFinal).toBe(kcalAntes);

      // 19 → histórico mostra o cancelado
      await page.goto('/app/pedidos?status=cancelados');
      await expect(page.getByText('Cancelado pelo cliente').first()).toBeVisible();
      await page.goto('/app/pedidos');
      await page.screenshot({ path: 'e2e-capturas/tela-19.png', fullPage: true });
    } finally {
      if (idPedido) await apagarPedido(idPedido);
    }
  });
});
