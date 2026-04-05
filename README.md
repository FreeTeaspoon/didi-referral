# DiDi Referral Claimer

A browser-based tool for claiming DiDi referral discounts and OTP gift packages via DiDi's Growth API.

## What it does

The tool supports two claim modes depending on the selected country:

### Referral mode (e.g. Australia)

1. Takes a phone number (country calling code + local number)
2. Signs the terms & conditions via `/tc/sign`
3. Joins a referral via `/component/join`, retrying with alternate UIDs if the referrer is risk-blocked
4. Fetches reward details via `/referral_component`
5. Displays the result: success with reward breakdown, already-claimed warning, or error

### OTP mode (e.g. Hong Kong)

1. Takes a phone number and sends an SMS verification code via DiDi's SMS API
2. Submits the OTP along with tracking params to claim a gift package via the gift package API
3. Displays received coupons with amounts, expiry, and usage rules

The mode switches automatically when the country is changed.

## Usage

Open `index.html` in a browser — no build step or server required.

### Settings

- **Phone Number** — country calling code (without `+`) and local number. Auto-filled from the selected country in OTP mode.
- **Country / City** — selects the activity ID, city ID, discount tier, and claim mode automatically. Cities are grouped by discount tier in the dropdown.

### Referral mode options (UID card)

- **UID(s)** — comma-separated referrer UIDs; tried in order on retry.
- **Random UIDs** — toggle to fall back to randomly generated UIDs after the list is exhausted.
- **TC ID List** — comma-separated terms & conditions IDs.
- **Manual Entry** — override activity ID, activity type, city ID, county ID, and country code directly.

### OTP mode options (OTP card)

- **Send Code** — sends an SMS to the entered phone number.
- **Verification Code** — enter the received OTP and press Claim Discount.

## City / Country Data

City configuration lives in `cities.js`. The data is structured as an array of country groups, each containing an array of cities.

### Country group fields

| Field         | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `country`     | Two-letter country code (e.g. `AU`, `HK`)                   |
| `countryName` | Display name in the country dropdown                         |
| `otp`         | If `true`, uses OTP gift package flow instead of referral   |
| `callingCode` | Default calling code pre-filled in OTP mode (e.g. `+852`)   |
| `lang`        | Language code sent with OTP requests (e.g. `zh-HK`)         |
| `campaign`    | OTP campaign parameters (`prodKey`, `dchn`, `xpsid`, `canvasId`) |

### City fields

| Field          | Description                                 |
| -------------- | ------------------------------------------- |
| `name`         | Display name in the city dropdown           |
| `cityId`       | DiDi's numeric city identifier              |
| `countyId`     | DiDi's numeric county identifier            |
| `activityId`   | Referral activity campaign ID               |
| `activityType` | Activity type code                          |
| `discount`     | Human-readable referee discount description |
| `referrer`     | Human-readable referrer reward description  |
| `tz`           | IANA timezone for "recent claim" detection  |

## Project Structure

```
index.html      HTML structure
style.css       Styles (includes dark mode)
cities.js       City/country configuration data
app.js          Application logic
package.json    Dev tooling (ESLint, Prettier)
```

## Development

```bash
npm install
npm run lint        # check for issues
npm run lint:fix    # auto-fix lint issues
npm run format      # format all files with Prettier
```
