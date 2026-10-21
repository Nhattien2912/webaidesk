import {
  hostnameAllowed,
  parseAllowedHostnames,
  verifyTurnstile,
  type TurnstileOutcome,
} from "../turnstile.ts";
import type { AccessIdentity, CmsEnv, D1Like } from "./types.ts";
import { linkifyit } from "linkify-it";

export type CommentStatus = "pending" | "approved" | "rejected" | "hidden";
export interface CommentDeps {
  now?: () => number;
  verify?: (
    secret: string,
    token: string,
    ip: string,
  ) => Promise<TurnstileOutcome>;
}
type Row = Record<string, unknown>;
const MAX_BODY = 16 * 1024;
const publicRow = (row: Row) => ({
  id: String(row.id),
  displayName: String(row.display_name),
  body: String(row.body),
  createdAt: Number(row.created_at),
  parentId: row.parent_id == null ? null : String(row.parent_id),
});
const adminRow = (row: Row) => ({
  ...publicRow(row),
  contentId: String(row.content_id),
  contentKind: String(row.content_kind),
  contentTitle: String(row.content_title ?? ""),
  status: String(row.status),
  updatedAt: Number(row.updated_at),
  moderatedAt: row.moderated_at == null ? null : Number(row.moderated_at),
  version: Number(row.version),
});
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
const fail = (code: string, status: number, fields?: Record<string, string>) =>
  response(
    {
      error: {
        code,
        message: code,
        fieldErrors: fields,
        requestId: crypto.randomUUID(),
      },
    },
    status,
  );

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const out = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(out), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || "0.0.0.0";
}
function validateText(value: unknown, min: number, max: number) {
  return (
    typeof value === "string" &&
    value.trim().length >= min &&
    value.trim().length <= max
  );
}
const linkify=linkifyit();
function unsafeText(value:string){const normalized=value.normalize('NFKC').replace(/\[\.\]|。/g,'.').replace(/hxxps?:\/\//gi,'https://');return /<[^>]*>|(?:javascript|data|vbscript):/i.test(normalized)||linkify.test(normalized)}

export async function listPublicComments(
  request: Request,
  db: D1Like,
  kind: "article" | "app",
  slug: string,
) {
  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20),
  );
  const cursor =
    Number(url.searchParams.get("cursor") ?? 0) || Number.MAX_SAFE_INTEGER;
  const content = await db
    .prepare(
      "SELECT id FROM cms_contents WHERE kind=?1 AND slug=?2 AND status='published' AND deleted_at IS NULL",
    )
    .bind(kind, slug)
    .first<{ id: string }>();
  if (!content) return fail("not_found", 404);
  const rows =
    (
      await db
        .prepare(
          "SELECT id,display_name,body,created_at,parent_id FROM cms_comments WHERE content_id=?1 AND status='approved' AND deleted_at IS NULL AND created_at<?2 ORDER BY created_at DESC LIMIT ?3",
        )
        .bind(content.id, cursor, limit + 1)
        .all<Row>()
    ).results ?? [];
  const items = rows.slice(0, limit).map(publicRow);
  return response(
    {
      data: items,
      meta: {
        nextCursor:
          rows.length > limit ? (items.at(-1)?.createdAt ?? null) : null,
        count: items.length,
      },
    },
    200,
  );
}

