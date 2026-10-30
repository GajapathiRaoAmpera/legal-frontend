// Stateful MSW handlers covering every endpoint in API_CONTRACT.md. Used by unit tests (node) and `pnpm dev:mock` (browser).
import { delay, http, HttpResponse, sse } from "msw";
import type {
  Approval,
  ApprovalCreate,
  AuditEvent,
  Comment,
  Contract,
  ContractText,
  DevUser,
  EvalRun,
  FeedbackCreate,
  Me,
  PlaybookPositionIn,
  PlaybookPositionOut,
  PlaybookPositionPatch,
  PlaybookVersion,
  Redline,
  ReviewPackage,
} from "@/api/types";
import {
  IDS,
  makeAudit,
  makeContract,
  makeDocument,
  makeEvalRuns,
  makePackage,
  makePositions,
  makeRedlines,
  makeVersions,
  USERS,
} from "./fixtures";

const API = "/api/v1";

function createDb() {
  const doc = makeDocument();
  const text: ContractText = { text: doc.text, sections: doc.sections };
  return {
    contracts: [
      makeContract(),
      makeContract({
        id: IDS.analyzing,
        title: "Globex SaaS Agreement",
        filename: "saas-agreement.pdf",
        mime_type: "application/pdf",
        status: "analyzing",
        risk_counts: { High: 0, Medium: 0, Low: 0 },
        updated_at: "2026-10-30T08:00:00Z",
      }),
    ] as Contract[],
    texts: new Map<string, ContractText>([[IDS.contract, text]]),
    clauses: new Map([[IDS.contract, doc.clauses]]),
    redlines: new Map<string, Redline[]>([[IDS.contract, makeRedlines(doc.clauses)]]),
    packages: new Map<string, ReviewPackage>([[IDS.contract, makePackage()]]),
    approvals: [] as Approval[],
    audit: new Map<string, AuditEvent[]>([[IDS.contract, makeAudit()]]),
    feedback: [] as FeedbackCreate[],
    positions: makePositions(),
    versions: makeVersions(),
    evalRuns: makeEvalRuns(),
  };
}

export let db = createDb();
export const resetDb = () => {
  db = createDb();
};

const problem = (
  status: number,
  title: string,
  detail?: string,
  headers?: Record<string, string>,
) =>
  HttpResponse.json(
    { type: "about:blank", title, status, detail: detail ?? null, instance: null },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );

function currentUser(request: Request): Me | null {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  const name = token.split(".")[2] as DevUser | undefined; // mock token: header.payload.<user>
  return name && name in USERS ? USERS[name] : null;
}

const fakeJwt = (user: DevUser) =>
  `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ sub: USERS[user].id, exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=+$/, "")}.${user}`;

const contractOr404 = (id: string) => db.contracts.find((c) => c.id === id);
const now = () => new Date().toISOString();

function audit(
  contractId: string,
  actor: string,
  action: string,
  entity_type: string,
  entity_id: string,
  details: Record<string, unknown> = {},
) {
  const list = db.audit.get(contractId) ?? [];
  list.push({
    id: crypto.randomUUID(),
    actor,
    action,
    entity_type,
    entity_id,
    created_at: now(),
    details,
  });
  db.audit.set(contractId, list);
}

function findRedline(id: string): { contractId: string; redline: Redline; list: Redline[] } | null {
  for (const [contractId, list] of db.redlines) {
    const redline = list.find((r) => r.id === id);
    if (redline) return { contractId, redline, list };
  }
  return null;
}

const locked = (contractId: string) => {
  const s = db.packages.get(contractId)?.status;
  return s === "approved" || s === "rejected";
};

