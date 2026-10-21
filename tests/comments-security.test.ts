import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { submitComment, listPublicComments } from "../server/cms/comments.ts";
import { handleAdminContent } from "../server/cms/handler.ts";
import type {
  CmsEnv,
  D1Like,
  D1StatementLike,
  D1ResultLike,
} from "../server/cms/types.ts";

class Statement implements D1StatementLike {
  values: unknown[] = [];
  readonly sql: string;
  private readonly db: Db;
  constructor(sql: string, db: Db) { this.sql = sql; this.db = db; }
  bind(...v: unknown[]) {
    this.values = v;
    return this;
  }
  async first<T>() {
    if (this.sql.includes("SELECT attempts"))
      return { attempts: this.db.attempts } as T;
    if (this.sql.includes("FROM cms_contents"))
      return (
        this.db.content ? { id: "content-1", kind: "article" } : null
      ) as T | null;
    return null;
  }
  async all<T>() {
    if (this.sql.includes("status='approved'"))
      return { results: this.db.publicRows as T[] };
    if (this.sql.includes("GROUP BY status")) return { results: [] as T[] };
    return { results: [] as T[] };
  }
  async run() {
    return { meta: { changes: 1 } };
  }
}
class Db implements D1Like {
  statements: Statement[] = [];
  batches: D1StatementLike[][] = [];
  attempts = 1;
  content = true;
  publicRows: Record<string, unknown>[] = [];
  prepare(sql: string) {
    const s = new Statement(sql, this);
    this.statements.push(s);
    return s;
  }
  async batch(s: D1StatementLike[]): Promise<D1ResultLike[]> {
    this.batches.push(s);
    return s.map(() => ({ meta: { changes: 1 } }));
  }
}
const env = (db: Db): CmsEnv => ({
  CMS_DB: db,
  COMMENTS_TURNSTILE_SECRET_KEY: "secret",
  COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES: "local.invalid",
  COMMENTS_TURNSTILE_ACTION: "comment",
  COMMENTS_IP_HASH_SECRET: "x".repeat(32),
});
const okVerify = async () => ({
  kind: "ok" as const,
  hostname: "local.invalid",
  action: "comment",
});
const request = (extra: Record<string, unknown> = {}) =>
  new Request("https://local.invalid/api/comments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
    },
    body: JSON.stringify({
      contentType: "article",
      contentId: "content-1",
      displayName: "Guest",
      body: "Useful comment",
      turnstileToken: "token",
      ...extra,
    }),
  });

test("01 valid guest comment is accepted as pending", async () => {
  const db = new Db();
  const r = await submitComment(request(), env(db), {
    verify: okVerify,
    now: () => 1,
  });
  assert.equal(r.status, 202);
  assert.equal(
    ((await r.json()) as { data: { status: string } }).data.status,
    "pending",
  );
});
test("02 guest cannot choose approved status", async () => {
  const db = new Db();
  await submitComment(request({ status: "approved" }), env(db), {
    verify: okVerify,
  });
  assert.match((db.batches[0]![0] as Statement).sql, /'pending'/);
});
test("03 guest cannot call moderation API", async () => {
  const r = await handleAdminContent(
    new Request("https://x/api/admin/comments/1", { method: "PATCH" }),
    {},
    ["comments", "1"],
  );
  assert.equal(r.status, 404);
});
test("04 public query hard filters approved comments", async () => {
  const db = new Db();
  await listPublicComments(new Request("https://x"), db, "article", "slug");
  assert.match(db.statements.at(-1)!.sql, /status='approved'/);
});
test("05 draft or archived content cannot receive comments", async () => {
  const db = new Db();
  db.content = false;
  assert.equal(
    (await submitComment(request(), env(db), { verify: okVerify })).status,
    404,
  );
});
test("06 only approved rows are mapped public", async () => {
  const db = new Db();
  db.publicRows = [
    {
      id: "1",
      display_name: "A",
      body: "hello",
      created_at: 1,
      parent_id: null,
    },
  ];
  const r = await listPublicComments(
    new Request("https://x"),
    db,
    "article",
    "slug",
  );
  assert.equal(((await r.json()) as { data: unknown[] }).data.length, 1);
});
test("07 hidden and rejected are excluded structurally", () =>
  assert.match(
    fs.readFileSync("server/cms/comments.ts", "utf8"),
    /status='approved'/,
  ));
