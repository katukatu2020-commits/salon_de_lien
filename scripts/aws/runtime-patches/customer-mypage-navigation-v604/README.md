# Customer My Page Navigation v604

Separates the My Page edit-mode state from the edit-action selector.

Previously, `main[data-cj-edit="false"]` still matched `[data-cj-edit]`, so the delegated click handler treated every account row and the logout button as a profile-edit action. The v604 patch gives state and actions distinct attributes, preserving each existing destination and the POST logout flow.

The customer journey asset receives a versioned URL so browsers do not retain the faulty cached script. Receipt POS, daily sales printing, style sharing, stamp rewards, and the underlying customer routes are unchanged.
