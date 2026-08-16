# Demo polish release

- Released: 2026-08-16
- ECS task definition: `salon-de-lien-staging-web:266`
- ECR tag: `demo-polish-20260816-01`
- ECR digest: `sha256:a0adf3c5d9cd82a6992e816df13654edde546ac9e7703ddd4057aa63f70766f7`
- Canonical patch commit: `ef1dfdad8003eabd70b2dac450b49543638b0900`
- Previous task definition: `salon-de-lien-staging-web:265`
- Previous digest: `sha256:fc7aec2a6862f56b08739e16d8cc13b17cc4c400c16c234867e739edbb778d04`

## Runtime changes

- Manufacturer review filtering defaults to all manufacturers.
- Completed tenant setup launchers are removed.
- The global staff-add shortcut is removed; staff management remains in store settings.
- Desktop style details use a balanced media-and-comments layout.
- The showcase tenant has 72 customers, 216 appointments, and customer comments on all ten style posts.

The showcase expansion is restricted to `org_showcase_yohaku` and is idempotent.
No production salon customer records are modified by the data script.