export const handlers = [
  http.post(`${API}/auth/dev-token`, async ({ request }) => {
    const body = (await request.json()) as { user?: string };
    if (!body.user || !(body.user in USERS)) return problem(422, "Unknown dev user");
    const user = body.user as DevUser;
    return HttpResponse.json({ access_token: fakeJwt(user), user: USERS[user] });
  }),

  // everything below needs a bearer token
  http.all(`${API}/*`, ({ request }) => {
    if (new URL(request.url).pathname.endsWith("/events")) return undefined;
    if (!currentUser(request)) return problem(401, "Not authenticated");
    return undefined;
  }),

  http.get(`${API}/me`, ({ request }) => HttpResponse.json(currentUser(request))),

  http.get(`${API}/contracts`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 25);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const status = url.searchParams.get("status");
    const all = db.contracts.filter((c) => !status || c.status === status);
    return HttpResponse.json({
      items: all.slice(offset, offset + limit),
      total: all.length,
      limit,
      offset,
    });
  }),

  http.post(`${API}/contracts`, async ({ request }) => {
    const me = currentUser(request);
    if (!me?.roles.length) return problem(403, "Forbidden");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return problem(422, "File is required");
    if (!/\.(docx|pdf)$/i.test(file.name))
      return problem(415, "Unsupported file type", "Upload a .docx or .pdf.");
    if (file.size > 25 * 1024 * 1024) return problem(413, "File too large", "The limit is 25 MB.");
    const title = form.get("title");
    const id = crypto.randomUUID();
    const contract = makeContract({
      id,
      title: typeof title === "string" && title ? title : file.name.replace(/\.(docx|pdf)$/i, ""),
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      status: "uploaded",
      uploaded_by: me.name,
      created_at: now(),
      updated_at: now(),
      risk_counts: { High: 0, Medium: 0, Low: 0 },
    });
    db.contracts.unshift(contract);
    // copy the sample document so the mock flow is walkable end to end
    const doc = makeDocument();
    const clauses = doc.clauses.map((c) => ({ ...c, contract_id: id }));
    db.texts.set(id, { text: doc.text, sections: doc.sections });
    db.clauses.set(id, clauses);
    db.redlines.set(
      id,
      makeRedlines(clauses).map((r) => ({ ...r, id: crypto.randomUUID() })),
    );
    db.packages.set(id, makePackage({ id: crypto.randomUUID(), contract_id: id, status: "draft" }));
    audit(id, me.name, "contract.uploaded", "contract", id, { filename: file.name });
    return HttpResponse.json(contract, { status: 202 });
  }),

  http.get(`${API}/contracts/:contract_id`, ({ params }) => {
    const c = contractOr404(String(params.contract_id));
    return c ? HttpResponse.json(c) : problem(404, "Contract not found");
  }),

  http.get(`${API}/contracts/:contract_id/text`, ({ params }) => {
    const t = db.texts.get(String(params.contract_id));
    return t ? HttpResponse.json(t) : problem(404, "Contract not found");
  }),

  http.get(`${API}/contracts/:contract_id/clauses`, ({ params, request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 200);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const all = db.clauses.get(String(params.contract_id)) ?? [];
    return HttpResponse.json({
      items: all.slice(offset, offset + limit),
      total: all.length,
      limit,
      offset,
    });
  }),

  http.get(`${API}/contracts/:contract_id/risk-report`, ({ params }) => {
    const id = String(params.contract_id);
    const items = db.clauses.get(id) ?? [];
    const counts = { High: 0, Medium: 0, Low: 0 };
    const rows = new Map<string, { High: number; Medium: number; Low: number }>();
    for (const c of items) {
      if (!c.risk) continue;
      counts[c.risk.level]++;
      const row = rows.get(c.clause_type) ?? { High: 0, Medium: 0, Low: 0 };
      row[c.risk.level]++;
      rows.set(c.clause_type, row);
    }
    return HttpResponse.json({
      contract_id: id,
      counts,
      heatmap: [...rows].map(([clause_type, r]) => ({ clause_type, ...r })),
      executive_summary: db.packages.get(id)?.executive_summary ?? "",
      items,
    });
  }),

  http.get(`${API}/contracts/:contract_id/redlines`, ({ params }) =>
    HttpResponse.json(db.redlines.get(String(params.contract_id)) ?? []),
  ),

  ...(["accept", "reject"] as const).map((action) =>
    http.post(`${API}/redlines/:redline_id/${action}`, ({ params, request }) => {
      const hit = findRedline(String(params.redline_id));
      if (!hit) return problem(404, "Redline not found");
      if (locked(hit.contractId)) return problem(409, "Package is locked");
      const updated: Redline = {
        ...hit.redline,
        status: action === "accept" ? "accepted" : "rejected",
        updated_at: now(),
      };
      hit.list.splice(hit.list.indexOf(hit.redline), 1, updated);
      audit(
        hit.contractId,
        currentUser(request)?.name ?? "?",
        `redline.${action}ed`,
        "redline",
        updated.id,
      );
      return HttpResponse.json(updated);
    }),
  ),

  http.patch(`${API}/redlines/:redline_id`, async ({ params, request }) => {
    const hit = findRedline(String(params.redline_id));
    if (!hit) return problem(404, "Redline not found");
    if (locked(hit.contractId)) return problem(409, "Package is locked");
    const { edited_text } = (await request.json()) as { edited_text: string };
    const updated: Redline = { ...hit.redline, status: "edited", edited_text, updated_at: now() };
    hit.list.splice(hit.list.indexOf(hit.redline), 1, updated);
    audit(
      hit.contractId,
      currentUser(request)?.name ?? "?",
      "redline.edited",
      "redline",
      updated.id,
    );
    return HttpResponse.json(updated);
  }),

  http.post(`${API}/redlines/:redline_id/comments`, async ({ params, request }) => {
    const hit = findRedline(String(params.redline_id));
    if (!hit) return problem(404, "Redline not found");
    if (locked(hit.contractId)) return problem(409, "Package is locked");
    const { body } = (await request.json()) as { body: string };
    if (!body.trim()) return problem(422, "Comment is empty");
    const comment: Comment = {
      id: crypto.randomUUID(),
      author: currentUser(request)?.name ?? "?",
      body,
      created_at: now(),
    };
    const updated = { ...hit.redline, comments: [...hit.redline.comments, comment] };
    hit.list.splice(hit.list.indexOf(hit.redline), 1, updated);
    return HttpResponse.json(comment, { status: 201 });
  }),

  http.get(`${API}/contracts/:contract_id/package`, ({ params }) => {
    const p = db.packages.get(String(params.contract_id));
    return p ? HttpResponse.json(p) : problem(404, "Package not found");
  }),

  http.get(`${API}/packages/:package_id/approvals`, ({ params }) =>
    HttpResponse.json(db.approvals.filter((a) => a.package_id === params.package_id)),
  ),

  http.post(`${API}/packages/:package_id/approvals`, async ({ params, request }) => {
    const me = currentUser(request);
    if (!me?.roles.includes("lawyer")) return problem(403, "Only lawyers can approve");
    const entry = [...db.packages].find(([, p]) => p.id === params.package_id);
    if (!entry) return problem(404, "Package not found");
    const [contractId, pkg] = entry;
    if (pkg.status !== "ready_for_lawyer")
      return problem(
        409,
        "Package is not ready for a lawyer decision",
        `Current status: ${pkg.status}`,
      );
    const body = (await request.json()) as ApprovalCreate;
    if (body.decision === "reject" && !body.comment?.trim())
      return problem(422, "Comment required", "A comment is required to reject.");
    const approval: Approval = {
      id: crypto.randomUUID(),
      package_id: pkg.id,
      decision: body.decision,
      comment: body.comment,
      user_id: me.id,
      created_at: now(),
    };
    db.approvals.unshift(approval);
    const status =
      body.decision === "approve"
        ? "approved"
        : body.decision === "reject"
          ? "rejected"
          : "changes_requested";
    db.packages.set(contractId, {
      ...pkg,
      status,
      ...(status === "approved" ? { approver_id: me.id, approved_at: now() } : {}),
    });
    const c = contractOr404(contractId);
    if (c) Object.assign(c, { status, updated_at: now() });
    audit(
      contractId,
      me.name,
      `package.${status}`,
      "package",
      pkg.id,
      body.comment ? { comment: body.comment } : {},
    );
    return HttpResponse.json(approval, { status: 201 });
  }),

  http.post(`${API}/packages/:package_id/resubmit`, ({ params, request }) => {
    const entry = [...db.packages].find(([, p]) => p.id === params.package_id);
    if (!entry) return problem(404, "Package not found");
    const [contractId, pkg] = entry;
    if (pkg.status !== "changes_requested") return problem(409, "Package is not awaiting changes");
    const updated: ReviewPackage = { ...pkg, status: "ready_for_lawyer" };
    db.packages.set(contractId, updated);
    const c = contractOr404(contractId);
    if (c) Object.assign(c, { status: "awaiting_lawyer", updated_at: now() });
    audit(contractId, currentUser(request)?.name ?? "?", "package.resubmitted", "package", pkg.id);
    return HttpResponse.json(updated);
  }),

  http.get(`${API}/contracts/:contract_id/audit`, ({ params }) =>
    HttpResponse.json(db.audit.get(String(params.contract_id)) ?? []),
  ),

  http.get(`${API}/contracts/:contract_id/export`, ({ params, request }) => {
    const id = String(params.contract_id);
    const pkg = db.packages.get(id);
    if (!(pkg?.status === "approved" && pkg.approver_id))
      return problem(409, "Export is available after a lawyer approves the package.");
    const format = new URL(request.url).searchParams.get("format");
    const pdf = format === "side_by_side_pdf";
    return new HttpResponse(new Blob([pdf ? "%PDF-1.4 mock" : "PK mock docx"]), {
      headers: {
        "Content-Type": pdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="acme-msa-${format ?? "redlined_docx"}.${pdf ? "pdf" : "docx"}"`,
      },
    });
  }),

  http.post(`${API}/feedback`, async ({ request }) => {
    db.feedback.push((await request.json()) as FeedbackCreate);
    return new HttpResponse(null, { status: 201 });
  }),

  http.get(`${API}/playbook/positions`, ({ request }) => {
    const t = new URL(request.url).searchParams.get("clause_type");
    return HttpResponse.json(db.positions.filter((p) => !t || p.clause_type === t));
  }),

  ...(() => {
    const bump = (actor: string): PlaybookVersion => {
      const latest = db.versions[0];
      const hash = Math.random().toString(16).slice(2, 18).padEnd(16, "0");
      const v: PlaybookVersion = {
        id: `v${(latest?.version ?? 0) + 1}`,
        version: (latest?.version ?? 0) + 1,
        content_hash: hash,
        created_at: now(),
        created_by: actor,
        position_count: db.positions.length,
      };
      db.versions.unshift(v);
      db.positions = db.positions.map((p) => ({ ...p, version_hash: hash }));
      return v;
    };
    const admin = (request: Request) =>
      currentUser(request)?.roles.includes("admin") ? currentUser(request) : null;
    return [
      http.post(`${API}/playbook/positions`, async ({ request }) => {
        const me = admin(request);
        if (!me) return problem(403, "Only admins edit the playbook");
        const body = (await request.json()) as PlaybookPositionIn;
        db.positions.push({
          ...body,
          id: crypto.randomUUID(),
          version_hash: "",
        } satisfies PlaybookPositionOut);
        return HttpResponse.json(bump(me.name), { status: 201 });
      }),
      http.patch(`${API}/playbook/positions/:position_id`, async ({ params, request }) => {
        const me = admin(request);
        if (!me) return problem(403, "Only admins edit the playbook");
        const i = db.positions.findIndex((p) => p.id === params.position_id);
        const current = db.positions[i];
        if (!current) return problem(404, "Position not found");
        db.positions[i] = { ...current, ...((await request.json()) as PlaybookPositionPatch) };
        return HttpResponse.json(bump(me.name));
      }),
      http.delete(`${API}/playbook/positions/:position_id`, ({ params, request }) => {
        const me = admin(request);
        if (!me) return problem(403, "Only admins edit the playbook");
        db.positions = db.positions.filter((p) => p.id !== params.position_id);
        return HttpResponse.json(bump(me.name));
      }),
    ];
  })(),

  http.get(`${API}/playbook/versions`, () => HttpResponse.json(db.versions)),

  http.get(`${API}/playbook/versions/:a/diff/:b`, () => {
    const [first, second] = db.positions;
    return HttpResponse.json({
      added: first ? [first] : [],
      removed: [],
      changed: second
        ? [{ before: { ...second, text: "Old wording for this position." }, after: second }]
        : [],
    });
  }),

  http.get(`${API}/eval/runs`, () => HttpResponse.json(db.evalRuns)),
  http.get(`${API}/eval/runs/:run_id`, ({ params }) => {
    const r = db.evalRuns.find((x) => x.id === params.run_id);
    return r ? HttpResponse.json(r) : problem(404, "Run not found");
  }),
  http.post(`${API}/eval/runs`, async ({ request }) => {
    if (!currentUser(request)?.roles.includes("admin"))
      return problem(403, "Only admins start eval runs");
    const { kind } = (await request.json()) as { kind: EvalRun["kind"] };
    const run: EvalRun = {
      id: crypto.randomUUID(),
      kind,
      started_at: now(),
      finished_at: null,
      status: "running",
      metrics: {},
      thresholds: {},
      passed: null,
      report_md: null,
    };
    db.evalRuns.unshift(run);
    return HttpResponse.json(run, { status: 202 });
  }),
];

/** Browser-only (dev:mock): simulated agent progress. Status snapshot first, then stages, then done. */
export const makeSseHandlers = () => [
  sse<{ status: string; progress: string; done: string }>(
    `${API}/contracts/:contract_id/events`,
    async ({ client, params }) => {
      const c = contractOr404(String(params.contract_id));
      if (!c) {
        client.close();
        return;
      }
      client.send({ event: "status", data: JSON.stringify({ status: c.status }) });
      const stages = ["parsing", "extracting", "assessing", "negotiating", "reviewing"];
      for (const [i, stage] of stages.entries()) {
        await delay(700);
        if (i === 1) Object.assign(c, { status: "analyzing" });
        client.send({
          event: "progress",
          data: JSON.stringify({
            stage,
            node: stage,
            done: i + 1,
            total: stages.length,
            message: `${stage}…`,
          }),
        });
      }
      Object.assign(c, {
        status: "awaiting_lawyer",
        risk_counts: { High: 4, Medium: 1, Low: 2 },
        updated_at: now(),
      });
      const pkg = db.packages.get(c.id);
      if (pkg) db.packages.set(c.id, { ...pkg, status: "ready_for_lawyer" });
      client.send({ event: "status", data: JSON.stringify({ status: "awaiting_lawyer" }) });
      client.send({ event: "done", data: "{}" });
      client.close();
    },
  ),
];

export { USERS, fakeJwt };
