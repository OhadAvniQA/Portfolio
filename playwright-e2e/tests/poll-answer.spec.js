import { test, expect } from '@playwright/test';
import { fanZoneUrl, POLLS_ORG_ID, PHONE, OTP, requireCredentials } from './config.js';

requireCredentials(test);

/** Overridable so a content rename does not break the suite. */
const POLL_NAME = process.env.POLL_NAME || 'Super test - Poll';
const POLL_ANSWER = process.env.POLL_ANSWER || 'No, judge was against us!';

/**
 * A fixed number stays registered after the first run, so later runs take the
 * "already registered" path and skip onboarding — the test passes either way, but
 * the first-time flow then only gets exercised once. Freeing the number again is
 * what profile-edit.spec.js is for; see the note there.
 */
const REG_PHONE = process.env.TEST_PHONE_REG || PHONE;

/**
 * UI strings are matched as alternations rather than fixed Hebrew literals.
 *
 * The app's language comes from the session (`lang` in localStorage) and is not
 * settable from the URL — `?lang=en` is ignored. A CI runner starts with empty
 * storage, so it does not necessarily resolve to the same language as a developer's
 * browser. Matching several languages costs nothing and removes the whole class of
 * failure; it does not assume any particular one is in force.
 */
const T = {
  registerWithPhone: /לרישום עם טלפון נייד|Register with phone|Registrati con il telefono/i,
  nickname: /כינוי|Nickname|Soprannome/i,
  letsPlay: /קדימה למשחק|Let'?s play|Andiamo a giocare|ANDARE/i,
  continue: /^(המשך|Continue|Continua)$/i,
  edit: /ערוך|Edit|Modifica/i,
  phoneLabel: /טלפון|Phone|Telefono/i,
  send: /שלח|Send|Invia/i,
  next: /הבא|Next|Avanti/i,
  go: /^(קדימה|GO|ANDARE|Go)$/i,
};

/**
 * The poll list renders lazily: only the first few cards are in the DOM after load.
 * "Super test - Poll" sits 11th of 17, so it is not attached at all until the list is
 * scrolled — and `scrollIntoViewIfNeeded()` cannot scroll to an element that does not
 * exist. That is what made this test burn the full 180s timeout on every run.
 */
async function revealByScrolling(page, locator, { rounds = 20, pause = 800 } = {}) {
  for (let i = 0; i < rounds; i++) {
    if (await locator.count()) return true;
    // The list lives in an inner scroll container, so page.mouse.wheel() does nothing
    // unless the pointer happens to be over it. Drive every scrollable element instead.
    await page.evaluate(() => {
      const doc = document.scrollingElement || document.documentElement;
      doc.scrollTop = doc.scrollHeight;
      for (const el of document.querySelectorAll('*')) {
        if (el.scrollHeight > el.clientHeight + 40) el.scrollTop = el.scrollHeight;
      }
    });
    await page.waitForTimeout(pause);
  }
  return (await locator.count()) > 0;
}

/**
 * The app overlays a full-viewport layer (staging disclosure / banner) that swallows
 * pointer events. `force: true` does not help — the event still lands on the topmost
 * element. Dispatching the pointer sequence on the target bypasses hit-testing, which
 * is what React Native Web listens for.
 */
