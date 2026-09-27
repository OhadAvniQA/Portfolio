/**
 * Central test configuration.
 *
 * Everything environment-specific comes from environment variables so that no
 * URLs, tenant ids or credentials are committed to the repository. Locally use a
 * .env file (see .env.example); in CI use GitHub Actions secrets.
 */

/**
 * There are deliberately no fallback values here. A default is the same thing as
 * a committed credential once it is written down, so the suite reads every value
 * from the environment and reports "skipped" when one is missing — see
 * requireEnvironment / requireCredentials below.
 */
export const BASE_URL = process.env.APP_BASE_URL;

/** Tenant / organization ids used by the different suites. */
export const ORG_ID = process.env.ORG_ID;
export const POLLS_ORG_ID = process.env.POLLS_ORG_ID;
export const CHALLENGE_ORG_ID = process.env.CHALLENGE_ORG_ID;
export const CHALLENGE_ID = process.env.CHALLENGE_ID;

/** Test account. Supplied per environment; never checked in. */
export const PHONE = process.env.TEST_PHONE;
export const OTP = process.env.TEST_OTP;

/** Build a Fan Zone URL for a given content type (games / polls / challenges). */
export function fanZoneUrl(type, orgId = ORG_ID, extra = {}) {
  const params = new URLSearchParams({
    orgId,
    flow: 'b2b',
    source: 'b2c',
    type,
    ...extra,
  });
  return `${BASE_URL}/b2b/challenges/?${params.toString()}`;
}

/** True once the suite has an environment and account to run against. */
export const IS_CONFIGURED = Boolean(BASE_URL && ORG_ID);

/**
 * Skip when no environment is configured, so a fresh clone (or a CI run without
 * secrets) reports "skipped" instead of failing against the placeholder URL.
 */
export function requireEnvironment(test) {
  test.skip(!IS_CONFIGURED, 'APP_BASE_URL / ORG_ID are not set - see README');
}

/** Skip when the test account is missing, in addition to the environment check. */
export function requireCredentials(test) {
  requireEnvironment(test);
  test.skip(!PHONE || !OTP, 'TEST_PHONE / TEST_OTP are not set - see README');
}
