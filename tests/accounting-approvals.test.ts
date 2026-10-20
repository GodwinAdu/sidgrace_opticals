import { describe, it, expect } from "vitest";
import {
    resolveApprovalChain,
    nextPendingRole,
    isFullyApproved,
    type ApprovalRule,
    type ApprovalChainStep,
} from "../lib/accounting/approvals";

/**
 * A small, realistic set of threshold rules:
 *  - small spend (0..1000)        -> manager
 *  - mid spend   (1000..10000)    -> manager, finance
 *  - large spend (10000 and up)   -> manager, finance, director
 *  - default (no band matches)    -> admin
 */
const RULES: ApprovalRule[] = [
    { name: "small", minAmount: 0, maxAmount: 1000, approverRoles: ["manager"], isActive: true },
    { name: "mid", minAmount: 1000, maxAmount: 10000, approverRoles: ["manager", "finance"], isActive: true },
    { name: "large", minAmount: 10000, maxAmount: null, approverRoles: ["manager", "finance", "director"], isActive: true },
    { name: "default", minAmount: 0, maxAmount: null, approverRoles: ["admin"], isDefault: true, isActive: true },
];

/**
 * Property 7: Approval chain is deterministic and gated.
 * Validates: Requirements 6.1, 6.2, 6.3, 5.5
 */
describe("resolveApprovalChain", () => {
    it("selects the correct band for an amount", () => {
        expect(resolveApprovalChain(500, RULES)).toEqual(["manager"]);
        expect(resolveApprovalChain(5000, RULES)).toEqual(["manager", "finance"]);
        expect(resolveApprovalChain(50000, RULES)).toEqual(["manager", "finance", "director"]);
    });

    it("is deterministic: same amount + rules yields the same ordered chain", () => {
        for (let i = 0; i < 200; i++) {
            const amount = Math.floor(Math.random() * 60000);
            const first = resolveApprovalChain(amount, RULES);
            const second = resolveApprovalChain(amount, [...RULES].reverse());
            expect(second).toEqual(first);
        }
    });

    it("preserves approver-role order within the chain (R6.1)", () => {
        expect(resolveApprovalChain(50000, RULES)).toEqual(["manager", "finance", "director"]);
    });

    it("picks the most specific / highest-threshold rule when bands tie-overlap (R6.2)", () => {
        // Two active rules both contain 5000; the higher-threshold / narrower band wins.
        const overlapping: ApprovalRule[] = [
            { name: "broad", minAmount: 0, maxAmount: 100000, approverRoles: ["manager"], isActive: true },
            { name: "specific", minAmount: 5000, maxAmount: 6000, approverRoles: ["manager", "finance"], isActive: true },
        ];
        expect(resolveApprovalChain(5000, overlapping)).toEqual(["manager", "finance"]);
    });

    it("falls back to the default rule when no band matches (R6.3)", () => {
        const noBand: ApprovalRule[] = [
            { name: "narrow", minAmount: 100, maxAmount: 200, approverRoles: ["manager"], isActive: true },
            { name: "default", minAmount: 0, maxAmount: null, approverRoles: ["admin"], isDefault: true, isActive: true },
        ];
        // 50 is below the only non-default band, so the default applies.
        expect(resolveApprovalChain(50, noBand)).toEqual(["admin"]);
    });

    it("ignores inactive rules", () => {
        const withInactive: ApprovalRule[] = [
            { name: "mid-inactive", minAmount: 1000, maxAmount: 10000, approverRoles: ["manager", "finance"], isActive: false },
            { name: "default", minAmount: 0, maxAmount: null, approverRoles: ["admin"], isDefault: true, isActive: true },
        ];
        // The only band that would match is inactive, so the default applies.
        expect(resolveApprovalChain(5000, withInactive)).toEqual(["admin"]);
    });

    it("returns an empty chain when there are no rules and no default", () => {
        expect(resolveApprovalChain(5000, [])).toEqual([]);
        const noDefault: ApprovalRule[] = [
            { name: "narrow", minAmount: 100, maxAmount: 200, approverRoles: ["manager"], isActive: true },
        ];
        expect(resolveApprovalChain(50, noDefault)).toEqual([]);
    });

    it("includes the lower boundary and excludes just below it", () => {
        // minAmount is inclusive: 1000 belongs to the mid band, 999 to the small band.
        expect(resolveApprovalChain(1000, RULES)).toEqual(["manager", "finance"]);
        expect(resolveApprovalChain(999, RULES)).toEqual(["manager"]);
    });

    it("does not mutate the source rule's approverRoles array", () => {
        const chain = resolveApprovalChain(50000, RULES);
        chain.push("intruder");
        expect(RULES.find((r) => r.name === "large")!.approverRoles).toEqual([
            "manager",
            "finance",
            "director",
        ]);
    });
});