async function robustClick(locator, { timeout = 8000 } = {}) {
  try {
    await locator.click({ timeout });
    return;
  } catch {
    // Synthetic dispatch does not work here — React Native Web's Pressable listens for
    // real pointer events. So instead of faking the click, take the blocker out of the
    // way: switch off pointer-events on any full-viewport overlay, then click for real.
    // What "intercepts" the click is not a banner — it is the card's own React Native
    // Web press layer: an empty `tabindex="0"` div laid over the content, which is
    // exactly what must receive the tap. Playwright refuses because the element it
    // resolved is not the topmost one, so click by coordinate instead: that lands on
    // the press layer, which is what a real user hits.
    const el = locator.first();
    await el.waitFor({ state: 'visible', timeout });
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (!box) throw new Error('Target has no bounding box; cannot click by coordinate.');
    await el.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

test('Poll - answer a poll and see the result percentage', async ({ page }) => {
  await test.step('open the polls tab', async () => {
    await page.goto(fanZoneUrl('polls', POLLS_ORG_ID), { waitUntil: 'domcontentloaded' });
    // Wait for the list itself, not an arbitrary element: the first poll card is enough.
    await expect(page.getByText(/\S/).first()).toBeVisible({ timeout: 30_000 });

    // The original recording opened with this click and it is load-bearing: it dismisses
    // the staging-environment layer that otherwise sits over the list and swallows every
    // tap. Kept as .first() because the loading spinner can add more svgs on Firefox.
    await page.locator('svg').first().click().catch(() => {});
    await page.waitForTimeout(1000);
  });

  /**
 * Click targets are the card, not the text node: dispatching on the text does nothing
 * because the handler sits on the clickable ancestor. In this React-Native-Web build
 * the class `r-1loqt21` is literally `cursor: pointer`, so it marks every clickable.
 */
const clickable = (page, text) =>
  page.locator('.r-1loqt21').filter({ hasText: text }).last();

const poll = page.getByText(POLL_NAME, { exact: true }).first();

  await test.step(`scroll to the poll "${POLL_NAME}"`, async () => {
    const found = await revealByScrolling(page, poll);
    expect(
      found,
      `Poll "${POLL_NAME}" never entered the DOM after scrolling the list. ` +
        `Either it was renamed/unpublished in org ${POLLS_ORG_ID}, or the list stopped paging.`,
    ).toBe(true);

    await poll.scrollIntoViewIfNeeded();
    await expect(poll).toBeVisible({ timeout: 10_000 });

    // The card title is NOT clickable — only the card's own CTA opens the poll. Clicking
    // the title (as the recorded version did) silently does nothing, which is what broke
    // this test. Walk from the title up to the nearest ancestor that also holds a CTA,
    // then press that. Verified: the URL gains `&pollId=…` only on this click.
    const card = poll.locator(
      'xpath=ancestor::*[.//*[normalize-space(text())="קדימה" or normalize-space(text())="GO"' +
        ' or normalize-space(text())="ANDARE"]][1]',
    );
    const cta = card.getByText(T.go).first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click({ timeout: 15_000 });

    await expect(page).toHaveURL(/pollId=/, { timeout: 15_000 });
  });

  await test.step('start the poll from the reward intro sheet', async () => {
    // Opening a poll now lands on an intro sheet — the poll name, what it pays
    // (נקודות / מטבעות / ספינים) and its own CTA. The recorded test predates this screen,
    // which is why it went looking for the answers straight away and never found them.
    // The sheet mounts after the list, so its CTA is the last one in the DOM.
    await robustClick(page.getByText(T.go).last());
    await expect(page.getByText(POLL_ANSWER)).toBeVisible({ timeout: 20_000 });
  });

  await test.step('vote', async () => {
    await robustClick(clickable(page, POLL_ANSWER));
  });

  await test.step('register with phone + OTP', async () => {
    await robustClick(page.getByText(T.registerWithPhone).first());

    const phoneBox = page.getByRole('textbox', { name: 'Type Phone Number' });
    await phoneBox.fill(REG_PHONE);
    await phoneBox.press('Enter');

    const otp = String(OTP);
    expect(otp, 'TEST_OTP must be exactly 6 characters').toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      await page.getByRole('textbox', { name: `Please enter OTP character ${i + 1}` }).fill(otp[i]);
    }
  });

  await test.step('new-user onboarding (skipped when already registered)', async () => {
    const nicknameInput = page.getByRole('textbox', { name: T.nickname });
    if (!(await nicknameInput.isVisible({ timeout: 8000 }).catch(() => false))) return;

    let nickname = 'a' + Date.now().toString().slice(-9);
    await nicknameInput.fill(nickname);
    await robustClick(page.getByText(T.letsPlay).first());

    // Alias is unique per organization; extend and retry if the screen stays.
    for (let i = 0; i < 4; i++) {
      if (!(await nicknameInput.isVisible({ timeout: 2000 }).catch(() => false))) break;
      nickname += 'x';
      await nicknameInput.fill(nickname);
      await robustClick(page.getByText(T.letsPlay).first());
    }
  });

  await test.step('vote is recorded and a result percentage is shown', async () => {
    await robustClick(clickable(page, POLL_ANSWER));
    const pollResultPercent = page.getByText(/\d+%/).first();
    await expect(pollResultPercent).toBeVisible();
    await expect(pollResultPercent).toHaveText(/\d+%/);
  });

  await test.step('leave the poll', async () => {
    for (let i = 0; i < 2; i++) {
      await robustClick(page.getByText(T.continue).first());
    }
  });
});
