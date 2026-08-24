import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const adminId = process.env.AUDIT_ADMIN_ID;
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD;
const customerId = process.env.AUDIT_CUSTOMER_ID;
const customerPassword = process.env.AUDIT_CUSTOMER_PASSWORD;
const outputRoot = path.resolve(process.env.AUDIT_OUTPUT_DIR || "tmp/app-surface-audit");

if (!adminId || !adminPassword || !customerId || !customerPassword) {
  throw new Error("AUDIT_ADMIN_ID, AUDIT_ADMIN_PASSWORD, AUDIT_CUSTOMER_ID and AUDIT_CUSTOMER_PASSWORD are required.");
}

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) throw new Error("Chrome or Edge was not found.");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const safeName = (value) => value.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.messageId = 0;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method) this.events.push(message);
    });
  }

  command(method, params = {}) {
    const id = ++this.messageId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  takeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}

async function launchChrome(label, port) {
  const profile = path.join(os.tmpdir(), `salon-ui-audit-${label}-${Date.now()}`);
  await fs.rm(profile, { recursive: true, force: true });
  const process = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: "ignore" });

  let version;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
      break;
    } catch {
      await delay(100);
    }
  }
  if (!version) throw new Error(`Chrome DevTools did not start for ${label}.`);

  const target = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/`)}`,
    { method: "PUT" },
  ).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.command("Page.enable");
  await client.command("Runtime.enable");
  await client.command("Network.enable");
  await client.command("Log.enable");
  return {
    client,
    close: async () => {
      socket.close();
      process.kill();
      await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed.");
  return result.result.value;
}

async function setViewport(client, viewport) {
  await client.command("Emulation.setDeviceMetricsOverride", viewport);
  if (viewport.mobile) {
    await client.command("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await client.command("Network.setUserAgentOverride", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
    });
  }
}

async function navigate(client, route) {
  client.takeEvents();
  await client.command("Page.navigate", { url: `${baseUrl}${route}` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await evaluate(client, "document.readyState").catch(() => "loading");
    if (state === "complete") break;
    await delay(100);
  }
  await delay(700);
  await evaluate(client, `(async()=>{
    const height = Math.min(document.documentElement.scrollHeight, 12000);
    for (let y = 0; y < height; y += Math.max(500, innerHeight - 120)) {
      scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 80));
  })()`);
  await delay(200);
}

async function loginAdmin(client) {
  await navigate(client, "/admin/login");
  const result = await evaluate(client, `(async()=>{
    const response = await fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({email:${JSON.stringify(adminId)},password:${JSON.stringify(adminPassword)},next:'/admin/appointments'}),
      redirect:'follow'
    });
    return {ok:response.ok,status:response.status,url:response.url};
  })()`);
  await navigate(client, "/admin/appointments");
  const location = await evaluate(client, "location.pathname");
  if (location.startsWith("/admin/login")) throw new Error(`Admin login failed: ${JSON.stringify(result)}`);
}

async function loginCustomer(client) {
  await navigate(client, "/u/login");
  const result = await evaluate(client, `(async()=>{
    const response = await fetch('/api/customer-auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({loginId:${JSON.stringify(customerId)},password:${JSON.stringify(customerPassword)},next:'/u/home'}),
      redirect:'follow'
    });
    return {ok:response.ok,status:response.status,url:response.url};
  })()`);
  await navigate(client, "/u/home");
  const location = await evaluate(client, "location.pathname");
  if (location.startsWith("/u/login")) throw new Error(`Customer login failed: ${JSON.stringify(result)}`);
}

function summarizeEvents(events) {
  const exceptions = [];
  const consoleErrors = [];
  const failedRequests = [];
  const errorResponses = [];
  for (const event of events) {
    if (event.method === "Runtime.exceptionThrown") {
      exceptions.push(event.params.exceptionDetails?.exception?.description || event.params.exceptionDetails?.text || "Unknown exception");
    } else if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry?.level)) {
      consoleErrors.push(`${event.params.entry.level}: ${event.params.entry.text}`);
    } else if (event.method === "Network.loadingFailed" && !event.params.canceled) {
      failedRequests.push(`${event.params.errorText}: ${event.params.requestId}`);
    } else if (event.method === "Network.responseReceived" && event.params.response?.status >= 400) {
      errorResponses.push({ status: event.params.response.status, url: event.params.response.url });
    }
  }
  return { exceptions, consoleErrors, failedRequests, errorResponses };
}

