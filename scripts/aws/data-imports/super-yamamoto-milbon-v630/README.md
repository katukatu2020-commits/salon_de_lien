# Super Yamamoto Milbon catalog v630

Imports the active, priced products from the supplied Milbon price workbook into the dealer identified by `DLR-60EA86D040`.

Verified release manifest:

- Source SHA-256: `af903769b796426596abdac67573fec69e51c6a49b5c910dce301e6cc8f9f769`
- Normalized products: `2,644`
- Catalog SHA-256: `6565533c46700690230b99f437fb19b57e3aa4a38f53eb383e9fd5e234b3b707`

- Uses the salon price as `wholesalePrice` and the suggested retail price when supplied.
- Preserves capacity, package quantity, release date, and source notes in `description`.
- Excludes rows marked as discontinued, rows without a salon price, the historical discontinued AJ sheet, and the repair price sheet.
- Upserts by dealer and product code without removing unrelated products.
- Stores the source hash, catalog hash, and row counts in `WholesaleDealerCatalogImport`.
- Verifies every stored field against the normalized catalog before committing.
