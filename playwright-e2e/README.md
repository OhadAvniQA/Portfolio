# Playwright E2E Suite

End-to-end UI automation for a live web application (React Native Web), running locally and
in GitHub Actions.

## What is here

| Spec | Covers |
|---|---|
| `tests/reaction-test.spec.js` | Reaction-time mini-game: login, start a level, react to the trigger, assert success copy, reaction time, confetti and reward counters |
| `tests/poll-answer.spec.js` | Answer a poll and edit the user profile |
| `tests/challenge-join.spec.js` | Join a challenge as a competitor |
| `tests/config.js` | All environment-specific values (URLs, tenant ids, credentials) read from env vars |

## Running locally

```bash
npm ci
npx playwright install --with-deps chromium

# provide the environment under test (see .env.example)
export APP_BASE_URL="https://app.example.com"
export ORG_ID="..."
export TEST_PHONE="+10000000000"
export TEST_OTP="000000"

npm test                  # all projects
npm run test:chromium     # single browser
npm run test:headed       # watch it run
npm run report            # open the HTML report
```

Tests that need an account are skipped automatically when `TEST_PHONE` / `TEST_OTP` are not set,
so the suite stays green on a fresh clone.

## CI

`.github/workflows/e2e.yml` runs the suite on push, on pull requests, nightly at 06:00 UTC, and
on demand (**Actions → E2E Tests → Run workflow**, with browser and `--grep` inputs). The HTML
report is uploaded as an artifact on every run; traces, screenshots and video are uploaded on
failure.

Configuration lives in repository secrets (**Settings → Secrets and variables → Actions**):
`APP_BASE_URL`, `ORG_ID`, `POLLS_ORG_ID`, `CHALLENGE_ORG_ID`, `CHALLENGE_ID`, `TEST_PHONE`,
`TEST_OTP`. Nothing environment-specific is committed to the repository.

## Notes on testing a timed, canvas-like UI

The reaction game surfaced a few problems that are worth recording, since they apply to most
React Native Web apps:

* **Clicks can be swallowed by overlays.** A site-wide banner sat above the game tiles, and
  `force: true` does not help - it skips the actionability check but the browser still delivers
  the event to the topmost element. The suite navigates by deep link and dispatches a
  `pointerdown → mousedown → pointerup → mouseup → click` sequence on the element resolved with
  `elementFromPoint`.
* **Reacting too fast is treated as cheating.** Tapping ~16 ms after the trigger appeared was
  scored as a *false start*, so the test waits a human-realistic 300 ms before tapping.
* **State differs between runs.** A level that was already completed opens its results screen
  instead of starting a round, so `ensureRoundRunning()` normalises the state first.
* **Rewards are capped per day.** Coins/XP only increase while the daily allowance lasts; the
  suite asserts they never decrease and enforces a strict increase only when run with
  `EXPECT_REWARDS=1`, which keeps nightly runs meaningful instead of flaky.
