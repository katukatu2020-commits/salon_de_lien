# Customer desktop frontend v529

This release adds a customer-facing desktop application shell without changing the mobile frontend.

- A fixed ORIMIA sidebar exposes the complete customer navigation on desktop.
- A shared desktop header provides page context, back navigation, notifications, and profile access.
- Both standalone customer pages and Next.js customer pages use the same shell.
- Desktop-only layout refinements are scoped to `min-width: 1024px`.
- At smaller widths the injected shell and stylesheet are absent, preserving the current mobile UI.
- Cache keys are advanced for both customer experience runtime entry points.

The release is based on the immutable v528 production image and is deployed through the protected ECS workflow.
