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

## UI Design

The interface is a single-column layout centered on the page, built entirely with vanilla HTML and CSS. All styling lives in `style.css` and uses CSS custom properties for theming.

### Background and Color Scheme

The page background uses a flat solid color controlled by the `--bg` custom property. In light mode this is `#ffffff` (white); in dark mode it switches to `#1a1a1a` (near-black) via a `prefers-color-scheme: dark` media query. The body is set to full viewport height (`min-height: 100vh`) with horizontal centering via flexbox, and content is constrained to a `540px` max-width container.

Two surface-level color tiers sit on top of the background:

| Variable     | Light         | Dark          | Used for                          |
| ------------ | ------------- | ------------- | --------------------------------- |
| `--bg`       | `#ffffff`     | `#1a1a1a`     | Page background, raw-JSON blocks  |
| `--surface`  | `#ffffff`     | `#262626`     | Card backgrounds, inputs          |
| `--surface2` | `#f5f5f5`     | `#333333`     | Reward items, join-info panels    |

Borders (`--border`) are `#e5e5e5` in light / `#404040` in dark. Cards cast a subtle box shadow (`1px 4px 10px -3px`) whose opacity increases in dark mode. The accent color is DiDi orange (`#ff6611`), used for the heading highlight, buttons, active toggles, and focus rings.

### Cards

Cards are the primary layout containers. Each card is a `<div class="card">` with `10px` border radius, `16px 20px` padding, and `16px` bottom margin. On narrow viewports (≤ 480 px) padding shrinks to `14px 16px`.

**Background** — cards use the `--surface` color: `#ffffff` in light mode, `#262626` in dark mode. This matches the page background in light mode (both white) but lifts off the darker `#1a1a1a` page in dark mode, creating a visible card layer.

**Border** — a `1px solid` line using `--border`: `#e5e5e5` (light) / `#404040` (dark).

**Drop shadow** — defined by the `--shadow` custom property:

| Mode  | Value                                    | Effect                                                        |
| ----- | ---------------------------------------- | ------------------------------------------------------------- |
| Light | `1px 4px 10px -3px rgba(0, 0, 0, 0.1)`  | 10 % black, offset 1 px right / 4 px down, 10 px blur, 3 px inward spread |
| Dark  | `1px 4px 10px -3px rgba(0, 0, 0, 0.4)`  | 40 % black — same geometry but four times the opacity for visibility against the dark background |

The shadow uses the same offsets and radii in both modes; only the alpha channel changes (`0.1` → `0.4`) so the shadow remains perceptible on dark surfaces without appearing heavy on light ones.

The page renders the following cards top-to-bottom:

| Card                | HTML id / class     | Visible when           | Contents                                                                                         |
| ------------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Phone Number**    | `.card` (first)     | Always                 | Country calling code input (with `+` prefix) and phone number input, side by side in a flex row  |
| **Country / City**  | `#countryCityCard`  | Always                 | Two-column grid with country and city `<select>` dropdowns; dashed-border info panels for discount/referrer values appear below each dropdown when a city is selected |
| **UID**             | `#uidCard`          | Referral mode          | Two-column grid with UID and TC ID inputs; toggle switches for "Random UIDs" and "Manual Entry"  |
| **Manual Fields**   | `#manualFields`     | Manual Entry toggle on | Five-field grid for activity ID, activity type, city ID, county ID, and country code             |
| **OTP**             | `#otpCard`          | OTP mode               | OTP code input and "Send Code" button in a flex row                                              |

Cards are shown or hidden via inline `style="display: none"` toggled by `app.js` when the country or manual-entry toggle changes.

### Result Card

The result card (`.result-card`, `#resultCard`) differs from input cards. It is hidden by default (`display: none`) and revealed with the `.show` class after a claim attempt. It has no padding of its own; instead it is split into two zones:

- **Header** (`.result-header`) — colored background strip with a status badge and message. The background color changes by outcome: green (`#f0fdf4`) for success, amber (`#fffbeb`) for warning, red (`#fef2f2`) for error. In dark mode these shift to deep-tone equivalents (`#14532d`, `#78350f`, `#7f1d1d`).
- **Body** (`.result-body`) — contains reward breakdown items (`.reward-item`) or coupon details, each on a secondary-surface (`--surface2`) background with rounded corners. A collapsible raw-JSON block (`.raw-json`) lets users inspect the full API response.

### Badges

Status badges (`.badge`) are pill-shaped labels (`border-radius: 9999px`) in the result header. They use semantic background/text color pairs: green for success, amber for warning, red for error, with inverted palettes in dark mode.

### Buttons

The primary action button (`#claimBtn`) spans the full container width with DiDi orange (`--accent`) background, white text, and `10px` border radius. On hover it darkens to `--accent-hover` (`#e8590a`); on click it scales down slightly (`scale(0.985)`). While a claim is in progress a CSS spinner appears via the `.loading` class. The "Send Code" button in the OTP card shares the same base style but is fixed at `120px` wide.

### Progress Indicator

The progress panel (`.progress`) appears between the button and result card during a claim. Each step is a flex row with a colored dot: grey (idle), pulsing orange (active), green (done), or red (failed). Steps are separated by `1px` bottom borders.

### Dark Mode

Dark mode activates automatically via `@media (prefers-color-scheme: dark)`. It overrides all CSS custom properties in `:root` — backgrounds darken, text lightens, borders become more subtle, and shadows deepen. Result-header and badge colors swap to dark-background/light-text versions to maintain contrast. No additional class or toggle is required.

### Responsive Behavior

A single `@media (max-width: 480px)` breakpoint reduces body padding from `48px 20px` to `32px 16px`, tightens card padding, and narrows field-grid gaps. The two-column field grids remain intact but with less spacing.

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
