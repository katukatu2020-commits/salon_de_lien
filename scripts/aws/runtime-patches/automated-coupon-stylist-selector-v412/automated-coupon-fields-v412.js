(() => {
  const selector = 'form[data-automated-coupon-form="true"]';

  const refreshForm = (form) => {
    const trigger = form.querySelector('select[name="triggerType"]');
    if (!trigger) return;

    for (const field of form.querySelectorAll("[data-automated-coupon-field]")) {
      const active = field.dataset.automatedCouponField === trigger.value;
      field.hidden = !active;
      field.style.display = active ? "" : "none";

      for (const control of field.querySelectorAll("input, select, textarea")) {
        control.disabled = !active;
        control.required = active;
      }

      if (active && field.dataset.automatedCouponField === "stylist") {
        const stylistSelect = field.querySelector('select[name="stylistName"]');
        if (!stylistSelect) continue;
        const hasCandidates = Array.from(stylistSelect.options).some((option) => option.value !== "");
        stylistSelect.disabled = !hasCandidates;
        stylistSelect.required = hasCandidates;

        let emptyMessage = field.querySelector("[data-stylist-empty-message]");
        if (!hasCandidates && !emptyMessage) {
          emptyMessage = document.createElement("span");
          emptyMessage.dataset.stylistEmptyMessage = "true";
          emptyMessage.className = "text-xs font-medium text-amber-700";
          emptyMessage.textContent = "選択できるスタッフがいません。店舗運用設定のスタッフ管理を確認してください。";
          field.appendChild(emptyMessage);
        }
        if (emptyMessage) emptyMessage.hidden = hasCandidates;
      }
    }
  };

  const bind = () => {
    for (const form of document.querySelectorAll(selector)) {
      if (form.dataset.conditionalFieldsBound !== "v412") {
        form.addEventListener("change", (event) => {
          if (event.target instanceof HTMLSelectElement && event.target.name === "triggerType") {
            refreshForm(form);
          }
        });
        form.dataset.conditionalFieldsBound = "v412";
      }
      refreshForm(form);
    }
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
