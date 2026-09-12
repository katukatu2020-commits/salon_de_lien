# Customer registration name fields v633

This runtime release separates customer registration into surname, given name,
surname kana, and given-name kana fields.

- All four values are required and normalized on the server.
- Hiragana and half-width kana readings are normalized to full-width katakana.
- The existing `Customer.name` display value remains `surname given-name` for
  compatibility.
- Structured name values are persisted after any provisional-customer merge.
- Startup creates and verifies the four nullable database columns before the
  application starts.
