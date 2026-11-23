import { expect, test } from '@playwright/test';
import { API, apagarUsuario, criarUsuarioConfirmado, DEMO, entrarPelaTela, token } from './apoio';

/** Roteiro, Ato 1 (login e cadastro) e Ato 4.1 (notificações). */
test.describe('Conta', () => {
  test('1.9 login com senha errada mostra erro', async ({ page }) => {
    await entrarPelaTela(page, DEMO.cliente, 'senha-errada-123');
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('1.9 Facebook mostra "em breve"', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Facebook' }).click();
    await expect(page.getByText(/Facebook em breve/)).toBeVisible();
  });

  test('CE-1 login do cliente leva à home do perfil e o sino mostra notificações', async ({ page }) => {
    await entrarPelaTela(page, DEMO.cliente);
    await expect(page).toHaveURL(/\/app$/);
    const sino = page.getByRole('button', { name: /Notificações, \d+ não lida/ });
    await expect(sino).toBeVisible();
    await sino.click();
    await expect(page.getByText('Seu pedido está a caminho')).toBeVisible();
  });

  test('CE-1 cada perfil cai na sua área', async ({ page }) => {
    await entrarPelaTela(page, DEMO.restaurante);
    await expect(page).toHaveURL(/\/restaurante$/);
  });

  test('CE-2 cadastro: perfil → dados do cliente → planos (conta criada no banco)', async ({ page }) => {
    const email = `e2e.${Date.now()}@cleaneats.test`;
    const senha = 'Teste@2026x';
    const id = await criarUsuarioConfirmado(email, senha, 'Marina Lima');
    try {
      await entrarPelaTela(page, email, senha);
      await expect(page).toHaveURL(/\/cadastro\/perfil$/);
      await expect(page.getByRole('radio', { name: /Sou Cliente/ })).toHaveAttribute('aria-checked', 'true');
      await page.screenshot({ path: 'e2e-capturas/tela-04.png', fullPage: true });
      await page.getByRole('button', { name: 'Continuar como Cliente' }).click();

      await expect(page).toHaveURL(/\/cadastro\/cliente$/);
      await page.getByRole('radio', { name: /Emagrecimento/ }).click();
      await page.getByRole('button', { name: /Sem glúten/ }).click();
      await page.getByLabel('Peso atual').fill('64');
      await page.getByLabel('Altura').fill('165');
      await page.getByLabel('Idade').fill('29');
      await expect(page.getByText('23,5')).toBeVisible();                 // IMC calculado na hora
      await expect(page.getByText('1.800', { exact: false }).first()).toBeVisible();
      await page.screenshot({ path: 'e2e-capturas/tela-05.png', fullPage: true });
      await page.getByRole('button', { name: 'Ver planos disponíveis' }).click();

      await expect(page).toHaveURL(/\/planos\?onboarding=1$/);
      // a conta agora tem perfil CLIENTE no backend
      const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${await token(email, senha)}` } }).then((r) => r.json());
      expect(me.perfil).toBe('CLIENTE');
      expect(me.tier).toBe('FREE');
    } finally {
      await apagarUsuario(id);
    }
  });
});
