# Receipt POS height calibration v583

This protected release corrects premature receipt cuts in the Windows POS-80C
print bridge.

- Measures the complete receipt at the printer's actual 203 x 203 dpi instead
  of the 96 dpi bitmap default.
- Uses the same physical scale for both axes before creating the custom-height
  print job.
- Keeps the 80 mm roll and 72.1 mm printable-width geometry reported by the
  installed POS-80C driver.
- Adds only 5 mm of cutter feed after the final store line.
- Rejects printing if POS-80C is configured at an unexpected resolution rather
  than silently calculating an unsafe cut position.
- Preserves the v582 browser integration and ordinary browser-print fallback.

The Windows installer compiles the first-party loopback bridge, runs a rendered
self-test, registers it for the current user's startup, and restarts it in
place. No third-party POS service is required.
