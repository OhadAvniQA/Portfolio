# Katalon Studio

Record-and-playback automation built in Katalon Studio, kept alongside the code-first
Playwright suite to cover the same product with a second tool.

## katalon-registration-flow.groovy

End-to-end registration: open the app, choose phone sign-up, enter a phone number, and type the
one-time code digit by digit until the account lands in the app.

The detail worth pointing out is the phone number:

```groovy
def randomnumber = System.currentTimeMillis()
WebUI.setText(findTestObject('Main Page/input_What is your Phone Number_phone-input'),
              '+1555' + randomnumber)
```

Registration can only happen once per number, so a hardcoded one passes on the first run and
fails on every run after it. Deriving the number from the current timestamp gives each run a
fresh account and makes the test repeatable.

## Running it

The script takes the environment and the one-time code from environment variables, so nothing
environment-specific is committed:

```
APP_BASE_URL=https://app.example.com
TEST_OTP=000000
```

Both are asserted at the top of the script, so a missing value fails immediately with a clear
message rather than part-way through the flow.