describe("nextPendingRole", () => {
    it("returns the first step with no decision (next approver in sequence)", () => {
        const chain: ApprovalChainStep[] = [
            { role: "manager", decision: "approved" },
            { role: "finance" },
            { role: "director" },
        ];
        expect(nextPendingRole(chain)).toBe("finance");
    });

    it("returns the first role when nothing has been decided yet", () => {
        const chain: ApprovalChainStep[] = [{ role: "manager" }, { role: "finance" }];
        expect(nextPendingRole(chain)).toBe("manager");
    });

    it("returns null when every step has a decision", () => {
        const chain: ApprovalChainStep[] = [
            { role: "manager", decision: "approved" },
            { role: "finance", decision: "approved" },
        ];
        expect(nextPendingRole(chain)).toBeNull();
    });

    it("returns null for an empty chain", () => {
        expect(nextPendingRole([])).toBeNull();
    });

    it("gates sequencing: only the next pending role is offered, not a later one", () => {
        // 'finance' is pending but 'manager' before it is not yet decided, so the
        // next-pending role is still 'manager' — approvals must flow in order (R5.5).
        const chain: ApprovalChainStep[] = [
            { role: "manager" },
            { role: "finance" },
        ];
        const next = nextPendingRole(chain);
        expect(next).toBe("manager");
        expect(next).not.toBe("finance");
    });
});

describe("isFullyApproved", () => {
    it("is true only when every step is approved", () => {
        expect(
            isFullyApproved([
                { role: "manager", decision: "approved" },
                { role: "finance", decision: "approved" },
            ]),
        ).toBe(true);
    });

    it("is false when a step is still pending", () => {
        expect(
            isFullyApproved([
                { role: "manager", decision: "approved" },
                { role: "finance" },
            ]),
        ).toBe(false);
    });

    it("is false when any step is rejected", () => {
        expect(
            isFullyApproved([
                { role: "manager", decision: "approved" },
                { role: "finance", decision: "rejected", reason: "over budget" },
            ]),
        ).toBe(false);
    });

    it("is false for an empty chain (nothing to approve)", () => {
        expect(isFullyApproved([])).toBe(false);
    });

    it("agrees with nextPendingRole: fully approved iff no role is pending", () => {
        const chain: ApprovalChainStep[] = [
            { role: "manager", decision: "approved" },
            { role: "finance", decision: "approved" },
            { role: "director", decision: "approved" },
        ];
        expect(nextPendingRole(chain)).toBeNull();
        expect(isFullyApproved(chain)).toBe(true);
    });
});

/* ───────────────────────── MULTI-APPROVER ENGINE ───────────────────────── */

import {
    resolveApprovalSteps,
    stepsFromRoles,
    isStepSatisfied,
    stepHasRejection,
    nextPendingStepIndex,
    canUserActOnStep,
    hasUserDecided,
    isChainFullyApproved,
    describeStep,
    type MultiApprovalRule,
    type ChainStep,
} from "../lib/accounting/approvals";

function freeze(steps: { approvers: { kind: "staff" | "role"; value: string }[]; requiredCount: number }[]): ChainStep[] {
    return steps.map((s) => ({ approvers: s.approvers, requiredCount: s.requiredCount, decisions: [] }));
}

describe("stepsFromRoles (legacy bridge)", () => {
    it("turns each role into an ordered 1-of-1 step", () => {
        const steps = stepsFromRoles(["manager", "finance"]);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toEqual({ approvers: [{ kind: "role", value: "manager" }], requiredCount: 1 });
        expect(steps[1].requiredCount).toBe(1);
    });

    it("drops empty/blank roles", () => {
        expect(stepsFromRoles(["", "  ", "manager"])).toHaveLength(1);
    });
});

describe("resolveApprovalSteps", () => {
    const rules: MultiApprovalRule[] = [
        {
            name: "big",
            minAmount: 1000,
            maxAmount: null,
            isActive: true,
            steps: [
                { approvers: [{ kind: "staff", value: "ada" }], requiredCount: 1 },
                {
                    approvers: [
                        { kind: "staff", value: "max" },
                        { kind: "staff", value: "dana" },
                        { kind: "role", value: "director" },
                    ],
                    requiredCount: 2,
                },
            ],
        },
        { name: "small", minAmount: 0, maxAmount: 1000, approverRoles: ["manager"], isActive: true },
        { name: "fallback", minAmount: 0, maxAmount: null, approverRoles: ["admin"], isDefault: true, isActive: true },
    ];

    it("returns structured steps from the matching band", () => {
        const steps = resolveApprovalSteps(5000, rules);
        expect(steps).toHaveLength(2);
        expect(steps[0].approvers[0]).toEqual({ kind: "staff", value: "ada", label: undefined });
        expect(steps[1].requiredCount).toBe(2);
        expect(steps[1].approvers).toHaveLength(3);
    });

    it("converts a legacy role-only rule into role steps", () => {
        const steps = resolveApprovalSteps(500, rules);
        expect(steps).toHaveLength(1);
        expect(steps[0]).toEqual({ approvers: [{ kind: "role", value: "manager", label: undefined }], requiredCount: 1 });
    });

    it("falls back to the default rule when no band matches", () => {
        const narrow: MultiApprovalRule[] = [
            { name: "n", minAmount: 100, maxAmount: 200, approverRoles: ["manager"], isActive: true },
            { name: "def", minAmount: 0, maxAmount: null, approverRoles: ["admin"], isDefault: true, isActive: true },
        ];
        expect(resolveApprovalSteps(5, narrow)[0].approvers[0].value).toBe("admin");
    });

    it("clamps requiredCount into [1, approverCount]", () => {
        const r: MultiApprovalRule[] = [
            {
                name: "q",
                minAmount: 0,
                maxAmount: null,
                isActive: true,
                isDefault: true,
                steps: [{ approvers: [{ kind: "staff", value: "a" }, { kind: "staff", value: "b" }], requiredCount: 9 }],
            },
        ];
        expect(resolveApprovalSteps(50, r)[0].requiredCount).toBe(2);
    });
});

