import { test, expect } from '@playwright/test';
import { fanZoneUrl, CHALLENGE_ORG_ID, CHALLENGE_ID, PHONE, OTP, requireCredentials } from './config.js';

requireCredentials(test);

// The recorded flow is stale: the challenge used here no longer renders a JOIN
// button (the challenge has ended / the entry point changed), so the test times
// out at the first step. Kept for reference and re-recorded against a live
// challenge before it is switched back on.
test.fixme('Challenge - join a challenge as a competitor', async ({ page }) => {
  await page.goto(fanZoneUrl('challenges', CHALLENGE_ORG_ID, { challengeId: CHALLENGE_ID }));
  await page.waitForLoadState('domcontentloaded');

  const closeIcon = page.locator('.css-g5y9jx.r-1awozwy.r-18u37iz.r-16l9doz > .css-g5y9jx');
  await closeIcon.waitFor({ state: 'visible' });
  await closeIcon.click();

  const joinBtn = page.locator('text=/^JOIN$/i').first();
  await joinBtn.waitFor({ state: 'visible' });
  await joinBtn.click();

  await page.getByText('USE PHONE').waitFor({ state: 'visible' });
  await page.getByText('USE PHONE').click();

  const phoneInput = page.getByRole('textbox', { name: 'Type Phone Number' });
  await phoneInput.waitFor({ state: 'visible' });
  await phoneInput.fill(PHONE);

  const nextAfterPhone = page.locator('div').filter({ hasText: /^NEXT$/ }).nth(1);
  await nextAfterPhone.waitFor({ state: 'visible' });
  await nextAfterPhone.click();

  const firstOtp = page.getByRole('textbox', { name: /Please enter OTP character/ }).nth(0);
  await firstOtp.waitFor({ state: 'visible' });
  const otpInputs = page.getByRole('textbox', { name: /Please enter OTP character/ });
  const otpCode = OTP;
  for (let i = 0; i < otpCode.length; i++) {
    await otpInputs.nth(i).fill(otpCode[i]);
  }

  const joinAfterOtp = page.locator('text=/^JOIN$/i').first();
  await joinAfterOtp.waitFor({ state: 'visible' });
  await joinAfterOtp.click();

  const selectDropdown = page.locator('div').filter({ hasText: /^Select\.\.\.$/ }).nth(3);
  await selectDropdown.waitFor({ state: 'visible' });
  await selectDropdown.click();

  // Scope to the open profile dropdown (the only list containing "kobbb"),
  // so we don't match the many "adam dawson" rows in the leaderboard behind the modal.
  const profileDropdown = page
    .locator('div')
    .filter({ has: page.getByText('kobbb', { exact: true }) })
    .last();
  const adamDawsonElement = profileDropdown.getByText('adam dawson', { exact: true });
  await adamDawsonElement.waitFor({ state: 'visible' });
  await adamDawsonElement.click();

  const nextAfterSelect = page.getByText('NEXT');
  await nextAfterSelect.waitFor({ state: 'visible' });
  await nextAfterSelect.click();

  const chooseFileBtn = page.getByRole('button', { name: 'Choose File' });
  await chooseFileBtn.waitFor({ state: 'visible' });
  await chooseFileBtn.setInputFiles('assets/K3.mp4');

  await page.getByText('go publish').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('go publish').click();

  const nextAfterPublish = page.locator('text=/^NEXT$/i').last();
  await nextAfterPublish.waitFor({ state: 'visible', timeout: 30000 });
  await nextAfterPublish.click();

  const doneBtn = page.getByText('DONE');
  await doneBtn.waitFor({ state: 'visible' });
  await doneBtn.click();
});
