# Receipt POS direct v582

This protected runtime release removes fixed-form blank feed for the connected
Windows USB receipt printer without weakening the browser-print fallback.

- Uses a loopback-only Windows bridge to submit a custom-height print job to
  `POS-80C`, so the cutter runs at the measured end of each receipt.
- Allows the receipt route, and only that route, to reach the loopback bridge.
- Keeps the existing dynamic 80 mm browser/PDF print path when the bridge is not
  installed or is unavailable.
- Preserves the v579 print API for compatibility and stops rebuilding the print
  host while a native print snapshot is being prepared.
- Ships a first-party bridge source, installer, uninstaller, and dry-run test.

The browser's physical-printer preview can only use the fixed forms exposed by
the POS-80C driver (210, 297, or 3276 mm). Direct printing is therefore required
for a reliably content-sized cut on this driver.
