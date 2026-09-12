# Booking confirmation name v635

This immutable child-image patch keeps customer furigana stored for search and
administration while removing an accidentally concatenated kana reading from
the customer name shown on confirmed booking history cards.

- The change is limited to `予約登録` / `予約確定` operation-history cards.
- Two-token katakana names and ordinary customer names are preserved.
- No customer, appointment, or furigana data is modified.
