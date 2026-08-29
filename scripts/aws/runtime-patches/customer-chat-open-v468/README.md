# Customer chat open v468

Protected child-image patch on top of the approved v467 production release.

- Removes the document-wide `MutationObserver` and one-second boot loop from the customer chat enhancer.
- Reinitializes the enhancer only on the initial render, browser history transitions, and `pageshow`.
- Preserves the existing staff directory, conversation rendering, 15-second message refresh, edit/delete enhancer, tenant checks, and chat API.
- Adds an actual headless-browser production smoke test that logs in, opens `/u/chat`, confirms the staff list, and opens a conversation without sending a message.

The previous observer watched every subtree mutation while `initCustomerChat()` itself appended and resized a portal. That feedback loop blocked the browser main thread even though the page HTML and `/api/lien-chat` both returned `200`.
