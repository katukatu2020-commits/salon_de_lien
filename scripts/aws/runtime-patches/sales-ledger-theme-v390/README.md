# Sales ledger theme v390

The production sales-ledger screen is rendered by a runtime client on top of the
current admin shell. Its active navigation item still used the old solid
`--lien-primary` treatment, while the current workspace navigation uses a soft
pink selected state.

This patch reuses the ledger client's existing `.sl-tabs` component for the
three owner-analysis destinations. That component owns the current soft-pink
selected state and prevents the legacy dark-brown Tailwind class from being
reintroduced by the runtime overlay.
