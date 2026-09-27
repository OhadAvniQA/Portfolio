# QA Portfolio — Ohad Avni

QA engineer working on web and mobile-web products: manual and exploratory testing, UI
automation, API and database verification, and CI pipelines that run it all unattended.

## What is in this repository

| Folder / file | What it is |
|---|---|
| [`playwright-e2e/`](playwright-e2e/) | End-to-end UI automation suite (Playwright, JavaScript) for a live React Native Web app, wired into GitHub Actions. Start here. |
| [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) | The CI pipeline: runs the suite on every push and pull request, nightly, and on demand; publishes the HTML report and uploads traces on failure. |
| [`katalon/`](katalon/) | Katalon Studio script covering the phone + OTP registration flow, generating a unique phone number per run so the account is never already registered. |
| [`database/`](database/) | MongoDB snippets used during testing — bulk-updating test accounts, resetting fixture data, and verifying what the UI reports against what is actually stored. |

## Highlights

**[Playwright E2E suite →](playwright-e2e/)** — three specs against a live environment, with a
[README](playwright-e2e/README.md) covering the problems that made this app awkward to automate:
clicks swallowed by an overlay (and why `force: true` does not fix that), taps rejected as a
false start when they arrive too fast for a human, per-day reward caps that make a naive
assertion flaky, and game state that differs between runs.

**[CI pipeline →](../../actions)** — the suite runs unattended on a schedule, so a regression is
caught without anyone remembering to run anything. Reports and traces are attached to every run.

**Testing beyond the UI** — the Katalon script and the database snippets cover the parts a UI
test cannot reach: a second automation stack, and verification directly against the data layer.

## Notes

Environment-specific values (URLs, tenant ids, test accounts) are read from environment variables
or repository secrets rather than being hardcoded, so the same suite can be pointed at any
environment.
