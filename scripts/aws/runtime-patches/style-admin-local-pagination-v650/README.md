# Style admin local pagination v650

- Keeps staff style-list page changes entirely inside the existing document.
- Sends the requested page directly to the list API without changing browser history or the URL.
- Preserves the v649 viewport and list-height safeguards while per-post controls are reattached.
- Leaves filter and sort URL behavior unchanged.
- Covers page 1 to 3 at desktop and mobile widths with delayed router wrappers enabled.
