# Customer chat state/navigation v393

The customer chat initializer lost its local state object when the chat UI was portalized, which caused `state is not defined` on `/u/chat`. The customer shell is also rendered through the appointments route internally, so its server-rendered navigation could leave the reservation item selected on the chat URL.

This patch restores the chat state, normalizes the active customer navigation item from the browser-visible URL, and publishes the customer layout under a new immutable chunk/cache key.
