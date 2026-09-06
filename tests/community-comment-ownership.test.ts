import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageCommunityComment,
  loadCommunityCustomerIdentityIds,
  type CommunityCommentOwner
} from "../src/lib/community/comment-ownership";

function comment(overrides: Partial<CommunityCommentOwner> = {}): CommunityCommentOwner {
  return {
    appUserId: "old-user",
    authorRole: "CUSTOMER",
    appUser: {
      customerId: "old-customer",
      customerStoreLinks: []
    },
    ...overrides
  };
}

test("the exact comment author can manage the comment", () => {
  assert.equal(canManageCommunityComment({
    actor: "customer",
    currentUserId: "old-user",
    currentCustomerId: "old-customer",
    comment: comment()
  }), true);
});

test("a merged customer can manage a comment from the previous account", () => {
  assert.equal(canManageCommunityComment({
    actor: "customer",
    currentUserId: "current-user",
    currentCustomerId: "current-customer",
    customerIdentityIds: new Set(["current-customer", "old-customer"]),
    comment: comment()
  }), true);
});

test("a store-linked customer identity is treated as the same owner", () => {
  assert.equal(canManageCommunityComment({
    actor: "customer",
    currentUserId: "current-user",
    currentCustomerId: "current-customer",
    customerIdentityIds: new Set(["current-customer", "old-store-customer"]),
    comment: comment({
      appUser: {
        customerId: null,
        customerStoreLinks: [{ customerId: "old-store-customer" }]
      }
    })
  }), true);
});

test("another customer's comment cannot be managed", () => {
  assert.equal(canManageCommunityComment({
    actor: "customer",
    currentUserId: "current-user",
    currentCustomerId: "current-customer",
    customerIdentityIds: new Set(["current-customer"]),
    comment: comment()
  }), false);
});

test("staff access never inherits customer lineage", () => {
  assert.equal(canManageCommunityComment({
    actor: "staff",
    currentUserId: "staff-user",
    currentCustomerId: "current-customer",
    customerIdentityIds: new Set(["current-customer", "old-customer"]),
    comment: comment()
  }), false);
});

test("customer identity lookup includes merged source records", async () => {
  const queries: unknown[][] = [];
  const db = {
    async $queryRawUnsafe<T>(...args: unknown[]) {
      queries.push(args);
      return [
        { customerId: "current-customer" },
        { customerId: "old-customer" }
      ] as T;
    }
  };
  const identities = await loadCommunityCustomerIdentityIds(
    db as never,
    "org-1",
    "current-customer"
  );
  assert.deepEqual([...identities].sort(), ["current-customer", "old-customer"]);
  assert.equal(queries.length, 1);
  assert.match(String(queries[0][0]), /CustomerMergeHistory/);
});

test("identity lookup safely falls back to the current customer", async () => {
  const db = {
    async $queryRawUnsafe() {
      throw new Error("relation does not exist");
    }
  };
  const identities = await loadCommunityCustomerIdentityIds(
    db as never,
    "org-1",
    "current-customer"
  );
  assert.deepEqual([...identities], ["current-customer"]);
});
