const fs = require("fs");
const path = require("path");

const appRoot = process.env.APP_ROOT || "/app";
const appointment = fs.readFileSync(
  path.join(appRoot, ".next/server/app/admin/appointments/[appointmentId]/page.js"),
  "utf8"
);
const customerList = fs.readFileSync(
  path.join(appRoot, ".next/server/chunks/3491.js"),
  "utf8"
);

const expectations = [
  [appointment.includes('backgroundColor:"#8f4f42"'), "solid cancel button background"],
  [appointment.includes('color:"#ffffff"'), "explicit cancel button foreground"],
  [appointment.includes('background:"linear-gradient(135deg, #fffaf8 0%, #f8e9e5 100%)"'), "cancel panel background"],
  [customerList.includes('children:"チャット"'), "customer chat action"],
  [customerList.includes('children:"メモ"'), "customer memo header"],
  [customerList.includes('className:"px-5 py-3 text-right",children:"チャット"'), "customer chat header"],
  [!customerList.includes('className:"px-5 py-3 text-right",children:"詳細"'), "removed detail header"],
  [!customerList.includes('"aria-label":`${e.customer.name}の詳細`'), "removed detail arrow"],
];

for (const [ok, label] of expectations) {
  if (!ok) throw new Error(`Release 33 verification failed: ${label}`);
}

console.log("Release 33 verification passed.");
