import { test, expect } from '@playwright/test';
import { fanZoneUrl, POLLS_ORG_ID, OTP, requireCredentials } from './config.js';

requireCredentials(test);

/**
 * Editing the profile: change the alias, then move the account to a second phone
 * number.
 *
 * This used to be the tail of poll-answer.spec.js, for a practical reason rather
 * than a behavioural one — moving the account off TEST_PHONE releases that number,
 * so the poll test can register from scratch again the same day instead of taking
 * the "already registered" path on every run after the first.
 *
 * It is split out because it is currently BROKEN and was failing the whole poll
 * run, hiding eight passing steps behind one unrelated failure. The poll test now
 * ends at its actual assertion (the vote is recorded and a result is shown).
 *
 * WHY IT IS test.fixme
 * --------------------
 * The route into the profile changed since the flow was recorded, in two places:
 *
 *   1. The header gained coin / gem / XP icons, so the recorded `img.nth(2)` — once
 *      the avatar — now resolves to a currency icon. Clicking the right-most header
 *      control by coordinate opens something, but not the profile panel.
 *   2. `getByRole('img', { name: 'info' })` never appears, so whatever the avatar
 *      now opens, it is not the screen this step expects.
 *
 * The steps below are the recorded flow with the locators left as they were. They
 * are kept rather than deleted because the sequence (alias -> phone -> OTP resend)
 * is still correct; only the entry point needs re-deriving against the live app.
 *
 * TO FINISH THIS
 * --------------
 * Drive the live header and find how the profile is actually reached now — ideally
 * a URL, since a direct navigation is stabler than clicking through a header that
 * has already drifted twice. Then replace the first two lines of the step below.
 *
 * It also needs a logged-in session of its own. Registration in this app is
 * triggered by voting, not by a standalone login screen, which is why this lived
 * inside the poll test; a helper shared by both specs is the tidy way to do it.
 */

const EDIT_PHONE = process.env.TEST_PHONE_EDIT;
const EDIT_ALIAS = process.env.TEST_ALIAS_EDIT;

const T = {
  edit: /ערוך|Edit|Modifica/i,
  phoneLabel: /טלפון|Phone|Telefono/i,
  send: /שלח|Send|Invia/i,
  next: /הבא|Next|Avanti/i,
};

test.fixme('Profile - edit alias and move the account to a second number', async ({ page }) => {
  await page.goto(fanZoneUrl('polls', POLLS_ORG_ID), { waitUntil: 'domcontentloaded' });

  // TODO: establish a logged-in session (see note above).

  await test.step('open the profile', async () => {
    const vp = page.viewportSize() || { width: 1280, height: 720 };
    await page.mouse.click(vp.width - 28, 26);
    await page.waitForTimeout(1500);
    await page.getByRole('img', { name: 'info' }).click();
  });

  await test.step('edit the alias', async () => {
    await page.getByRole('link', { name: T.edit }).click();
    // fill() replaces the value outright; the recorded version pressed ArrowRight
    // fourteen times to walk the caret to the end before typing.
    await page.getByRole('textbox').first().fill(EDIT_ALIAS);
  });

  await test.step('move the account to the second number', async () => {
    await page.getByText(T.phoneLabel).first().click();
    await page.locator('input[type="tel"]').fill(EDIT_PHONE);
    await page.getByText(T.send).first().click();
    await expect(page.getByText(T.next)).toBeVisible();
  });
});
