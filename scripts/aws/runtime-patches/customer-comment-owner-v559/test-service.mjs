import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const servicePath = process.env.LIEN_CONTENT_SERVICE || "./content-management-v559.js";
const {
  canManageComment,
  createContentManagementService,
  loadCustomerIdentityIds
} = require(servicePath);

const currentSession = {
  userId: "current-user",
  customerId: "current-customer",
  organizationId: "org-1",
  role: "CUSTOMER"
};
const legacyComment = {
  id: "comment-1",
  postId: "post-1",
  appUserId: "legacy-user",
  authorRole: "CUSTOMER",
  ownerDirectCustomerId: "legacy-customer",
  ownerLinkedCustomerId: null,
  authorDisplayName: "owner",
  body: "before",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z")
};

assert.equal(
  canManageComment(currentSession, legacyComment, new Set(["current-customer", "legacy-customer"])),
  true
);
assert.equal(
  canManageComment(currentSession, legacyComment, new Set(["current-customer"])),
  false
);
assert.equal(
  canManageComment(
    { ...currentSession, role: "STAFF", userId: "staff-user" },
    legacyComment,
    new Set(["legacy-customer"])
  ),
  false
);
assert.equal(
  canManageComment(
    { ...currentSession, userId: "legacy-user" },
    legacyComment,
    new Set()
  ),
  true
);

const statements = [];
const prisma = {
  async $queryRawUnsafe(sql, ...params) {
    statements.push({ sql, params });
    if (sql.includes('WITH RECURSIVE "CustomerIdentity"')) {
      return params[0] === "current-customer"
        ? [{ customerId: "current-customer" }, { customerId: "legacy-customer" }]
        : [{ customerId: params[0] }];
    }
    if (sql.includes('FROM "VisitCommunityPost"')) {
      return [{
        id: "post-1",
        organizationId: "org-1",
        customerId: null,
        postKind: "STORE",
        caption: "",
        published: true,
        updatedAt: new Date("2026-09-01T00:00:00Z")
      }];
    }
    if (sql.includes('FROM "VisitCommunityComment"')) return [legacyComment];
    return [];
  },
  async $executeRawUnsafe(sql, ...params) {
    statements.push({ sql, params });
    return 1;
  },
  async $transaction(operations) {
    return Promise.all(operations);
  }
};

const identities = await loadCustomerIdentityIds(prisma, currentSession);
assert.deepEqual([...identities].sort(), ["current-customer", "legacy-customer"]);

function request(method, body = null) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  req.headers = {
    origin: "https://salon-de-lien.com",
    host: "salon-de-lien.com",
    "x-forwarded-proto": "https"
  };
  req.socket = { encrypted: false };
  return req;
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = "") { this.body = String(value); }
  };
}

const service = createContentManagementService({
  prisma,
  staffSessionProvider: async () => null,
  customerSessionProvider: async () => currentSession,
  canAccessThread: () => false,
  resolvePostCover: async (reference) => reference
});

const getResponse = response();
await service.handle(
  request("GET"),
  getResponse,
  new URL("https://salon-de-lien.com/api/lien-content-management?audience=customer&postId=post-1")
);
assert.equal(getResponse.statusCode, 200);
assert.equal(JSON.parse(getResponse.body).comments[0].canEdit, true);
assert.equal(JSON.parse(getResponse.body).comments[0].canDelete, true);

const patchResponse = response();
await service.handle(
  request("PATCH", { target: "comment", postId: "post-1", id: "comment-1", body: "after" }),
  patchResponse,
  new URL("https://salon-de-lien.com/api/lien-content-management?audience=customer")
);
assert.equal(patchResponse.statusCode, 200);
assert.equal(JSON.parse(patchResponse.body).body, "after");
assert.ok(statements.some(({ sql }) => sql.includes('UPDATE "VisitCommunityComment" SET "body"')));

const unrelatedService = createContentManagementService({
  prisma,
  staffSessionProvider: async () => null,
  customerSessionProvider: async () => ({
    ...currentSession,
    userId: "other-user",
    customerId: "other-customer"
  }),
  canAccessThread: () => false
});
const deniedResponse = response();
await unrelatedService.handle(
  request("DELETE", { target: "comment", postId: "post-1", id: "comment-1" }),
  deniedResponse,
  new URL("https://salon-de-lien.com/api/lien-content-management?audience=customer")
);
assert.equal(deniedResponse.statusCode, 403);

console.log(JSON.stringify({
  release: "customer-comment-owner-v559",
  mergedOwnerVisible: true,
  mergedOwnerEditable: true,
  unrelatedOwnerDenied: true
}));
