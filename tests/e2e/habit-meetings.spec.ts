import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('every page loads for a member', async ({ browser }) => {
  const michael = await signIn(browser, 'michael@e2e.test');
  const pages: [string, string | RegExp][] = [
    ['/scoreboard', 'Scoreboard'], ['/fines', 'Fines and pool'], ['/progress', 'My progress'],
    ['/archive', 'Archive'], ['/streaks', 'Daily streaks'], ['/meetings', 'Meetings'],
    ['/certs', 'Cert tracker'], ['/activity', 'Activity'], ['/notifications', 'Notifications'],
  ];
  for (const [path, title] of pages) {
    const res = await michael.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(michael.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }
  const ics = await michael.request.get('/api/meeting.ics');
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain('RRULE:FREQ=WEEKLY');
});

test('focus timer → log prefilled; studying now shows to others', async ({ browser }) => {
  const michael = await signIn(browser, 'michael@e2e.test');
  // The e2e database is never reset: close a session left open by an earlier run.
  const leftover = michael.getByRole('button', { name: '■ Stop and log it' });
  if (await leftover.isVisible()) { await leftover.click(); await michael.waitForURL(/\/log/); await michael.goto('/'); }
  await michael.getByRole('button', { name: '▶ Start a focus session' }).click();
  await expect(michael.getByRole('button', { name: '■ Stop and log it' })).toBeVisible();

  const chisom = await signIn(browser, 'chisom@e2e.test');
  await expect(chisom.getByText(/Michael Akande · \d+ min/)).toBeVisible();

  await michael.getByRole('button', { name: '■ Stop and log it' }).click();
  await expect(michael).toHaveURL(/\/log\?hours=0\.25/);
  await expect(michael.locator('#add input[name="hours"]')).toHaveValue('0.25');
});

test('RSVP, check-in, deliverable, nudge, progress, mock score', async ({ browser }) => {
  const michael = await signIn(browser, 'michael@e2e.test');
  await michael.goto('/meetings');
  await michael.getByRole('button', { name: 'Going', exact: true }).click();
  await expect(michael.getByText('See you there.')).toBeVisible();
  await michael.getByRole('button', { name: /check in/ }).click();
  await expect(michael.getByText(/Check-in opens|This meeting is over|Checked in/).first()).toBeVisible();
  await michael.getByLabel('Your deliverable (GitHub link)').fill('https://github.com/michael/week-demo');
  await michael.getByRole('button', { name: 'Save link' }).click();
  await expect(michael.getByText('Deliverable link saved.')).toBeVisible();
  await michael.reload();
  await expect(michael.getByRole('link', { name: 'github.com/michael/week-demo' })).toBeVisible();

  // Nudge someone who hasn't studied today (once a day).
  await michael.goto('/streaks');
  const nudge = michael.getByRole('button', { name: /👋 Nudge/ }).first();
  if (await nudge.count()) {
    await nudge.click();
    await expect(michael.getByRole('button', { name: 'Nudged today' }).first()).toBeVisible();
  }

  // Progress: tapping a module cycles its status and persists.
  await michael.goto('/progress');
  const mod = michael.getByRole('button', { name: /: not started\. Tap to change\./ }).first();
  const label = (await mod.getAttribute('aria-label'))!.split(':')[0];
  await mod.click();
  await expect(michael.getByRole('button', { name: `${label}: in progress. Tap to change.` })).toBeVisible();
  await michael.waitForTimeout(800);
  await michael.reload();
  await expect(michael.getByRole('button', { name: `${label}: in progress. Tap to change.` })).toBeVisible();

  // Certs: log a mock score.
  await michael.goto('/certs');
  const score = String(1 + (Date.now() % 99));
  await michael.getByLabel(/Mock exam score for/).first().fill(score);
  await michael.getByRole('button', { name: 'Log mock score' }).first().click();
  await expect(michael.getByText(`Saved ${score}%.`)).toBeVisible();

  // It all shows in the activity feed.
  await michael.goto('/activity');
  await expect(michael.getByText(`Michael Akande scored ${score}%`).first()).toBeVisible();
});