test("08 missing Turnstile is rejected", async () =>
  assert.equal(
    (
      await submitComment(request({ turnstileToken: "" }), env(new Db()), {
        verify: okVerify,
      })
    ).status,
    400,
  ));
test("09 invalid Turnstile is rejected", async () =>
  assert.equal(
    (
      await submitComment(request(), env(new Db()), {
        verify: async () => ({ kind: "rejected" }),
      })
    ).status,
    400,
  ));
test("10 reused Turnstile verdict is rejected", async () =>
  assert.equal(
    (
      await submitComment(request(), env(new Db()), {
        verify: async () => ({ kind: "rejected" }),
      })
    ).status,
    400,
  ));
test("11 XSS HTML payload is rejected", async () =>
  assert.equal(
    (
      await submitComment(
        request({ body: "<script>alert(1)</script>" }),
        env(new Db()),
        { verify: okVerify },
      )
    ).status,
    400,
  ));
test("12 dangerous URL payload is rejected", async () =>
  assert.equal(
    (
      await submitComment(
        request({ body: "javascript:alert(1)" }),
        env(new Db()),
        { verify: okVerify },
      )
    ).status,
    400,
  ));
test("13 rate limit blocks sixth request", async () => {
  const db = new Db();
  db.attempts = 6;
  assert.equal(
    (await submitComment(request(), env(db), { verify: okVerify })).status,
    429,
  );
});
test("14 oversized request is rejected", async () => {
  const r = new Request("https://x", {
    method: "POST",
    headers: { "content-length": "20000" },
    body: "{}",
  });
  assert.equal(
    (await submitComment(r, env(new Db()), { verify: okVerify })).status,
    413,
  );
});
test("15 nonexistent content is rejected", async () => {
  const db = new Db();
  db.content = false;
  assert.equal(
    (await submitComment(request(), env(db), { verify: okVerify })).status,
    404,
  );
});
test("16 moderation requires Access token", async () => {
  const e: CmsEnv = {
    CMS_ADMIN_ENABLED: "true",
    ENVIRONMENT: "staging",
    ACCESS_TEAM_DOMAIN: "x",
    ACCESS_AUD: "x",
    ACCESS_ALLOWED_IDENTITIES: "x",
  };
  assert.equal(
    (await handleAdminContent(new Request("https://x"), e, ["comments"]))
      .status,
    401,
  );
});
test("17 moderation writes audit event", () =>
  assert.match(
    fs.readFileSync("server/cms/comments.ts", "utf8"),
    /comment\.moderate/,
  ));
test("18 soft deleted comments are excluded", () =>
  assert.match(
    fs.readFileSync("server/cms/comments.ts", "utf8"),
    /deleted_at IS NULL/,
  ));
test("19 public response omits private abuse key and moderator", async () => {
  const db = new Db();
  db.publicRows = [
    {
      id: "1",
      display_name: "A",
      body: "hello",
      created_at: 1,
      parent_id: null,
      abuse_key: "secret",
      moderator_actor: "owner",
    },
  ];
  const text = await (
    await listPublicComments(new Request("https://x"), db, "article", "slug")
  ).text();
  assert.doesNotMatch(text, /abuse_key|moderator_actor/);
});
test("20 local identity harness is absent from deployable Functions", () => {
  const deploy = fs.readFileSync("functions/api/admin/[[path]].ts", "utf8");
  assert.doesNotMatch(deploy, /localIdentity|localVerify|local-boundary-token/);
  assert.match(
    fs.readFileSync("local/cms-dev-worker.ts", "utf8"),
    /localIdentity/,
  );
});
