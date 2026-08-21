import fs from "node:fs";

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(search, replacement);
};

const serverFile = "/app/server.js";
let server = fs.readFileSync(serverFile, "utf8");
server = replaceOnce(
  server,
  `const { createAttendanceNotificationProductService } = require('./attendance-notification-product-v320') /* attendance-notification-product-v320 */`,
  `const { createAttendanceNotificationProductService } = require('./attendance-notification-product-v320') /* attendance-notification-product-v320 */\nconst { createCommunityPublishingService } = require('./community-publishing-v337') /* community-publishing-v337 */`,
  "community publishing import",
);
server = replaceOnce(
  server,
  `const appointmentOperations = createAppointmentOperationsService({`,
  `const communityPublishing = createCommunityPublishingService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* community-publishing-v337-service */\nconst appointmentOperations = createAppointmentOperationsService({`,
  "community publishing service",
);
server = replaceOnce(
  server,
  `      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-notification-product-v320-route */`,
  `      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-notification-product-v320-route */\n      if (await communityPublishing.handle(req, res, url)) return /* community-publishing-v337-route */`,
  "community publishing route",
);
fs.writeFileSync(serverFile, server);

const commercialFile = "/app/commercial-admin-v101.js";
let commercial = fs.readFileSync(commercialFile, "utf8");
commercial += `\n;(() => {\n  if (document.querySelector('script[data-community-publishing-v337]')) return\n  const script = document.createElement('script')\n  script.src = '/admin-community-publishing-v337.js?v=337'\n  script.defer = true\n  script.dataset.communityPublishingV337 = '1'\n  document.head.appendChild(script)\n})()\n`;
fs.writeFileSync(commercialFile, commercial);