async function inspectPage(client) {
  return evaluate(client, `(()=>{
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const hasScrollableAncestor = element => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 2) return true;
        current = current.parentElement;
      }
      return false;
    };
    const selector = element => {
      if (element.id) return '#' + CSS.escape(element.id);
      const parts = [];
      let current = element;
      for (let depth = 0; current && current !== document.body && depth < 4; depth += 1) {
        let value = current.tagName.toLowerCase();
        if (current.classList.length) value += '.' + [...current.classList].slice(0, 2).map(CSS.escape).join('.');
        parts.unshift(value);
        current = current.parentElement;
      }
      return parts.join(' > ');
    };
    const overflowElements = [...document.querySelectorAll('body *')].filter(visible).flatMap(element => {
      const rect = element.getBoundingClientRect();
      if ((rect.left < -3 || rect.right > innerWidth + 3) && !hasScrollableAncestor(element)) {
        return [{selector:selector(element),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),text:(element.textContent || '').trim().slice(0,80)}];
      }
      return [];
    }).slice(0,30);
    const brokenImages = [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(image => ({src:image.currentSrc || image.src,alt:image.alt}));
    const controlName = element => {
      const id = element.id;
      const explicitLabel = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]')?.textContent : '';
      const wrappingLabel = element.closest('label')?.textContent;
      return String(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || explicitLabel || wrappingLabel || element.getAttribute('title') || '').trim();
    };
    const unlabeledControls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')]
      .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && !element.classList.contains('sr-only'))
      .filter(visible)
      .filter(element => !controlName(element))
      .map(selector)
      .slice(0,30);
    const unnamedActions = [...document.querySelectorAll('button,a[href]')].filter(visible).filter(element => {
      const text = String(element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || element.querySelector('img[alt]')?.alt || '').trim();
      return !text;
    }).map(selector).slice(0,30);
    const duplicateIds = [...document.querySelectorAll('[id]')].map(element => element.id).filter((id,index,ids) => id && ids.indexOf(id) !== index).filter((id,index,ids) => ids.indexOf(id) === index).slice(0,30);
    const interactiveClipping = [...document.querySelectorAll('button,a,input,select,textarea')].filter(visible).flatMap(element => {
      if (element.scrollWidth > element.clientWidth + 3 && getComputedStyle(element).textOverflow !== 'ellipsis') {
        return [{selector:selector(element),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,text:(element.textContent || element.value || '').trim().slice(0,80)}];
      }
      return [];
    }).slice(0,30);
    const nav = document.querySelector('[data-customer-bottom-nav]');
    const navItems = [...document.querySelectorAll('[data-customer-bottom-nav-item]')].map(item => {
      const rect = item.getBoundingClientRect();
      const svg = item.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect();
      return {text:(item.textContent || '').trim(),x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height),iconWidth:svgRect ? Math.round(svgRect.width) : 0,iconHeight:svgRect ? Math.round(svgRect.height) : 0};
    });
    const navRect = nav?.getBoundingClientRect();
    const bodyText = document.body?.innerText || '';
    return {
      title:document.title,
      url:location.href,
      pathname:location.pathname,
      viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},
      bodyWidth:document.body?.scrollWidth || 0,
      documentWidth:document.documentElement.scrollWidth,
      horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 2,
      documentHeight:document.documentElement.scrollHeight,
      overflowElements,
      brokenImages,
      unlabeledControls,
      unnamedActions,
      duplicateIds,
      interactiveClipping,
      applicationError:/Application error|Internal Server Error|This page couldn.t be found|404\s*This page/i.test(bodyText),
      nav:navRect ? {x:Math.round(navRect.x),y:Math.round(navRect.y),width:Math.round(navRect.width),height:Math.round(navRect.height),items:navItems} : null,
      headings:[...document.querySelectorAll('h1,h2')].filter(visible).slice(0,8).map(element => (element.textContent || '').trim()),
      buttons:[...document.querySelectorAll('button')].filter(visible).slice(0,30).map(element => (element.textContent || element.getAttribute('aria-label') || '').trim()),
      links:[...document.querySelectorAll('a[href]')].filter(visible).slice(0,80).map(element => ({text:(element.textContent || '').trim().slice(0,60),href:element.href})),
    };
  })()`);
}