describe("quorum step satisfaction", () => {
    it("needs requiredCount approvals, not just one", () => {
        const chain = freeze([
            { approvers: [{ kind: "staff", value: "max" }, { kind: "staff", value: "dana" }, { kind: "staff", value: "ada" }], requiredCount: 2 },
        ]);
        expect(isStepSatisfied(chain[0])).toBe(false);
        chain[0].decisions.push({ approverId: "max", decision: "approved" });
        expect(isStepSatisfied(chain[0])).toBe(false); // 1 of 2
        chain[0].decisions.push({ approverId: "dana", decision: "approved" });
        expect(isStepSatisfied(chain[0])).toBe(true); // 2 of 2
    });

    it("a rejection on a step blocks the whole chain even if quorum is otherwise met", () => {
        const chain = freeze([
            { approvers: [{ kind: "staff", value: "max" }, { kind: "staff", value: "dana" }], requiredCount: 1 },
        ]);
        chain[0].decisions.push({ approverId: "max", decision: "approved" });
        chain[0].decisions.push({ approverId: "dana", decision: "rejected", reason: "no" });
        expect(stepHasRejection(chain[0])).toBe(true);
        expect(isChainFullyApproved(chain)).toBe(false);
    });
});

describe("sequential ordering across steps", () => {
    const mk = () =>
        freeze([
            { approvers: [{ kind: "staff", value: "ada" }], requiredCount: 1 },
            { approvers: [{ kind: "staff", value: "max" }, { kind: "staff", value: "dana" }], requiredCount: 2 },
        ]);

    it("step 2 is not actionable until step 1 is satisfied", () => {
        const chain = mk();
        expect(nextPendingStepIndex(chain)).toBe(0);
        chain[0].decisions.push({ approverId: "ada", decision: "approved" });
        expect(nextPendingStepIndex(chain)).toBe(1);
    });

    it("full approval requires every step's quorum, in or out of order within a step", () => {
        const chain = mk();
        chain[0].decisions.push({ approverId: "ada", decision: "approved" });
        chain[1].decisions.push({ approverId: "dana", decision: "approved" });
        expect(isChainFullyApproved(chain)).toBe(false); // step 2 needs 2
        chain[1].decisions.push({ approverId: "max", decision: "approved" });
        expect(isChainFullyApproved(chain)).toBe(true);
        expect(nextPendingStepIndex(chain)).toBe(-1);
    });
});

describe("who may act on a step", () => {
    const step: ChainStep = {
        approvers: [{ kind: "staff", value: "ada" }, { kind: "role", value: "director" }],
        requiredCount: 1,
        decisions: [],
    };

    it("allows a named staff member", () => {
        expect(canUserActOnStep(step, { staffId: "ada" })).toBe(true);
    });

    it("allows any holder of a listed role", () => {
        expect(canUserActOnStep(step, { staffId: "zoe", role: "director" })).toBe(true);
    });

    it("denies a user who is neither the named staff nor a listed role", () => {
        expect(canUserActOnStep(step, { staffId: "zoe", role: "nurse" })).toBe(false);
    });

    it("detects a repeat decision by the same approver", () => {
        const s: ChainStep = { ...step, decisions: [{ approverId: "ada", decision: "approved" }] };
        expect(hasUserDecided(s, { staffId: "ada" })).toBe(true);
        expect(hasUserDecided(s, { staffId: "zoe" })).toBe(false);
    });
});

describe("describeStep", () => {
    it("labels a single approver plainly", () => {
        expect(describeStep({ approvers: [{ kind: "staff", value: "ada", label: "Ada" }], requiredCount: 1, decisions: [] })).toBe("Ada");
    });
    it("labels an all-of step", () => {
        const s: ChainStep = { approvers: [{ kind: "staff", value: "a", label: "Ada" }, { kind: "staff", value: "m", label: "Max" }], requiredCount: 2, decisions: [] };
        expect(describeStep(s)).toBe("all of: Ada, Max");
    });
    it("labels an N-of-M quorum", () => {
        const s: ChainStep = { approvers: [{ kind: "staff", value: "a", label: "Ada" }, { kind: "staff", value: "m", label: "Max" }, { kind: "staff", value: "d", label: "Dana" }], requiredCount: 2, decisions: [] };
        expect(describeStep(s)).toBe("2 of 3: Ada, Max, Dana");
    });
});
