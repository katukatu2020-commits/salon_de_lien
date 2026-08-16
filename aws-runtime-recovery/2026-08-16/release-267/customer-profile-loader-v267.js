(() => {
  if (
    typeof document === 'undefined'
    || document.querySelector('script[data-lien-customer-runtime="267"]')
  ) return

  const script = document.createElement('script')
  script.src = '/customer-runtime-v267.js?v=20260817-267'
  script.defer = true
  script.dataset.lienCustomerRuntime = '267'
  document.head.appendChild(script)
})();
