const fs = require("fs");
const path = require("path");

const appRoot = process.env.APP_ROOT || "/app";

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

function write(relativePath, source) {
  fs.writeFileSync(path.join(appRoot, relativePath), source);
}

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match, found ${count}`);
  }
  return source.replace(before, after);
}

const appointmentPath = ".next/server/app/admin/appointments/[appointmentId]/page.js";
let appointment = read(appointmentPath);
appointment = replaceExactly(
  appointment,
  'className:"flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#edc2bd] bg-[#fff7f5] px-4 py-3",children:[a.jsx("input",{type:"hidden",name:"appointmentId",value:k.id}),a.jsx("p",{className:"text-sm text-lien-muted",children:"この予約をキャンセルし、お客様へ通知します。"}),a.jsx("button",{type:"submit",className:"rounded-xl bg-[#a33f38] px-4 py-2 text-sm font-semibold text-white",children:"予約をキャンセル"})]',
  'className:"flex flex-wrap items-center justify-between gap-3 rounded-[18px] border px-4 py-3",style:{background:"linear-gradient(135deg, #fffaf8 0%, #f8e9e5 100%)",borderColor:"#d6a49b",boxShadow:"0 8px 22px rgba(116, 56, 47, 0.08)"},children:[a.jsx("input",{type:"hidden",name:"appointmentId",value:k.id}),a.jsx("p",{className:"text-sm",style:{color:"#5f4039",fontWeight:600},children:"この予約をキャンセルし、お客様へ通知します。"}),a.jsx("button",{type:"submit",className:"rounded-xl px-5 py-3 text-sm font-semibold",style:{backgroundColor:"#8f4f42",border:"1px solid #74382f",boxShadow:"0 5px 14px rgba(116, 56, 47, 0.22)",color:"#ffffff",minHeight:"44px",minWidth:"176px"},children:"予約をキャンセル"})]',
  "appointment cancellation panel"
);
write(appointmentPath, appointment);

const customerListPath = ".next/server/chunks/3491.js";
let customerList = read(customerListPath);
customerList = replaceExactly(
  customerList,
  'a.jsx("th",{className:"px-5 py-3",children:"メモ"}),a.jsx("th",{className:"px-5 py-3 text-right",children:"詳細"})',
  'a.jsx("th",{className:"px-5 py-3",children:"メモ"}),a.jsx("th",{className:"px-5 py-3 text-right",children:"チャット"})',
  "customer list action header"
);

const withChatAndDetail = 'a.jsx("td",{className:"px-5 py-4 text-right",children:(0,a.jsxs)("div",{className:"flex items-center justify-end gap-2",children:[a.jsx(n.default,{href:"/admin/customers/messages/chat?customerId="+encodeURIComponent(e.customer.id),className:"inline-flex min-h-9 items-center rounded-full bg-[#8f4f42] px-3 text-xs font-semibold text-white",children:"チャット"}),a.jsx(n.default,{href:e.href,className:"lien-icon-button min-h-9 min-w-9 text-stone-600","aria-label":`${e.customer.name}の詳細`,children:a.jsx(x.Z,{className:"h-4 w-4"})})]})})';
const detailOnly = 'a.jsx("td",{className:"px-5 py-4 text-right",children:a.jsx(n.default,{href:e.href,className:"lien-icon-button min-h-9 min-w-9 text-stone-600","aria-label":`${e.customer.name}の詳細`,children:a.jsx(x.Z,{className:"h-4 w-4"})})})';
const chatOnly = 'a.jsx("td",{className:"px-5 py-4 text-right",children:a.jsx(n.default,{href:"/admin/customers/messages/chat?customerId="+encodeURIComponent(e.customer.id),className:"inline-flex min-h-9 items-center rounded-full bg-[#8f4f42] px-3 text-xs font-semibold text-white",children:"チャット"})})';

if (customerList.includes(withChatAndDetail)) {
  customerList = replaceExactly(customerList, withChatAndDetail, chatOnly, "customer chat/detail actions");
} else {
  customerList = replaceExactly(customerList, detailOnly, chatOnly, "customer detail action");
}
write(customerListPath, customerList);

console.log("Applied cancellation contrast and customer-list action patch.");
