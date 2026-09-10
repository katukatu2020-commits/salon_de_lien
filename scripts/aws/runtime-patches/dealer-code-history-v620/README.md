# Dealer code and salon order history v620

Corrects the salon wholesale workspace without changing dealer delivery operations.

- Projects each connected dealer's own `dealerCode` into the salon bootstrap payload.
- Labels and displays the dealer-specific connection code instead of the salon customer code.
- Removes the delivery-note column and print action from salon order history.
- Redirects authenticated salon users away from legacy delivery-note direct links.
- Keeps dealer-side delivery-note display and printing unchanged.
- Verifies the receipt-printer runtime assets remain byte-for-byte unchanged.
