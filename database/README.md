# Database verification

Queries used while testing, for the checks a UI test cannot make: confirming that what the
screen reports matches what is actually stored, preparing fixture data, and telling a
configuration gap apart from an application bug.

## mongodb-queries.js

MongoDB shell snippets for maintaining test accounts — for example bulk-rewriting the email
domain of every QA account so a batch of users can be reused without re-registering them.

Useful when a flow can only run once per account (registration, first-time onboarding, one-off
rewards) and the alternative is creating accounts by hand.