export async function submitComment(
  request: Request,
  env: CmsEnv,
  deps: CommentDeps = {},
) {
  if (request.method !== "POST") return fail("method_not_allowed", 405);
  if (!env.CMS_DB) return fail("cms_not_configured", 503);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return fail("payload_too_large", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY)
    return fail("payload_too_large", 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return fail("invalid_json", 400);
  }
  const fields: Record<string, string> = {};
  if (!validateText(body.displayName, 2, 60))
    fields.displayName = "length_2_60";
  if (!validateText(body.body, 5, 2000)) fields.body = "length_5_2000";
  if (typeof body.body === "string" && unsafeText(body.body))
    fields.body = "text_only";
  if (typeof body.displayName === "string" && unsafeText(body.displayName))
    fields.displayName = "text_only";
  const kind =
    body.contentType === "article" || body.contentType === "app"
      ? body.contentType
      : null;
  if (!kind) fields.contentType = "invalid";
  if (typeof body.contentId !== "string" || body.contentId.length > 100)
    fields.contentId = "invalid";
  if (Object.keys(fields).length) return fail("validation_failed", 400, fields);
  const secret = env.COMMENTS_TURNSTILE_SECRET_KEY?.trim();
  const allowed = parseAllowedHostnames(
    env.COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES,
  );
  if (
    !secret ||
    !allowed ||
    !env.COMMENTS_IP_HASH_SECRET ||
    env.COMMENTS_IP_HASH_SECRET.length < 32
  )
    return fail("comments_not_configured", 503);
  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!token) return fail("turnstile_required", 400);
  const outcome = await (deps.verify ?? verifyTurnstile)(
    secret,
    token,
    clientIp(request),
  );
  if (
    outcome.kind !== "ok" ||
    outcome.action !== (env.COMMENTS_TURNSTILE_ACTION ?? "comment") ||
    !hostnameAllowed(outcome.hostname, allowed)
  )
    return fail(
      outcome.kind === "unavailable"
        ? "turnstile_unavailable"
        : "turnstile_failed",
      outcome.kind === "unavailable" ? 503 : 400,
    );
  const now = deps.now?.() ?? Date.now();
  const abuseKey = await hmac(clientIp(request), env.COMMENTS_IP_HASH_SECRET);
  const windowStart = Math.floor(now / 600_000) * 600_000;
  await env.CMS_DB.prepare(
    "INSERT INTO cms_comment_rate_limits(abuse_key,window_start,attempts) VALUES(?1,?2,1) ON CONFLICT(abuse_key,window_start) DO UPDATE SET attempts=attempts+1",
  )
    .bind(abuseKey, windowStart)
    .run();
  const rate = await env.CMS_DB.prepare(
    "SELECT attempts FROM cms_comment_rate_limits WHERE abuse_key=?1 AND window_start=?2",
  )
    .bind(abuseKey, windowStart)
    .first<{ attempts: number }>();
  if (Number(rate?.attempts ?? 99) > 5) return fail("rate_limited", 429);
  const content = await env.CMS_DB.prepare(
    "SELECT id,kind FROM cms_contents WHERE id=?1 AND kind=?2 AND status='published' AND deleted_at IS NULL",
  )
    .bind(body.contentId, kind)
    .first<{ id: string; kind: string }>();
  if (!content) return fail("content_not_available", 404);
  const id = crypto.randomUUID();
  await env.CMS_DB.batch([
    env.CMS_DB.prepare(
      "INSERT INTO cms_comments(id,content_id,content_kind,display_name,body,status,abuse_key,version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'pending',?6,1,?7,?7)",
    ).bind(
      id,
      content.id,
      kind,
      String(body.displayName).trim(),
      String(body.body).trim(),
      abuseKey,
      now,
    ),
    env.CMS_DB.prepare(
      "INSERT INTO cms_audit_events(id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) VALUES(?1,'public-comment','comment.submit','comment',?2,'success',?3,?4)",
    ).bind(
      crypto.randomUUID(),
      id,
      JSON.stringify({ contentId: content.id, contentKind: kind }),
      now,
    ),
  ]);
  return response({ data: { accepted: true, status: "pending" } }, 202);
}

