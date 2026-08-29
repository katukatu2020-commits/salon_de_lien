# Campaign admin shell v458

Rebuilds only the staff campaign page shell on top of the currently approved
v457 production image.

The campaign CRUD, recipient, image upload, and customer campaign behavior are
left unchanged. The custom `.shell/.side/.top` document is replaced with the
same AppShell DOM, Next.js stylesheet, sidebar lifecycle, header runtime, and
workspace tabs used by `/admin/customers`.
