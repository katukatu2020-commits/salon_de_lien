# Receipt thermal print v540

Prints checkout receipts on an 80 mm thermal-roll page whose height follows the rendered receipt content.

- Clones only the receipt into a print-only host.
- Calculates an explicit page height before the browser print dialog opens.
- Excludes application headers, sidebars, loading UI, and mobile bottom navigation.
- Keeps the existing on-screen receipt preview and native browser print dialog.
- Supports both the print button and browser/keyboard print commands.

The release is pinned to the protected v539 production image digest.
