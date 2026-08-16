import { expect, test } from '@playwright/test';

/**
 * Il registro di studio e la navigazione raggruppata:
 * 1. consultare una voce, autovalutarla, ritrovarla nel riepilogo di /studio;
 * 2. lo studio fatto in una tab compare dal vivo nella tab del registro
 *    (eventi storage: si studia da più tab, si consulta da una);
 * 3. i menu Esplora/Studia portano alle viste.
 */

test('consultazione, autovalutazione e riepilogo dei progressi', async ({ page }) => {
  await page.goto('voce/ficino');
  const studio = page.getByRole('region', { name: /studio di questa voce/i });
  await expect(studio.getByText(/Prima consultazione/)).toBeVisible();

  await studio.getByRole('button', { name: /Assimilata/ }).click();
  await expect(studio.getByRole('button', { name: /Assimilata/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('studio');
  await expect(page.getByText(/1 voci consultate su \d+ · 1 assimilate · 0 da ripassare/)).toBeVisible();
  await expect(page.getByText(/mai iniziato/).first()).toBeVisible();
});

test('lo studio fatto in un’altra tab compare dal vivo nel registro', async ({ context }) => {
  const tabRegistro = await context.newPage();
  await tabRegistro.goto('studio');
  await expect(tabRegistro.getByText(/0 voci consultate su/)).toBeVisible();

  const tabVoce = await context.newPage();
  await tabVoce.goto('voce/agrippa');
  await tabVoce.getByRole('button', { name: /Da ripassare/ }).click();

  // nessun ricaricamento: l'evento storage attraversa le tab
  await expect(tabRegistro.getByText(/1 voci consultate su/)).toBeVisible();
  await expect(
    tabRegistro.getByRole('heading', { name: /Da ripassare/ }).locator('..').getByRole('link', { name: /Agrippa/ })
  ).toBeVisible();
});

test('la navigazione raggruppata: Studia ed Esplora', async ({ page }) => {
  await page.goto('.');
  await page.locator('summary', { hasText: 'Studia' }).click();
  await page.getByRole('link', { name: 'I tuoi progressi' }).click();
  await expect(page).toHaveURL(/\/studio/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('progressi');

  await page.locator('summary', { hasText: 'Esplora' }).click();
  await page.getByRole('link', { name: 'Tempo' }).click();
  await expect(page).toHaveURL(/\/tempo/);
});