export async function handleAdminComments(
  request: Request,
  env: CmsEnv,
  path: string[],
  identity: AccessIdentity,
  now = Date.now(),
) {
  if (!env.CMS_DB) return fail("cms_not_configured", 503);
  const id = path[1];
  if (!id && request.method === "GET") {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const valid = ["pending", "approved", "rejected", "hidden"].includes(
      status ?? "",
    );
    const q = (url.searchParams.get("q") ?? "").slice(0, 100);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30),
    );
    const clauses = ["c.deleted_at IS NULL"];
    const values: unknown[] = [];
    if (valid) {
      values.push(status);
      clauses.push(`c.status=?${values.length}`);
    }
    if (q) {
      values.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
      clauses.push(
        `(c.display_name LIKE ?${values.length} ESCAPE '\\' OR c.body LIKE ?${values.length} ESCAPE '\\')`,
      );
    }
    values.push(limit);
    const rows =
      (
        await env.CMS_DB.prepare(
          `SELECT c.*,x.title content_title FROM cms_comments c JOIN cms_contents x ON x.id=c.content_id WHERE ${clauses.join(" AND ")} ORDER BY c.created_at DESC LIMIT ?${values.length}`,
        )
          .bind(...values)
          .all<Row>()
      ).results ?? [];
    const stats =
      (
        await env.CMS_DB.prepare(
          "SELECT status,COUNT(*) count FROM cms_comments WHERE deleted_at IS NULL GROUP BY status",
        ).all<Row>()
      ).results ?? [];
    return response({
      data: rows.map(adminRow),
      meta: {
        stats: Object.fromEntries(
          stats.map((r) => [String(r.status), Number(r.count)]),
        ),
      },
    });
  }
  if (id && (request.method === "PATCH" || request.method === "DELETE")) {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BODY) return fail("payload_too_large", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY)
      return fail("payload_too_large", 413);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return fail("invalid_json", 400);
    }
    const version = Number(payload.version);
    if (!Number.isInteger(version) || version < 1)
      return fail("version_required", 400);
    const current = await env.CMS_DB.prepare(
      "SELECT status,version FROM cms_comments WHERE id=?1 AND deleted_at IS NULL",
    )
      .bind(id)
      .first<{ status: CommentStatus; version: number }>();
    if (!current) return fail("not_found", 404);
    if (Number(current.version) !== version)
      return fail("version_conflict", 409);
    if (request.method === "PATCH") {
      const status = String(payload.status);
      const transitions: Record<CommentStatus, CommentStatus[]> = {
        pending: ["approved", "rejected"],
        approved: ["hidden"],
        rejected: ["pending"],
        hidden: ["approved"],
      };
      if (
        !["pending", "approved", "rejected", "hidden"].includes(status) ||
        !transitions[current.status].includes(status as CommentStatus)
      )
        return fail("invalid_status_transition", 409);
      const nextVersion = version + 1;
      const mutationId = crypto.randomUUID();
      const result = await env.CMS_DB.batch([
        env.CMS_DB.prepare(
          "UPDATE cms_comments SET status=?1,version=version+1,updated_at=?2,moderated_at=?2,moderator_actor=?3,last_mutation_id=?4 WHERE id=?5 AND version=?6 AND deleted_at IS NULL",
        ).bind(status, now, identity.email, mutationId, id, version),
        env.CMS_DB.prepare(
          "INSERT INTO cms_audit_events(id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?1,?2,'comment.moderate','comment',?3,'success',?4,?5 WHERE EXISTS(SELECT 1 FROM cms_comments WHERE id=?3 AND last_mutation_id=?6)",
        ).bind(
          crypto.randomUUID(),
          identity.email,
          id,
          JSON.stringify({ status, fromVersion: version }),
          now,
          mutationId,
        ),
      ]);
      if (Number(result[0]?.meta?.changes ?? 0) !== 1)
        return fail("version_conflict", 409);
      return response({ data: { id, status, version: nextVersion } });
    }
    const mutationId = crypto.randomUUID();
    const result = await env.CMS_DB.batch([
      env.CMS_DB.prepare(
        "UPDATE cms_comments SET deleted_at=?1,updated_at=?1,version=version+1,moderator_actor=?2,last_mutation_id=?3 WHERE id=?4 AND version=?5 AND deleted_at IS NULL",
      ).bind(now, identity.email, mutationId, id, version),
      env.CMS_DB.prepare(
        "INSERT INTO cms_audit_events(id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?1,?2,'comment.delete','comment',?3,'success','{}',?4 WHERE EXISTS(SELECT 1 FROM cms_comments WHERE id=?3 AND last_mutation_id=?5)",
      ).bind(crypto.randomUUID(), identity.email, id, now, mutationId),
    ]);
    if (Number(result[0]?.meta?.changes ?? 0) !== 1)
      return fail("version_conflict", 409);
    return response({ data: { id, deleted: true } });
  }
  return fail("method_not_allowed", 405);
}
