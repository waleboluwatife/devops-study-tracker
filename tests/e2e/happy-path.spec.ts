import { expect, test, type Browser, type Page } from '@playwright/test';

// A tiny valid PNG to use as "proof".
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ ...test.info().project.use });
  const page = await context.newPage();
  await page.goto('/signin');
  await page.getByPlaceholder('invited@email.com').fill(email);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByText('Leaderboard')).toBeVisible();
  return page;
}

test('log → peer verify → counts; edit clears verification', async ({ browser }) => {
  const note = `e2e ${Date.now()}`;

  // Michael (admin) invites Chisom by email.
  const michael = await signIn(browser, 'michael@e2e.test');
  await michael.goto('/settings');
  const chisomRow = michael.locator('form').filter({ has: michael.locator('input[value="Chisom"]') });
  await chisomRow.locator('input[name="email"]').fill('chisom@e2e.test');
  await chisomRow.getByRole('button', { name: 'Save' }).click();
  await expect(chisomRow.getByText('Chisom saved.')).toBeVisible();

  // Michael logs a session with a screenshot.
  await michael.goto('/log');
  await michael.locator('input[name="hours"]').first().fill('2');
  await michael.locator('input[name="labs"]').first().fill('3');
  await michael.locator('textarea[name="whatCovered"]').first().fill(note);
  await michael.locator('input[name="screenshot"]').first().setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: PNG });
  await michael.getByRole('button', { name: 'Add log' }).click();
  await expect(michael.getByText('Logged! Waiting for someone to verify it.')).toBeVisible();
  const myLog = michael.locator('li').filter({ hasText: note });
  await expect(myLog.getByText('Awaiting verification')).toBeVisible();
  // Michael cannot verify his own log: it's not in his queue.
  await expect(michael.locator('#verify li').filter({ hasText: note })).toHaveCount(0);

  // Chisom verifies it.
  const chisom = await signIn(browser, 'chisom@e2e.test');
  await chisom.goto('/log');
  const item = chisom.locator('#verify li').filter({ hasText: note });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Verify ✔' }).click();
  await expect(chisom.locator('#verify li').filter({ hasText: note })).toHaveCount(0);

  // Michael sees it verified, and it counts.
  await michael.goto('/log');
  await expect(myLog.getByText('Verified by Chisom')).toBeVisible();
  await michael.goto('/');
  await expect(michael.getByText(/\d+(\.\d+)?\s*\/ 6h verified/)).toBeVisible();

  // Editing the verified log clears the verification.
  await michael.goto('/log');
  await myLog.locator('summary', { hasText: 'Edit' }).click();
  await myLog.locator('input[name="hours"]').fill('2.5');
  await myLog.getByRole('button', { name: 'Save changes' }).click();
  await expect(myLog.getByText('Awaiting verification')).toBeVisible();

  // The syllabus highlights the current week.
  await michael.goto('/syllabus');
  await expect(michael.getByText('This week')).toBeVisible();
});

test('a log without a screenshot is flagged and cannot be verified', async ({ browser }) => {
  const note = `noproof ${Date.now()}`;
  const michael = await signIn(browser, 'michael@e2e.test');
  await michael.goto('/log');
  await michael.locator('input[name="hours"]').first().fill('1');
  await michael.locator('textarea[name="whatCovered"]').first().fill(note);
  await michael.getByRole('button', { name: 'Add log' }).click();
  await expect(michael.getByText('Logged — add a screenshot')).toBeVisible();
  await expect(michael.locator('li').filter({ hasText: note }).getByText('Missing proof')).toBeVisible();

  const chisom = await signIn(browser, 'chisom@e2e.test');
  await chisom.goto('/log');
  await expect(chisom.locator('#verify li').filter({ hasText: note })).toHaveCount(0);
});

test('people who are not members cannot sign in', async ({ page }) => {
  await page.goto('/signin');
  await page.getByPlaceholder('invited@email.com').fill('stranger@e2e.test');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByText('That email isn’t a member of the group yet.')).toBeVisible();
  await page.goto('/');
  await expect(page).toHaveURL(/\/signin/);
});
