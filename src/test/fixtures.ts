// Typed builders + a realistic sample MSA used by unit tests and `pnpm dev:mock`.
import type {
  AuditEvent,
  Clause,
  ClauseType,
  ClauseWithRisk,
  Contract,
  EvalRun,
  PlaybookPositionOut,
  PlaybookVersion,
  Provenance,
  Redline,
  ReviewPackage,
  RiskAssessment,
  RiskLevel,
} from "@/api/types";

export const IDS = {
  contract: "11111111-1111-4111-8111-111111111111",
  analyzing: "22222222-2222-4222-8222-222222222222",
  version: "33333333-3333-4333-8333-333333333333",
  package: "44444444-4444-4444-8444-444444444444",
};

export const USERS = {
  rita: { id: "user-rita", name: "Rita Reviewer", roles: ["reviewer" as const] },
  larry: {
    id: "user-larry",
    name: "Larry Lawyer",
    roles: ["lawyer" as const, "reviewer" as const],
  },
  ada: { id: "user-ada", name: "Ada Admin", roles: ["admin" as const, "reviewer" as const] },
};

const uuid = (n: number, prefix = "a") =>
  `${prefix.repeat(8)}-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const provenance = (over: Partial<Provenance> = {}): Provenance => ({
  provider: "fake",
  model_id: "fake-risk-analyst-1",
  prompt_id: "risk_analyst",
  prompt_version: "3",
  playbook_version_hash: "9f2c1e7a4b5d6c8e",
  retrieved_chunk_ids: ["pb-liability-1", "pb-liability-2"],
  langfuse_trace_id: "trace-123",
  ...over,
});

type Spec = {
  type: ClauseType;
  heading: string;
  text: string;
  level: RiskLevel | null;
  score?: number;
  flags?: string[];
  quote?: string;
  needsHuman?: boolean;
};

const SPECS: Spec[] = [
  {
    type: "payment",
    heading: "3. Fees",
    text: "Customer shall pay all fees within thirty (30) days of invoice. Supplier may change prices at any time on notice.",
    level: "Medium",
    score: 58,
    flags: ["unilateral price change"],
    quote: "Supplier may change prices at any time on notice.",
  },
  {
    type: "auto_renewal",
    heading: "5. Term and Renewal",
    text: "This Agreement renews automatically for successive twelve (12) month terms unless either party gives notice of non-renewal at least ninety (90) days before the end of the then-current term.",
    level: "High",
    score: 81,
    flags: ["auto-renewal notice > 60 days"],
    quote: "at least ninety (90) days before the end of the then-current term",
  },
  {
    type: "indemnity",
    heading: "7. Indemnification",
    text: "Customer shall indemnify, defend and hold harmless Supplier from any and all claims arising out of or relating to this Agreement. Supplier has no indemnification obligations.",
    level: "High",
    score: 88,
    flags: ["one-sided indemnity"],
    quote: "Supplier has no indemnification obligations.",
  },
  {
    type: "liability",
    heading: "8. Limitation of Liability",
    text: "Customer's liability under this Agreement is unlimited. Supplier's aggregate liability shall not exceed the fees paid in the preceding one (1) month.",
    level: "High",
    score: 92,
    flags: ["unlimited liability"],
    quote: "Customer's liability under this Agreement is unlimited.",
  },
  {
    type: "ip",
    heading: "9. Intellectual Property",
    text: "Customer hereby assigns to Supplier all right, title and interest in any feedback, data, materials and inventions created by Customer in connection with the Services.",
    level: "High",
    score: 79,
    flags: ["broad IP assignment"],
    quote: "assigns to Supplier all right, title and interest",
  },
  {
    type: "confidentiality",
    heading: "10. Confidentiality",
    text: "Each party shall protect the other party's Confidential Information with reasonable care for three (3) years after disclosure.",
    level: "Low",
    score: 18,
  },
  {
    type: "data_protection",
    heading: "11. Data Protection",
    text: "Supplier will process personal data as described in the applicable data processing addendum, if any.",
    level: null,
    needsHuman: true,
  },
  {
    type: "governing_law",
    heading: "14. Governing Law",
    text: "This Agreement is governed by the laws of the State of New York.",
    level: "Low",
    score: 10,
  },
];

function build() {
  let text =
    'MASTER SERVICES AGREEMENT\n\nThis Master Services Agreement is entered into between Acme Corp ("Customer") and Vendor Inc ("Supplier").\n\n';
  const clauses: ClauseWithRisk[] = [];
  const sections: {
    id: string;
    heading: string | null;
    start_offset: number;
    end_offset: number;
    order: number;
  }[] = [];
  SPECS.forEach((s, i) => {
    const sectionStart = text.length;
    text += `${s.heading}\n\n`;
    const start = text.length;
    text += s.text;
    const end = text.length;
    text += "\n\n";
    const id = uuid(i + 1, "c");
    const sectionId = uuid(i + 1, "5");
    sections.push({
      id: sectionId,
      heading: s.heading,
      start_offset: sectionStart,
      end_offset: text.length,
      order: i,
    });
    const clause: Clause = {
      id,
      contract_id: IDS.contract,
      section_id: sectionId,
      clause_type: s.type,
      heading: s.heading,
      text: s.text,
      start_offset: start,
      end_offset: end,
      order: i,
      needs_human: s.needsHuman ?? false,
    };
    let risk: RiskAssessment | null = null;
    if (s.level) {
      const q = s.quote ?? s.text.slice(0, 40);
      const qs = start + s.text.indexOf(q);
      risk = {
        id: uuid(i + 1, "r"),
        clause_id: id,
        level: s.level,
        score: s.score ?? 50,
        rationale: `Compared with playbook position for ${s.type}: ${s.flags?.[0] ?? "within preferred position"}.`,
        quoted_span: q,
        span_start: qs,
        span_end: qs + q.length,
        playbook_position_id: s.level === "High" ? uuid(i + 1, "b") : null,
        red_flags: s.flags ?? [],
        provenance: provenance(),
      };
    }
    clauses.push({ ...clause, risk });
  });
  return { text, sections, clauses };
}

export function makeDocument() {
  return build();
}

export function makeContract(over: Partial<Contract> = {}): Contract {
  return {
    id: IDS.contract,
    title: "Acme MSA",
    filename: "sample-msa.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status: "awaiting_lawyer",
    uploaded_by: USERS.rita.name,
    created_at: "2026-10-29T09:00:00Z",
    updated_at: "2026-10-29T09:05:00Z",
    page_count: 12,
    current_version_id: IDS.version,
    risk_counts: { High: 4, Medium: 1, Low: 2 },
    playbook_version_hash: "9f2c1e7a4b5d6c8e",
    ...over,
  };
}

export function makeRedlines(clauses: ClauseWithRisk[]): Redline[] {
  return clauses
    .filter((c) => c.risk?.level === "High")
    .map((c, i) => ({
      id: uuid(i + 1, "d"),
      clause_id: c.id,
      original_text: c.text,
      proposed_text: c.text
        .replace(
          "is unlimited",
          "shall not exceed the fees paid in the twelve (12) months preceding the claim",
        )
        .replace("ninety (90)", "thirty (30)")
        .replace(
          "Supplier has no indemnification obligations.",
          "Supplier shall indemnify Customer for third-party claims arising from Supplier's breach.",
        )
        .replace(
          "all right, title and interest in any feedback, data, materials and inventions",
          "a non-exclusive licence to use feedback",
        ),
      status: "proposed" as const,
      edited_text: null,
      negotiation_note: {
        issue: `${c.heading ?? c.clause_type} deviates from the playbook.`,
        ask: "Adopt the preferred playbook position.",
        fallback: "Accept the fallback position with a mutual cap.",
        walk_away: "Unacceptable position remains.",
        business_justification: "Limits uncapped financial exposure.",
      },
      comments: [],
      provenance: provenance({ model_id: "fake-negotiator-1", prompt_id: "negotiation" }),
      updated_at: "2026-10-29T09:05:00Z",
    }));
}

export function makePackage(over: Partial<ReviewPackage> = {}): ReviewPackage {
  return {
    id: IDS.package,
    contract_id: IDS.contract,
    status: "ready_for_lawyer",
    consistency_issues: [
      {
        kind: "cap_conflict",
        message: "Liability cap redline conflicts with the indemnity carve-out.",
        clause_ids: [uuid(3, "c"), uuid(4, "c")],
      },
    ],
    executive_summary:
      "Four High-risk clauses: unlimited customer liability, 90-day auto-renewal notice, one-sided indemnity and a broad IP assignment. Redlines propose a mutual cap, 30-day notice, mutual indemnity and a licence instead of assignment.",
    approver_id: null,
    approved_at: null,
    ...over,
  };
}

export function makeAudit(): AuditEvent[] {
  return [
    {
      id: uuid(1, "e"),
      actor: USERS.rita.name,
      action: "contract.uploaded",
      entity_type: "contract",
      entity_id: IDS.contract,
      created_at: "2026-10-29T09:00:00Z",
      details: { filename: "sample-msa.docx" },
    },
    {
      id: uuid(2, "e"),
      actor: "system",
      action: "package.ready_for_lawyer",
      entity_type: "package",
      entity_id: IDS.package,
      created_at: "2026-10-29T09:05:00Z",
      details: {},
    },
  ];
}

export const PLAYBOOK_TYPES: ClauseType[] = [
  "liability",
  "indemnity",
  "auto_renewal",
  "ip",
  "payment",
  "confidentiality",
  "data_protection",
  "governing_law",
  "termination",
  "other",
];

export function makePositions(hash = "9f2c1e7a4b5d6c8e"): PlaybookPositionOut[] {
  return PLAYBOOK_TYPES.flatMap((t, i) =>
    (["preferred", "fallback", "unacceptable"] as const).map((p, j) => ({
      id: uuid(i * 3 + j + 1, "b"),
      clause_type: t,
      position: p,
      text: `${p === "preferred" ? "Mutual" : p === "fallback" ? "Capped" : "Unlimited"} ${t.replace("_", " ")} terms.`,
      rationale: `Standard ${p} position for ${t}.`,
      escalation: p === "unacceptable" ? "Escalate to General Counsel." : "None.",
      jurisdiction: "US-NY",
      version_hash: hash,
    })),
  );
}

export function makeVersions(): PlaybookVersion[] {
  return [
    {
      id: "v2",
      version: 2,
      content_hash: "9f2c1e7a4b5d6c8e",
      created_at: "2026-10-20T10:00:00Z",
      created_by: USERS.ada.name,
      position_count: 30,
    },
    {
      id: "v1",
      version: 1,
      content_hash: "1a2b3c4d5e6f7a8b",
      created_at: "2026-09-01T10:00:00Z",
      created_by: USERS.ada.name,
      position_count: 29,
    },
  ];
}

export function makeEvalRuns(): EvalRun[] {
  const thresholds = { clause_f1: 0.8, risk_macro_f1: 0.7, context_precision: 0.75 };
  return [0.78, 0.81, 0.84, 0.83]
    .map((f1, i) => ({
      id: uuid(i + 1, "f"),
      kind: i === 3 ? ("full" as const) : ("smoke" as const),
      started_at: `2026-10-${String(20 + i * 2).padStart(2, "0")}T02:00:00Z`,
      finished_at: `2026-10-${String(20 + i * 2).padStart(2, "0")}T02:20:00Z`,
      status: "completed",
      metrics: { clause_f1: f1, risk_macro_f1: 0.66 + i * 0.03, context_precision: 0.8 - i * 0.01 },
      thresholds,
      passed: f1 >= 0.8 && 0.66 + i * 0.03 >= 0.7,
      report_md: `# Eval run ${i + 1}\n\nclause_f1: ${f1}\n`,
    }))
    .reverse();
}
