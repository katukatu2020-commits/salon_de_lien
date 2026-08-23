# Sales ledger scroll and print v398

- Removes the nested vertical scroll area from the sales ledger table so the whole ledger uses one predictable scroll surface.
- Converts the fixed runtime portal to a static print-only layout.
- Hides the underlying application tree during printing, preventing the fixed ledger from being repeated on every sheet.
- Prints the ledger in A4 landscape with stable column widths and selected-row filtering.
