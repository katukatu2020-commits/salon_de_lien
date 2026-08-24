import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const credentials = {
  adminId: process.env.AUDIT_ADMIN_ID,
  adminPassword: process.env.AUDIT_ADMIN_PASSWORD,
  customerId: process.env.AUDIT_CUSTOMER_ID,
  customerPassword: process.env.AUDIT_CUSTOMER_PASSWORD,
};
if (Object.values(credentials).some((value) => !value)) throw new Error("Audit credentials are required.");

const chromePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
if (!chromePath) throw new Error("Chrome or Edge was not found.");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function openBrowser(label, port, initialUrl) {
  const profile = path.join(os.tmpdir(), `salon-interaction-audit-${label}-${Date.now()}`);
  await fs.rm(profile, { recursive: true, force: true });
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: "ignore" });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await delay(100);
    }
  }
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(initialUrl)}`, { method: "PUT" }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const operation = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) operation.reject(new Error(message.error.message));
      else operation.resolve(message.result);
    } else if (message.method) events.push(message);
  });
  const command = (method, params = {}) => {
    const commandId = ++id;
    socket.send(JSON.stringify({ id: commandId, method, params }));
    return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }));
  };
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (route) => {
    events.splice(0);
    await command("Page.navigate", { url: `${baseUrl}${route}` });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (await evaluate("document.readyState").catch(() => "loading") === "complete") break;
      await delay(100);
    }
    await delay(800);
  };
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  await command("Log.enable");
  return {
    command,
    evaluate,
    navigate,
    events,
    close: async () => {
      socket.close();
      chrome.kill();
      await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}

async function setViewport(browser, viewport) {
  await browser.command("Emulation.setDeviceMetricsOverride", viewport);
  await browser.command("Emulation.setTouchEmulationEnabled", viewport.mobile
    ? { enabled: true, maxTouchPoints: 5 }
    : { enabled: false });
}

async function adminLogin(browser) {
  await browser.navigate("/admin/login");
  await browser.evaluate(`(async()=>{await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:${JSON.stringify(credentials.adminId)},password:${JSON.stringify(credentials.adminPassword)},next:'/admin/appointments'}),redirect:'follow'});return true})()`);
  await browser.navigate("/admin/appointments");
  if ((await browser.evaluate("location.pathname")).startsWith("/admin/login")) throw new Error("Admin login failed.");
}

async function customerLogin(browser) {
  await browser.navigate("/u/login");
  await browser.evaluate(`(async()=>{await fetch('/api/customer-auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({loginId:${JSON.stringify(credentials.customerId)},password:${JSON.stringify(credentials.customerPassword)},next:'/u/home'}),redirect:'follow'});return true})()`);
  await browser.navigate("/u/home");
  if ((await browser.evaluate("location.pathname")).startsWith("/u/login")) throw new Error("Customer login failed.");
}

async function clickText(browser, selector, text, exact = true) {
  const result = await browser.evaluate(`(()=>{
    const nodes=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(node=>{
      const value=(node.textContent||node.getAttribute('aria-label')||'').trim();
      return ${exact ? `value===${JSON.stringify(text)}` : `value.includes(${JSON.stringify(text)})`};
    });
    if(!nodes.length)return {clicked:false};
    nodes[0].click();
    return {clicked:true,tag:nodes[0].tagName,text:(nodes[0].textContent||'').trim()};
  })()`);
  await delay(650);
  return result;
}

async function visibleOverlay(browser) {
  return browser.evaluate(`(()=>{
    const visible=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0};
    const candidates=[...document.querySelectorAll('dialog,[role="dialog"],[aria-modal="true"],.fixed.inset-0')].filter(visible);
    return candidates.map(node=>({
      tag:node.tagName,
      role:node.getAttribute('role'),
      text:(node.innerText||'').trim().slice(0,1200),
      inputs:[...node.querySelectorAll('input,select,textarea')].map(input=>({name:input.name,type:input.type,disabled:input.disabled,options:input.options?.length||0})),
      frames:[...node.querySelectorAll('iframe')].map(frame=>{try{const doc=frame.contentDocument;return {src:frame.getAttribute('src'),ready:doc?.documentElement?.classList.contains('ca-settings-ready')||false,text:(doc?.body?.innerText||'').trim().slice(0,1200),inputs:[...(doc?.querySelectorAll('input,select,textarea')||[])].map(input=>({name:input.name,type:input.type,disabled:input.disabled,options:input.options?.length||0}))}}catch(error){return {src:frame.getAttribute('src'),error:String(error)}}})
    }));
  })()`);
}

function browserErrors(events) {
  return events.flatMap((event) => {
    if (event.method === "Runtime.exceptionThrown") return [event.params.exceptionDetails?.exception?.description || event.params.exceptionDetails?.text];
    if (event.method === "Network.responseReceived" && event.params.response?.status >= 500) return [`HTTP ${event.params.response.status} ${event.params.response.url}`];
    return [];
  });
}

async function auditAdmin() {
  const browser = await openBrowser("admin", 9351, `${baseUrl}/admin/login`);
  const checks = [];
  try {
    await setViewport(browser, { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await adminLogin(browser);

    await browser.navigate("/admin/appointments");
    const collapseBefore = await browser.evaluate(`(()=>({body:document.body.className,asides:[...document.querySelectorAll('aside')].map(aside=>({className:aside.className,width:Math.round(aside.getBoundingClientRect().width),display:getComputedStyle(aside).display})),buttons:[...document.querySelectorAll('button')].filter(button=>/サイドバーを/.test(button.getAttribute('aria-label')||button.textContent||'')).map(button=>({text:(button.textContent||'').trim(),aria:button.getAttribute('aria-label'),className:button.className}))}))()`);
    const collapsed = await clickText(browser, "button", "サイドバーを閉じる");
    const collapseAfter = await browser.evaluate(`(()=>({body:document.body.className,asides:[...document.querySelectorAll('aside')].map(aside=>({className:aside.className,width:Math.round(aside.getBoundingClientRect().width),display:getComputedStyle(aside).display})),buttons:[...document.querySelectorAll('button')].filter(button=>/サイドバーを/.test(button.getAttribute('aria-label')||button.textContent||'')).map(button=>({text:(button.textContent||'').trim(),aria:button.getAttribute('aria-label'),className:button.className}))}))()`);
    const beforeWidth = Math.max(...collapseBefore.asides.map((aside) => aside.width), 0);
    const afterWidth = Math.max(...collapseAfter.asides.map((aside) => aside.width), 0);
    checks.push({ name: "admin sidebar collapses", pass: collapsed.clicked && (afterWidth < beforeWidth || collapseAfter.asides.every((aside) => aside.display === "none") || collapseAfter.asides.some((aside) => aside.className.includes("-translate-x-full"))), details: { collapseBefore, collapseAfter } });
    await clickText(browser, "button", "サイドバーを開く");

    const notificationClick = await browser.evaluate(`(()=>{const button=document.querySelector('.ca-notification-button');if(!button)return null;const details={tag:button.tagName,html:button.outerHTML.slice(0,800),parent:button.parentElement?.outerHTML.slice(0,1200)};button.click();return details})()`);
    await delay(800);
    const notificationPanel = await browser.evaluate(`(()=>{const panel=document.querySelector('.ca-notification-panel');if(!panel)return null;const style=getComputedStyle(panel),rect=panel.getBoundingClientRect();return {display:style.display,visibility:style.visibility,width:Math.round(rect.width),height:Math.round(rect.height),text:(panel.innerText||'').trim().slice(0,700)}})()`);
    const notificationLocation = await browser.evaluate("location.pathname+location.search");
    checks.push({ name: "admin notifications open", pass: Boolean(notificationClick && (/notificationHistory=1/.test(notificationLocation) || (notificationPanel && notificationPanel.display !== 'none' && notificationPanel.visibility !== 'hidden' && notificationPanel.width > 0 && notificationPanel.height > 0))), details: { notificationClick, notificationPanel, location: notificationLocation } });

    await browser.navigate("/admin/customers");
    const customerModalClick = await clickText(browser, "button", "新しい顧客を追加");
    const customerModal = await visibleOverlay(browser);
    checks.push({ name: "new customer dialog", pass: customerModalClick.clicked && customerModal.some((item) => item.inputs.length >= 2), details: customerModal });
    await browser.command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await delay(200);

    const customerHref = await browser.evaluate(`[...document.querySelectorAll('a[href^="/admin/customers/"]')].map(a=>a.getAttribute('href')).find(href=>href&&!href.includes('/messages')&&href.split('?')[0].split('/').filter(Boolean).length===3)||''`);
    if (customerHref) {
      await browser.navigate(customerHref);
      const customerDetail = await browser.evaluate(`({error:/Application error|Internal Server Error/.test(document.body.innerText),headings:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent.trim()).slice(0,12),merge:[...document.querySelectorAll('button,a')].filter(x=>(x.textContent||'').includes('統合')).length})`);
      checks.push({ name: "customer chart opens", pass: !customerDetail.error && customerDetail.headings.length > 2, details: customerDetail });
    }

    for (const [route, buttonText, name] of [["/admin/products?section=menus", "会計設定", "checkout settings dialog"], ["/admin/products", "在庫設定", "inventory settings dialog"], ["/admin/products", "新しい商品を追加", "new product dialog"]]) {
      await browser.navigate(route);
      const clicked = await clickText(browser, "button", buttonText);
      await delay(900);
      const overlays = await visibleOverlay(browser);
      const globalInputs = await browser.evaluate(`[...document.querySelectorAll('input,select,textarea')].filter(node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0}).map(node=>({name:node.name,type:node.type,value:node.value,closest:(node.closest('[role="dialog"],dialog,section')?.innerText||'').slice(0,160)}))`);
      checks.push({ name, pass: clicked.clicked && overlays.length > 0 && (overlays.some((item) => item.inputs.length > 0 || item.frames?.some((frame) => frame.ready && frame.inputs.length > 0)) || globalInputs.some((input) => input.closest.includes(buttonText.replace('設定','')))), details: { overlays, globalInputs } });
      await browser.command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
      await delay(250);
    }

    await browser.navigate("/admin/products?section=menus");
    const menuButtons = await browser.evaluate(`[...document.querySelectorAll('button')].map(x=>(x.textContent||x.getAttribute('aria-label')||'').trim()).filter(Boolean)`);
    const menuCreateText = menuButtons.find((text) => /メニュー.*追加|新しいメニュー/.test(text));
    if (menuCreateText) {
      const clicked = await clickText(browser, "button", menuCreateText);
      const overlays = await visibleOverlay(browser);
      checks.push({ name: "new menu dialog", pass: clicked.clicked && overlays.some((item) => item.inputs.length >= 2), details: overlays });
      await browser.command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    } else checks.push({ name: "new menu dialog", pass: false, details: { menuButtons } });

    await browser.navigate("/admin/customers/messages");
    const stylistSelect = await browser.evaluate(`(()=>{const type=[...document.querySelectorAll('select')].find(node=>[...node.options].some(option=>(option.textContent||'').includes('前回担当スタイリスト別クーポン')));if(type){const option=[...type.options].find(option=>(option.textContent||'').includes('前回担当スタイリスト別クーポン'));type.value=option?.value||type.value;type.dispatchEvent(new Event('change',{bubbles:true}))}return true})()`);
    await delay(300);
    const stylistState = await browser.evaluate(`(()=>{const labels=[...document.querySelectorAll('label')];const label=labels.find(node=>(node.textContent||'').includes('対象スタイリスト'));const select=label?.querySelector('select')||[...document.querySelectorAll('select')].find(node=>[...node.options].some(option=>/担当|雨宮|高瀬|真鍋|白石/.test(option.textContent||'')));if(!select)return null;return {disabled:select.disabled,options:[...select.options].map(option=>({value:option.value,text:option.textContent,disabled:option.disabled}))}})()`);
    checks.push({ name: "previous stylist filter selectable", pass: Boolean(stylistSelect && stylistState && !stylistState.disabled && stylistState.options.length > 1 && stylistState.options.some((option) => option.value && !option.disabled)), details: stylistState });

    await browser.command("Page.addScriptToEvaluateOnNewDocument", { source: `(()=>{window.__ownerPaintAudit=[];let ticks=0;const expected=['/admin/owner-analytics','/admin/owner-analytics?salesLedger=1','/admin/owner-analytics?section=billing'];const visible=node=>{const rect=node.getBoundingClientRect(),style=getComputedStyle(node);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0};const sample=()=>{const nav=[...document.querySelectorAll('nav')].find(node=>{const hrefs=[...node.querySelectorAll('a')].map(link=>link.getAttribute('href'));return expected.every(href=>hrefs.includes(href))});const links=nav?[...nav.querySelectorAll('a')].filter(link=>expected.includes(link.getAttribute('href'))&&visible(link)):[];window.__ownerPaintAudit.push({at:performance.now(),tabs:links.length,hrefs:links.map(link=>link.getAttribute('href')),legacyHeaderSearch:[...document.querySelectorAll('.top-search')].filter(visible).length});if(++ticks>=150)clearInterval(timer)};const timer=setInterval(sample,8)})()` });
    for (const route of ["/admin/owner-analytics", "/admin/owner-analytics?salesLedger=1", "/admin/owner-analytics?section=billing"]) {
      await browser.navigate(route);
      const tabs = await browser.evaluate(`[...document.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect(),s=getComputedStyle(a);return r.x>250&&r.y<180&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&['経営分析','会計データ管理','システム利用料'].includes((a.textContent||'').trim())}).map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),rect:(()=>{const r=a.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}})()}))`);
      const paintSamples = await browser.evaluate(`window.__ownerPaintAudit||[]`);
      const renderedSamples = paintSamples.filter((sample) => sample.tabs > 0);
      checks.push({ name: `owner analytics tabs ${route}`, pass: tabs.length === 3 && new Set(tabs.map((tab) => tab.rect.y)).size === 1 && renderedSamples.every((sample) => sample.tabs === 3 && sample.legacyHeaderSearch === 0), details: { tabs, transient: renderedSamples.filter((sample) => sample.tabs !== 3 || sample.legacyHeaderSearch !== 0).slice(0, 20) } });
    }

    await browser.navigate("/admin/owner-analytics");
    const metricValues = await browser.evaluate(`([...document.querySelectorAll('.tabular-nums.whitespace-nowrap')].filter(node=>{const rect=node.getBoundingClientRect(),style=getComputedStyle(node);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'}).slice(0,12).map(node=>{const range=document.createRange();range.selectNodeContents(node);return {text:(node.textContent||'').trim(),whiteSpace:getComputedStyle(node).whiteSpace,lineRects:range.getClientRects().length,width:Math.round(node.getBoundingClientRect().width),parentWidth:Math.round(node.parentElement?.getBoundingClientRect().width||0)}}))`);
    checks.push({ name: "owner KPI values stay on one line", pass: metricValues.length > 0 && metricValues.every((value) => value.whiteSpace === "nowrap" && value.lineRects <= 1 && value.width <= value.parentWidth + 1), details: metricValues });

    await browser.navigate("/admin/customers/messages/campaigns");
    const campaign = await browser.evaluate(`(()=>{const active=document.querySelector('.nav a.active');return {tabs:[...document.querySelectorAll('.workspace-tabs a')].map(a=>a.textContent.trim()),hasSearch:Boolean(document.querySelector('.top-search')),headerActions:document.querySelectorAll('.top-actions>a').length,collapseControls:document.querySelectorAll('#campaign-side-toggle').length,activeSidebarBackground:active?getComputedStyle(active).backgroundColor:null,editable:document.querySelectorAll('[data-edit]').length,deletable:document.querySelectorAll('[data-delete]').length,fields:document.querySelectorAll('#campaign-form input,#campaign-form select,#campaign-form textarea').length}})()`);
    checks.push({ name: "campaign management controls", pass: campaign.tabs.length === 4 && !campaign.hasSearch && campaign.headerActions === 4 && campaign.collapseControls === 1 && Boolean(campaign.activeSidebarBackground) && campaign.fields >= 8, details: campaign });

    if (process.env.AUDIT_ALLOW_MUTATIONS === "true") {
      const campaignCrud = await browser.evaluate(`(async()=>{
        const suffix=Date.now().toString(36);
        const payload={title:'[QA] campaign '+suffix,summary:'Temporary UI audit campaign',body:'Created only to verify the create, update and delete round trip.',targetMenu:'',discountRate:10,startsAt:new Date(Date.now()-3600000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),audienceGender:'',audienceMinAge:'',audienceMaxAge:'',imageKey:null};
        let campaignId='';
        const result={};
        try {
          const created=await fetch('/api/lien-campaigns',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          const createdBody=await created.json();
          result.create={status:created.status,body:createdBody};
          campaignId=createdBody.campaignId||'';
          if(!created.ok||!campaignId)return result;
          const updated=await fetch('/api/lien-campaigns?id='+encodeURIComponent(campaignId),{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,title:payload.title+' updated',discountRate:12})});
          result.update={status:updated.status,body:await updated.json()};
        } finally {
          if(campaignId){const removed=await fetch('/api/lien-campaigns?id='+encodeURIComponent(campaignId),{method:'DELETE',credentials:'same-origin'});result.delete={status:removed.status,body:await removed.json().catch(()=>null)}}
        }
        return result;
      })()`);
      checks.push({ name: "campaign create update delete round trip", pass: campaignCrud.create?.status === 201 && campaignCrud.update?.status === 200 && campaignCrud.delete?.status === 200, details: campaignCrud });
    }

    await setViewport(browser, { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
    await browser.navigate("/admin/appointments");
    const compact = await browser.evaluate(`({width:document.documentElement.scrollWidth,viewport:innerWidth,collapseButtons:[...document.querySelectorAll('button')].filter(button=>/サイドバーを/.test(button.getAttribute('aria-label')||button.textContent||'')).length,mobileHeader:[...document.querySelectorAll('header')].filter(header=>getComputedStyle(header).display!=='none').length})`);
    checks.push({ name: "admin half-window keeps one collapse control", pass: compact.collapseButtons === 1, details: compact });

    checks.push({ name: "admin browser errors", pass: browserErrors(browser.events).length === 0, details: browserErrors(browser.events) });
    return checks;
  } finally {
    await browser.close();
  }
}

function locationPath(value) {
  return String(value || "").toLowerCase();
}

async function auditCustomer() {
  const browser = await openBrowser("customer", 9352, `${baseUrl}/u/login`);
  const checks = [];
  try {
    await setViewport(browser, { width: 393, height: 852, deviceScaleFactor: 3, mobile: true, screenWidth: 393, screenHeight: 852 });
    await customerLogin(browser);

    const primaryRoutes = ["/u/home", "/u/appointments", "/u/history", "/u/chat", "/u/profile", "/u/community", "/u/campaigns"];
    const navMeasurements = [];
    for (const route of primaryRoutes) {
      await browser.navigate(route);
      navMeasurements.push(await browser.evaluate(`(()=>{const candidates=[...document.querySelectorAll('nav,.customer-mobile-nav-v425,[data-customer-bottom-nav]')].filter(node=>{const text=(node.textContent||'').replace(/\s/g,''),rect=node.getBoundingClientRect(),style=getComputedStyle(node);return text.includes('ホーム')&&text.includes('予約')&&text.includes('履歴')&&text.includes('チャット相談')&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0});const nav=candidates.sort((a,b)=>b.getBoundingClientRect().y-a.getBoundingClientRect().y)[0];if(!nav)return {route:location.pathname,missing:true};const rect=nav.getBoundingClientRect();return {route:location.pathname,className:nav.className,x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height),items:[...nav.querySelectorAll('a')].map(a=>{const r=a.getBoundingClientRect(),svg=a.querySelector('svg'),s=svg?.getBoundingClientRect();return {text:(a.textContent||'').trim(),x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),iconWidth:s?Math.round(s.width):0,iconHeight:s?Math.round(s.height):0}})}})()`));
    }
    const validNav = navMeasurements.filter((item) => !item.missing);
    const navShape = (item) => JSON.stringify({ x:item.x,y:item.y,width:item.width,height:item.height,items:item.items.map(({text,x,y,width,height,iconWidth,iconHeight})=>({text,x,y,width,height,iconWidth,iconHeight})) });
    checks.push({ name: "customer mobile bottom navigation consistent", pass: validNav.length === primaryRoutes.length && validNav.every((item) => navShape(item) === navShape(validNav[0])), details: navMeasurements });

    await browser.navigate("/u/appointments");
    const staffButtons = await browser.evaluate(`[...document.querySelectorAll('button')].filter(button=>/雨宮|高瀬|真鍋|白石/.test(button.textContent||'')).map(button=>(button.textContent||'').trim())`);
    const staffResults = [];
    for (const staff of staffButtons.slice(0, 4)) {
      const expected = staff.replace(/^[雨高真白](?=[雨高真白])/, "").trim();
      await clickText(browser, "button", staff);
      const detail = await browser.evaluate(`(()=>{const selected=[...document.querySelectorAll('button')].filter(button=>getComputedStyle(button).borderColor==='rgb(216, 93, 121)'||button.getAttribute('aria-pressed')==='true').map(button=>(button.textContent||'').trim());const headings=[...document.querySelectorAll('h2,h3,strong')].map(node=>(node.textContent||'').trim()).filter(Boolean);const images=[...document.images].map(image=>({alt:image.alt,src:image.currentSrc||image.src,width:image.naturalWidth}));return {body:document.body.innerText.slice(0,2600),headings,selected,images}})()`);
      staffResults.push({ staff, expected, detail, pass: detail.body.includes(expected) && detail.selected.some((value) => value.includes(expected)) });
    }
    checks.push({ name: "customer booking staff selection updates", pass: staffResults.length > 1 && staffResults.every((item) => item.pass), details: staffResults });

    await browser.navigate("/u/chat");
    const chatButtons = await browser.evaluate(`[...document.querySelectorAll('button')].filter(button=>/雨宮|高瀬|真鍋|白石/.test(button.textContent||'')).map(button=>(button.textContent||'').trim())`);
    const chatResults = [];
    for (const text of chatButtons.slice(0, 4)) {
      const clicked = await clickText(browser, "button", text);
      chatResults.push({ text, clicked, pathname: await browser.evaluate("location.pathname+location.search"), body: (await browser.evaluate("document.body.innerText")).slice(0, 600) });
      await browser.navigate("/u/chat");
    }
    checks.push({ name: "customer chat staff rooms open", pass: chatResults.length > 1 && chatResults.every((item) => item.clicked.clicked && /\/u\/chat/.test(item.pathname)), details: chatResults.map(({text,clicked,pathname})=>({text,clicked,pathname})) });

    await browser.navigate("/u/profile");
    const profile = await browser.evaluate(`(()=>{const date=document.querySelector('input[type="date"]');const rect=date?.getBoundingClientRect();const style=date?getComputedStyle(date):null;return {hasPreferredStaff:/担当者・指名/.test(document.body.innerText),date:date?{x:Math.round(rect.x),width:Math.round(rect.width),viewport:innerWidth,height:Math.round(rect.height),paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,lineHeight:style.lineHeight}:null,uploadInput:Boolean(document.querySelector('input[type="file"]')),saveButton:[...document.querySelectorAll('button')].some(button=>(button.textContent||'').trim()==='変更を保存')}})()`);
    checks.push({ name: "customer profile mobile fields", pass: !profile.hasPreferredStaff && profile.date && profile.date.x >= 0 && profile.date.x + profile.date.width <= 393 && profile.uploadInput && profile.saveButton, details: profile });

    if (process.env.AUDIT_ALLOW_MUTATIONS === "true") {
      const profileSave = await browser.evaluate(`(async()=>{const form=[...document.forms].find(item=>String(item.action||'').includes('/api/customer/profile'));if(!form)return {error:'profile form not found'};const data=new FormData(form);const response=await fetch(form.action,{method:'POST',credentials:'same-origin',body:data,redirect:'follow'});return {status:response.status,url:response.url,fields:[...data.keys()]}})()`);
      checks.push({ name: "customer profile unchanged save", pass: profileSave.status === 200 && /profile=saved/.test(profileSave.url), details: profileSave });
    }

    await browser.navigate("/u/catalog");
    const itemHref = await browser.evaluate(`document.querySelector('a[href^="/u/catalog/"]')?.getAttribute('href')||''`);
    if (itemHref) {
      await browser.navigate(itemHref);
      const item = await browser.evaluate(`({buttons:[...document.querySelectorAll('button,a')].map(node=>(node.textContent||'').trim()).filter(Boolean),error:/Application error|Internal Server Error/.test(document.body.innerText)})`);
      const reserve = item.buttons.filter((text) => text.includes("取り置きを相談"));
      checks.push({ name: "catalog item reservation consultation", pass: !item.error && reserve.length === 1, details: item });
    } else checks.push({ name: "catalog item reservation consultation", pass: false, details: "No catalog detail link" });

    checks.push({ name: "customer browser errors", pass: browserErrors(browser.events).length === 0, details: browserErrors(browser.events) });
    return checks;
  } finally {
    await browser.close();
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  admin: await auditAdmin(),
  customer: await auditCustomer(),
};
report.failures = [...report.admin, ...report.customer].filter((check) => !check.pass);
const output = path.resolve("tmp/app-interaction-audit/report.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, total: report.admin.length + report.customer.length, failures: report.failures }, null, 2));
