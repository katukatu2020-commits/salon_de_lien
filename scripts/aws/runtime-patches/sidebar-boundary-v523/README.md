# Sidebar boundary v523

- Places the desktop sidebar toggle on the 288px sidebar boundary instead of the legacy 227px position.
- Keeps the collapsed toggle at the existing left-side position.
- Cache-busts the shared shell stylesheet so existing installed browser apps receive the correction immediately.
- Verifies expanded, collapsed, desktop-width, and mobile behavior with Playwright.
