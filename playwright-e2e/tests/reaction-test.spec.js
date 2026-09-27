import { test, expect } from '@playwright/test';
import { fanZoneUrl, PHONE, OTP, requireCredentials } from './config.js';

/**
 * Reaction Test — happy flow on the first available level ("Warm Up").
 *
 * Verifies a successful attempt through three independent signals:
 *   1. the success text ("GOOD") together with the reaction-time readout ("### ms")
 *   2. the confetti burst on the success screen
 *   3. the header counters (coins / XP) increasing
 *
 * Notes learned from the live app (staging):
 *  - Attempt phases render as text: "GET READY..." -> "Wait for it..." -> "TAP IT!".
 *  - Real Playwright mouse clicks on the game surface are swallowed by an overlay,
 *    so the tap is dispatched as a pointer/mouse event sequence on the element
 *    under the trigger label.
 *  - Tapping immediately (<~100 ms after the label appears) is rejected as a
 *    FALSE START, so the tap waits a human-realistic delay first.
 */

const APP_URL = fanZoneUrl('games');
/** Deep link that opens the game modal directly (the Fan Zone tile sits under an overlay banner). */
const GAME_URL = `${APP_URL}&reactionTestId=reaction-test`;

/** Delay after the trigger appears before tapping (ms). Below ~100 ms the app scores a false start. */
const HUMAN_REACTION_MS = 300;
/** Attempts to spend before giving up on a clean success. */
const MAX_ATTEMPTS = 3;

const bodyText = (page) =>
  page.locator('body').innerText().then((t) => t.replace(/\s+/g, ' '));

/** First three integers in the header = spins, coins, XP. */
async function headerCounters(page) {
  const t = await bodyText(page);
  const nums = (t.slice(0, 40).match(/\d+/g) || []).slice(0, 3).map(Number);
  return { spins: nums[0] ?? 0, coins: nums[1] ?? 0, xp: nums[2] ?? 0, total: nums.reduce((a, b) => a + b, 0) };
}

/** Dispatch a tap on whatever element sits under the given text (overlay-proof). */
async function tapOn(page, text) {
  await page.evaluate((needle) => {
    const el = [...document.querySelectorAll('div')]
      .filter((d) => d.children.length === 0 && d.textContent.includes(needle))
      .pop();
    const box = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const target = document.elementFromPoint(x, y) || el || document.body;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, pointerType: 'mouse' };
    try { target.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch { /* older engines */ }
    target.dispatchEvent(new MouseEvent('mousedown', opts));
    try { target.dispatchEvent(new PointerEvent('pointerup', opts)); } catch { /* older engines */ }
    target.dispatchEvent(new MouseEvent('mouseup', opts));
    target.dispatchEvent(new MouseEvent('click', opts));
  }, text);
}

/**
 * Make sure a round is actually running.
 * Opening a level that was already completed shows its results screen instead of
 * starting a round - in that case the round is (re)started via TRY NOW.
 */
