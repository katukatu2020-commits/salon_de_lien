# Receipt roll print v569

Prints checkout receipts as one content-sized page on an 80 mm mC-Print3 roll.

- Keeps the paper box at exactly 80 mm and the printable content at 72 mm.
- Measures after web fonts settle, then rounds page length to the printer's 8 dots/mm grid.
- Gives the print document, body, and isolated receipt host the same explicit dynamic height.
- Removes application chrome and avoids fixed blank paper after short receipts.
- Preserves the existing on-screen receipt preview and browser print dialog.

The release is pinned to the protected v568 production image digest.
