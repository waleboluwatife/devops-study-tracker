import { expect, test, type Browser, type Page } from '@playwright/test';

export async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ ...test.info().project.use });
  const page = await context.newPage();
  await page.goto('/signin');
  await page.getByPlaceholder('invited@email.com').fill(email);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByText('Leaderboard')).toBeVisible();
  return page;
}
