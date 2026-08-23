(() => {
  const bind = () => {
    const form = document.querySelector('form[data-automated-coupon-form="true"]');
    if (!form || form.dataset.conditionalFieldsBound === "true") return;

    const trigger = form.querySelector('select[name="triggerType"]');
    if (!trigger) return;

    const fields = Array.from(form.querySelectorAll("[data-automated-coupon-field]"));
    const refresh = () => {
      for (const field of fields) {
        const active = field.dataset.automatedCouponField === trigger.value;
        field.hidden = !active;
        for (const control of field.querySelectorAll("input, select, textarea")) {
          control.disabled = !active;
          control.required = active;
        }
      }
    };

    trigger.addEventListener("change", refresh);
    form.dataset.conditionalFieldsBound = "true";
    refresh();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  new MutationObserver(bind).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
