(() => {
  const EMAIL_KEY = "lien_customer_registration_email";
  const SENT_AT_KEY = "lien_customer_registration_sent_at";
  const CONTEXT_KEY = "lien_customer_registration_context";
  const COOLDOWN_MS = 60_000;

  function boot() {
    const form = document.querySelector('form[action="/api/customer-auth/registration-link/request"]');
    if (!(form instanceof HTMLFormElement) || form.dataset.resendReady === "1") return;
    const emailInput = form.querySelector('input[name="email"]');
    const button = form.querySelector('button[type="submit"]');
    if (!(emailInput instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) return;
    form.dataset.resendReady = "1";

    const params = new URLSearchParams(window.location.search);
    const resendMode = params.get("sent") === "1";
    const serverRetryAfter = Math.min(60, Math.max(0, Number(params.get("retryAfter")) || 0));
    const storedEmail = window.sessionStorage.getItem(EMAIL_KEY) || "";
    if (!emailInput.value && storedEmail) emailInput.value = storedEmail;
    if (resendMode && serverRetryAfter > 0 && !window.sessionStorage.getItem(SENT_AT_KEY)) {
      window.sessionStorage.setItem(SENT_AT_KEY, String(Date.now() - (60 - serverRetryAfter) * 1000));
    }

    try {
      const context = JSON.parse(window.sessionStorage.getItem(CONTEXT_KEY) || "{}");
      ["source", "campaign", "referrer", "referrerName"].forEach((name) => {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement && !input.value && typeof context[name] === "string") input.value = context[name];
      });
    } catch {}

    let helper = null;
    if (resendMode) {
      helper = document.createElement("p");
      helper.className = "text-center text-xs leading-5 text-lien-muted";
      helper.textContent = "誤送信や連続送信を防ぐため、再送は60秒ごとに利用できます。";
      button.insertAdjacentElement("afterend", helper);
    }

    function update() {
      if (!resendMode) return;
      const sentAt = Number(window.sessionStorage.getItem(SENT_AT_KEY) || "0");
      const remaining = sentAt > 0 ? Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - sentAt)) / 1000)) : 0;
      button.disabled = remaining > 0;
      button.classList.toggle("opacity-55", remaining > 0);
      button.classList.toggle("cursor-not-allowed", remaining > 0);
      button.textContent = remaining > 0 ? `再送まで ${remaining}秒` : "メールを再送する";
      button.setAttribute("aria-label", button.textContent);
    }

    form.addEventListener("submit", (event) => {
      if (button.disabled) {
        event.preventDefault();
        return;
      }
      const email = emailInput.value.trim().toLowerCase();
      if (!email || !form.checkValidity()) return;
      const context = {};
      ["source", "campaign", "referrer", "referrerName"].forEach((name) => {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement && input.value) context[name] = input.value;
      });
      window.sessionStorage.setItem(EMAIL_KEY, email);
      window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
      window.sessionStorage.setItem(SENT_AT_KEY, String(Date.now()));
      if (resendMode) update();
    });

    update();
    window.setInterval(update, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) boot(); });
})();
