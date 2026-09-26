export function afterHydration(source) {
  return `;(() => {
  const start = () => {\n${source}\n};
  const nativeApp = document.querySelector('script[src*="/_next/static/chunks/main-app-"]');
  if (!nativeApp || window.__orimiaHydratedV680) start();
  else window.addEventListener('orimia:hydrated-v680', start, { once: true });
})();\n`
}

export function patchLayout(source, admin) {
  const anchor = '        if (\n          "/admin/login" === d'
  if (source.split(anchor).length !== 2) throw Error('Unexpected layout hydration anchor')
  source = source.replace(anchor, `        (0, v.useEffect)(() => {
          window.__orimiaHydratedV680 = true;
          window.dispatchEvent(new Event('orimia:hydrated-v680'));
        }, []);
${anchor}`)
  if (admin) {
    const children = '          children: [\n            (0, a.jsx)("aside", {'
    if (source.split(children).length !== 2) throw Error('Unexpected admin shell anchor')
    source = source.replace(children, `          children: [
            (0, a.jsx)("script", { src: "/content-edit-delete-client-v680.js?v=680", defer: !0, "data-lien-community-bootstrap": "v615" }),
            (0, a.jsx)("aside", {`)
  }
  const end = source.indexOf('\n]);')
  if (end < 0) throw Error('Missing webpack boundary')
  return source.slice(0, end + 5) + '\n' + afterHydration(source.slice(end + 5))
}
