# Password visibility v627

Adds an accessible password visibility toggle to the three production login pages.

## Behavior

- Supports customer (`/u/login`), store (`/admin/login`), and dealer (`/dealer/login`) logins.
- Keeps passwords hidden initially and toggles between `password` and `text` without changing the value.
- Uses a 44 by 44 pixel eye button with Japanese `aria-label`, `title`, and `aria-pressed` state.
- Keeps the existing form actions, input names, autocomplete attributes, validation, and authentication handlers unchanged.
- Does not enhance registration, reset, account settings, or unrelated forms.

## Runtime scope

Only these existing runtime files are modified:

- `server.js`
- `wholesale-ordering-v543.js`

The release also adds these static assets:

- `public/password-visibility-v627.js`
- `public/password-visibility-v627.css`
