# DiDi Referral Claimer

A browser-based tool for claiming DiDi referral discounts via DiDi's Growth API.

## What it does

1. Takes a phone number (country calling code + local number)
2. Signs the terms & conditions via `/tc/sign`
3. Joins a referral via `/component/join`, retrying with alternate UIDs if the referrer is risk-blocked
4. Fetches reward details via `/referral_component`
5. Displays the result: success with reward breakdown, already-claimed warning, or error

## Usage

Open `index.html` in a browser — no build step or server required.

### Advanced Settings

- **UID(s)** — comma-separated referrer UIDs; tried in order on retry. Optionally falls back to random UIDs after the list is exhausted.
- **Country / City** — selects the activity ID, city ID, and discount tier automatically. Cities are grouped by discount tier in the dropdown.
- **Manual Entry** — override activity ID, activity type, city ID, and county ID directly.
- **Country Code** — two-letter country code sent to the API (e.g. `AU`).
- **TC ID List** — comma-separated terms & conditions IDs.

## City Data

City configuration lives in `cities.js`. Each entry contains:

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
cities.js       City/activity configuration data
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
