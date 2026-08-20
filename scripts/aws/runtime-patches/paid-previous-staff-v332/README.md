# Paid previous staff v332

The compiled server contains the shared staff helper in several route chunks.
Depending on route load order, an older copy could win the shared module cache
and restore the former visit/appointment fallback.

This follow-up makes every duplicate helper use the same paid-sale-only rule,
so page navigation and server process warm-up order cannot change the result.