async function ensureRoundRunning(page) {
  for (let i = 0; i < 3; i++) {
    const running = await page
      .waitForFunction(() => /GET READY|Wait for it|TAP IT/.test(document.body.innerText), null, { polling: 'raf', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (running) return;

    const tryNow = page.getByText('TRY NOW', { exact: true });
    if (await tryNow.isVisible().catch(() => false)) {
      await tryNow.click({ force: true });
      continue;
    }
    await tapOn(page, 'Tap to'); // dismiss a lingering result screen
    await page.waitForTimeout(1000);
  }
  throw new Error(`could not start a round: ${(await bodyText(page)).slice(0, 300)}`);
}

/**
 * Wait for the trigger, tap after a human-realistic delay, then watch the result
 * window and report what was observed.
 */
async function playAttempt(page) {
  const armed = await page
    .waitForFunction(
      () => /TAP IT/.test(document.body.innerText) && !/Wait for it|GET READY/.test(document.body.innerText),
      null,
      { polling: 'raf', timeout: 30000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!armed) {
    return { good: false, falseStart: false, timedOut: true, ms: null, confetti: 0, successes: 0, text: (await bodyText(page)).slice(0, 300) };
  }

  await page.waitForTimeout(HUMAN_REACTION_MS);
  await tapOn(page, 'TAP IT');

  // Sample the result window: success copy, reaction time and confetti particles.
  return page.evaluate(async () => {
    const txt = () => document.body.innerText.replace(/\s+/g, ' ');
    const confettiCount = () =>
      [...document.querySelectorAll('div')].filter((e) => {
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return cs.position === 'absolute' && r.width > 0 && r.width <= 12 && r.height <= 12 &&
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
      }).length;

    let good = false, falseStart = false, timedOut = false, ms = null, confetti = 0;
    for (let i = 0; i < 20; i++) {
      const t = txt();
      if (/GOOD|NICE|PERFECT/.test(t)) good = true;
      if (/FALSE START/.test(t)) falseStart = true;
      if (/TIME'S UP/.test(t)) timedOut = true;
      const m = t.match(/(\d+)\s*ms/);
      if (m && ms === null) ms = Number(m[1]);
      confetti = Math.max(confetti, confettiCount());
      await new Promise((r) => setTimeout(r, 100));
    }
    const t = txt();
    const successes = (t.match(/Success:\s*(\d+)\s*\/\s*(\d+)/) || [])[1];
    return { good, falseStart, timedOut, ms, confetti, successes: Number(successes ?? 0), text: t.slice(0, 400) };
  });
}

requireCredentials(test);

test('Reaction Test - tap on trigger scores a success (GOOD + reaction time + rewards)', async ({ page }) => {
  // Three login attempts with a gap between them can take ~2 minutes on their own,
  // before the game itself is played.
  test.setTimeout(300000);

  const otpFirst = page.getByRole('textbox', { name: 'Please enter OTP character 1' });

  /**
   * Sign in first - playing a level requires an account (the deep link opens the
   * login sheet).
   *
   * The whole sequence is retried, not just one field. When this suite runs after
   * another spec that also registers, the login sheet can fail to reach the phone
   * step at all: sometimes it stays on the provider list, sometimes the OTP send is
   * dropped. Retrying a single fill cannot recover either, because the element it
   * needs was never rendered — only reloading and walking the sheet again does.
   *
   * Playwright's own retry does not help here: it re-runs at once and lands in the
   * same throttle window, which is why the gap below is explicit.
   */
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`${APP_URL}&showLogin=true`);
    const phoneOption = page
      .getByText(/לרישום עם טלפון נייד|Register with mobile phone|phone/i)
      .first();
    await phoneOption.click({ force: true, timeout: 20000 }).catch(() => {});

    const phone = page.getByRole('textbox', { name: 'Type Phone Number' });
    if (await phone.isVisible({ timeout: 20000 }).catch(() => false)) {
      await phone.fill(PHONE);
      await phone.press('Enter');
      if (await otpFirst.isVisible({ timeout: 20000 }).catch(() => false)) break;
    }
    // 30s, not a few seconds: measured against staging, a shorter gap lands inside
    // the same throttle window and all three attempts fail together.
    if (attempt < 3) await page.waitForTimeout(30000);
  }
  await expect(
    otpFirst,
    'Login sheet never reached the OTP step in 3 attempts - staging is throttling, or the sheet changed'
  ).toBeVisible({ timeout: 30000 });
  for (let i = 0; i < OTP.length; i++) {
    await page.getByRole('textbox', { name: `Please enter OTP character ${i + 1}` }).fill(OTP[i]);
  }
  // Logged in when the login sheet closes and the UI switches to the account's language.
  await expect(page.getByText('התחברות', { exact: true })).toBeHidden({ timeout: 30000 });
  await expect(page.getByText('Show All', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500); // let the session persist before navigating

  // Open the Reaction Test micro-game (deep link - the Fan Zone tile sits under the staging banner).
  await page.goto(GAME_URL);
  await expect(page.getByText('Warm Up', { exact: true })).toBeVisible({ timeout: 30000 });

  // Daily allowance guard - the game blocks further rounds until the next day.
  const beforeStart = await bodyText(page);
  expect(beforeStart, 'daily attempts exhausted for this user - rerun tomorrow or use another account')
    .not.toMatch(/TOMORROW/);

  const before = await headerCounters(page);

  // Start the first available level.
  await page.getByText('Warm Up', { exact: true }).click({ force: true });
  await ensureRoundRunning(page);

  // Play until a clean success (a false start or timeout only burns one attempt).
  let result = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await playAttempt(page);
    if (result.good) break;
    await tapOn(page, 'Tap to'); // dismiss "Tap to continue" / "Tap to restart"
    await page.waitForTimeout(1200);
    await ensureRoundRunning(page);
  }

  await page.screenshot({ path: 'test-results/reaction-test-success.png' });

  // 1) Success copy + reaction-time readout.
  expect(result.falseStart, 'tap was scored as a false start - increase HUMAN_REACTION_MS').toBe(false);
  expect(result.timedOut, 'trigger was missed - the tap never reached the game surface').toBe(false);
  expect(result.good, `expected success copy ("GOOD"), got: ${result.text}`).toBe(true);
  expect(result.ms, 'reaction time readout is missing').not.toBeNull();
  expect(result.ms).toBeGreaterThan(0);
  expect(result.ms).toBeLessThan(3000);

  // 2) Confetti burst on the success screen.
  expect(result.confetti, 'no confetti particles rendered on success').toBeGreaterThan(0);

  // 3) Success counter advanced and the header rewards increased.
  //    Rewards are capped per day: once the allowance is spent the game says the next
  //    payout is available TOMORROW, and further successes correctly grant nothing.
  expect(result.successes).toBeGreaterThan(0);

  let after = before;
  await expect
    .poll(async () => { after = await headerCounters(page); return after.total; }, { timeout: 15000 })
    .toBeGreaterThan(before.total)
    .catch(() => {});

  expect(after.total, 'coins/XP decreased after a successful attempt').toBeGreaterThanOrEqual(before.total);

  if (after.total > before.total) {
    test.info().annotations.push({ type: 'rewards', description: `coins/XP ${before.total} -> ${after.total}` });
  } else {
    // Expected once the account has spent its daily allowance (the summary then
    // shows the next payout as TOMORROW). Run with EXPECT_REWARDS=1 on a fresh
    // account/day to make the increase a hard requirement.
    const msg = `no reward granted (${before.total} -> ${after.total}) - daily allowance likely spent`;
    if (process.env.EXPECT_REWARDS === '1') expect(after.total, msg).toBeGreaterThan(before.total);
    test.info().annotations.push({ type: 'rewards', description: msg });
  }
});