async function capturePage(client, audience, viewportName, route) {
  await navigate(client, route);
  const inspection = await inspectPage(client);
  const events = summarizeEvents(client.takeEvents());
  const screenshot = await client.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const directory = path.join(outputRoot, audience, viewportName);
  await fs.mkdir(directory, { recursive: true });
  const screenshotPath = path.join(directory, `${safeName(route)}.png`);
  await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  return { route, screenshotPath, ...inspection, ...events };
}

async function discoverRoutes(client, prefixes, routes) {
  const discovered = await evaluate(client, `([...new Set([...document.querySelectorAll('a[href]')].map(link=>new URL(link.href,location.href)).filter(url=>url.origin===location.origin).map(url=>url.pathname+url.search))])`);
  for (const route of discovered) {
    if (prefixes.some((prefix) => route.startsWith(prefix)) && !/logout|password-reset|register|withdrawal|receipt|print/.test(route)) routes.add(route);
  }
}

function sampleRoutesByKind(routes, alreadyCaptured, groups, fallbackLimit = 4) {
  const available = routes.filter((route) => !alreadyCaptured.has(route));
  const selected = [];
  const selectedSet = new Set();

  for (const { matches, limit } of groups) {
    for (const route of available.filter(matches).slice(0, limit)) {
      if (selectedSet.has(route)) continue;
      selected.push(route);
      selectedSet.add(route);
    }
  }

  for (const route of available) {
    if (selectedSet.has(route)) continue;
    selected.push(route);
    selectedSet.add(route);
    if (selected.length >= groups.reduce((total, group) => total + group.limit, 0) + fallbackLimit) break;
  }
  return selected;
}

