import { expect, test } from '@playwright/test';

/** Roteiro, Ato 1 (parte pública) e Ato 2.3/2.4 (ficha do QR Code). */
test.describe('Páginas públicas', () => {
  test('1.1 landing mostra destaques e números vindos do banco', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('melhor');
    const destaques = page.getByRole('region', { name: /pratos mais pedidos/i }).getByRole('article');
    await expect(destaques).toHaveCount(4);
    await expect(destaques.first()).toContainText('Frango Grelhado Fitness');
    await expect(page.getByText('Restaurantes parceiros', { exact: true })).toBeVisible();
    // carrossel do hero troca o prato em destaque
    await page.getByRole('button', { name: 'Próximo prato' }).click();
    await expect(page.getByRole('group', { name: 'Pratos em destaque' })).toContainText('02 de 4: Bowl Vegano Power');
  });

  test('1.2 planos: preços da tela 09 vindos da tabela tier', async ({ page }) => {
    await page.goto('/planos');
    await expect(page.getByRole('article', { name: 'Plano Pro' })).toContainText('47');
    await page.getByRole('radio', { name: 'Mensal' }).click();
    await expect(page.getByRole('article', { name: 'Plano Basic' })).toContainText('29');
    await expect(page.getByRole('article', { name: 'Plano Premium' })).toContainText('89');
    await expect(page.getByRole('table')).toContainText('5 dúvidas/dia');
    await page.getByText('Posso mudar de plano depois?').click();
    await expect(page.getByText(/upgrade ou downgrade/)).toBeVisible();
  });

  test('1.3 termos e privacidade abrem', async ({ page }) => {
    await page.goto('/termos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Termos de');
    await page.goto('/privacidade');
    await expect(page.getByRole('heading', { name: 'Seus direitos' })).toBeVisible();
  });

  test('2.4 ficha técnica pública do prato (QR Code)', async ({ page }) => {
    await page.goto('/ficha/00000000-0000-4000-b000-000000000001');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Frango Grelhado Fitness');
    await expect(page.getByText('420 kcal')).toBeVisible();
    await expect(page.getByText('Filé de frango', { exact: true })).toBeVisible();
    await expect(page.getByText('Aprovado por nutricionista')).toBeVisible();
  });

  test('ficha de prato rejeitado não é pública', async ({ page }) => {
    await page.goto('/ficha/00000000-0000-4000-b000-000000000019');
    await expect(page.getByText('Ficha não encontrada')).toBeVisible();
  });

  test('6.10 página 404', async ({ page }) => {
    await page.goto('/nao-existe-esta-pagina');
    await expect(page.getByText('Página não encontrada')).toBeVisible();
  });
});