async function auditAdmin() {
  const browser = await launchChrome("admin", 9341);
  try {
    const { client } = browser;
    await setViewport(client, { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await loginAdmin(client);
    const routes = new Set([
      "/admin/appointments",
      "/admin/appointments?view=calendar",
      "/admin/appointments?tab=history",
      "/admin/customers",
      "/admin/customers/messages/chat",
      "/admin/customers/messages",
      "/admin/customers/messages/campaigns",
      "/admin/products",
      "/admin/products?section=menus",
      "/admin/products?section=feedback",
      "/admin/community",
      "/admin/owner-analytics",
      "/admin/owner-analytics?salesLedger=1",
      "/admin/owner-analytics?section=billing",
      "/admin/settings",
      "/admin/account",
    ]);
    const results = [];
    for (const route of [...routes]) {
      results.push(await capturePage(client, "admin", "desktop", route));
      await discoverRoutes(client, ["/admin/customers/", "/admin/appointments/", "/admin/community/", "/admin/owner-analytics"], routes);
    }
    const captured = new Set(results.map((result) => result.route));
    const dynamic = sampleRoutesByKind([...routes], captured, [
      { matches: (route) => /^\/admin\/appointments\/[^/?]+/.test(route), limit: 3 },
      { matches: (route) => /^\/admin\/customers\/[^/?]+/.test(route) && !route.startsWith("/admin/customers/messages"), limit: 3 },
      { matches: (route) => /^\/admin\/community\/[^/?]+/.test(route), limit: 2 },
      { matches: (route) => route.startsWith("/admin/owner-analytics"), limit: 2 },
    ]);
    for (const route of dynamic) results.push(await capturePage(client, "admin", "desktop", route));
    return results;
  } finally {
    await browser.close();
  }
}

async function auditCustomer(viewportName, viewport, port) {
  const browser = await launchChrome(`customer-${viewportName}`, port);
  try {
    const { client } = browser;
    await setViewport(client, viewport);
    await loginCustomer(client);
    const routes = new Set([
      "/u/home",
      "/u/appointments",
      "/u/history",
      "/u/chat",
      "/u/messages",
      "/u/points",
      "/u/profile",
      "/u/reviews",
      "/u/community",
      "/u/campaigns",
    ]);
    const results = [];
    for (const route of [...routes]) {
      results.push(await capturePage(client, "customer", viewportName, route));
      await discoverRoutes(client, ["/u/"], routes);
    }
    const captured = new Set(results.map((result) => result.route));
    const dynamic = sampleRoutesByKind([...routes], captured, [
      { matches: (route) => /^\/u\/appointments\/[^/?]+/.test(route), limit: 2 },
      { matches: (route) => /^\/u\/chat\/[^/?]+/.test(route), limit: 3 },
      { matches: (route) => /^\/u\/community\/[^/?]+/.test(route), limit: 2 },
      { matches: (route) => /^\/u\/catalog\/[^/?]+/.test(route), limit: 2 },
    ]);
    for (const route of dynamic) results.push(await capturePage(client, "customer", viewportName, route));
    return results;
  } finally {
    await browser.close();
  }
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  admin: await auditAdmin(),
  customerDesktop: await auditCustomer("desktop", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, 9342),
  customerMobile: await auditCustomer("iphone15", { width: 393, height: 852, deviceScaleFactor: 3, mobile: true, screenWidth: 393, screenHeight: 852 }, 9343),
};

const navSignatures = report.customerMobile.map((page) => page.nav && JSON.stringify(page.nav.items.map(({ text, y, width, height, iconWidth, iconHeight }) => ({ text, y, width, height, iconWidth, iconHeight }))));
report.customerMobileNavConsistent = navSignatures.filter(Boolean).every((signature) => signature === navSignatures.find(Boolean));
report.issueSummary = [...report.admin, ...report.customerDesktop, ...report.customerMobile].flatMap((page) => {
  const issues = [];
  if (page.applicationError) issues.push("application error page");
  if (page.horizontalOverflow && !(page.route.startsWith("/admin/") && page.viewport.width < 1000)) issues.push("horizontal overflow");
  if (page.brokenImages.length) issues.push(`${page.brokenImages.length} broken image(s)`);
  if (page.unlabeledControls.length) issues.push(`${page.unlabeledControls.length} unlabeled form control(s)`);
  if (page.unnamedActions.length) issues.push(`${page.unnamedActions.length} unnamed action(s)`);
  if (page.duplicateIds.length) issues.push(`${page.duplicateIds.length} duplicate id(s)`);
  if (page.exceptions.length) issues.push(`${page.exceptions.length} JavaScript exception(s)`);
  if (page.errorResponses.length) issues.push(`${page.errorResponses.length} HTTP error response(s)`);
  if (page.failedRequests.length) issues.push(`${page.failedRequests.length} failed request(s)`);
  return issues.length ? [{ route: page.route, viewport: page.viewport, issues }] : [];
});

const reportPath = path.join(outputRoot, "report.json");
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  reportPath,
  adminPages: report.admin.length,
  customerDesktopPages: report.customerDesktop.length,
  customerMobilePages: report.customerMobile.length,
  customerMobileNavConsistent: report.customerMobileNavConsistent,
  issues: report.issueSummary,
}, null, 2));
