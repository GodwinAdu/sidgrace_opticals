/**
 * Pure, dependency-free approval-chain engine.
 *
 * These helpers resolve which approver roles an expense needs (from configurable
 * threshold rules), decide which role is next in a frozen chain, and tell whether
 * a chain is fully approved. They are DB/React-free so they stay unit-testable in
 * isolation; the expense/approval action layer calls these so the gating behavior
 * is identical between the app and the tests.
 *
 * Determinism matters: for the same amount + the same rules, `resolveApprovalChain`
 * always returns the same ordered roles (Property 7, R6.2).
 */

/**
 * A configurable approval rule. A rule maps an amount band to an ordered chain of
 * approver roles. `maxAmount` of null/undefined means "and above" (open-ended top).
 * `isDefault` flags the fallback rule used when no band contains the amount.
 */
export interface ApprovalRule {
    name: string;
    minAmount: number;
    maxAmount?: number | null;
    approverRoles: string[];
    isDefault?: boolean;
    isActive: boolean;
}

/** The decision recorded for a single step of a frozen approval chain. */
export type ApprovalDecision = "approved" | "rejected";

/**
 * One step of an expense's frozen approval chain. `role` is the required approver
 * role; a step is "pending" until it carries a `decision`.
 */
export interface ApprovalChainStep {
    role: string;
    approverId?: string;
    decision?: ApprovalDecision;
    reason?: string;
    decidedAt?: Date;
}

/** Coerce a value to a finite number (0 for junk/NaN). */
function toNumber(value: number | undefined | null): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * True when a rule's band contains the amount: minAmount <= amount, and either the
 * band is open-ended at the top (maxAmount null/undefined) or amount <= maxAmount.
 */
function bandContains(rule: ApprovalRule, amount: number): boolean {
    const min = toNumber(rule.minAmount);
    if (amount < min) return false;
    if (rule.maxAmount === null || rule.maxAmount === undefined) return true;
    return amount <= toNumber(rule.maxAmount);
}

/**
 * Resolve the ordered list of approver roles required for an amount.
 *
 * Deterministic (Property 7, R6.2): among the active rules whose band contains the
 * amount, pick the most specific / highest-threshold one — the rule with the
 * greatest `minAmount`, breaking ties by the narrower band (smaller max span) and
 * then by name, so the same amount + rules always yield the same chain. When no
 * band matches, fall back to the active rule flagged `isDefault` (R6.3). Returns a
 * fresh copy of that rule's `approverRoles` in order (empty when nothing applies).
 */
export function resolveApprovalChain(amount: number, rules: ApprovalRule[]): string[] {
    if (!Array.isArray(rules) || rules.length === 0) return [];
    const amt = toNumber(amount);

    const active = rules.filter((r) => r && r.isActive);

    const matching = active.filter((r) => bandContains(r, amt));

    if (matching.length > 0) {
        const best = [...matching].sort(compareSpecificity)[0];
        return [...(best.approverRoles ?? [])];
    }

    // No band matched: fall back to the configured default rule (R6.3).
    const defaults = active.filter((r) => r.isDefault);
    if (defaults.length > 0) {
        const best = [...defaults].sort(compareSpecificity)[0];
        return [...(best.approverRoles ?? [])];
    }

    return [];
}

/**
 * Order two rules from most-specific/highest-threshold to least. Higher `minAmount`
 * first; then the narrower band (open-ended bands rank last); then name, so the
 * ordering is total and deterministic for identical inputs.
 */
function compareSpecificity(a: ApprovalRule, b: ApprovalRule): number {
    const minA = toNumber(a.minAmount);
    const minB = toNumber(b.minAmount);
    if (minA !== minB) return minB - minA; // higher threshold first

    const spanA = bandSpan(a);
    const spanB = bandSpan(b);
    if (spanA !== spanB) return spanA - spanB; // narrower band first

    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** The width of a rule's band; open-ended bands are treated as the widest. */
function bandSpan(rule: ApprovalRule): number {
    if (rule.maxAmount === null || rule.maxAmount === undefined) return Number.POSITIVE_INFINITY;
    return toNumber(rule.maxAmount) - toNumber(rule.minAmount);
}

/**
 * The role of the first step with no decision yet — the next approver required in
 * sequence — or null when every step already has a decision (or the chain is empty).
 */
export function nextPendingRole(chain: ApprovalChainStep[]): string | null {
    if (!Array.isArray(chain)) return null;
    const next = chain.find((step) => step && !step.decision);
    return next ? next.role : null;
}

/**
 * True only when the chain is non-empty and every step's decision is "approved".
 * A pending step or any rejected step makes it false.
 */
export function isFullyApproved(chain: ApprovalChainStep[]): boolean {
    if (!Array.isArray(chain) || chain.length === 0) return false;
    return chain.every((step) => step && step.decision === "approved");
}

/* ════════════════════════════════════════════════════════════════════════════
 * MULTI-APPROVER EXTENSION (named staff + role approvers, quorum per step)
 *
 * The functions above remain for the original role-only chains. The types and
 * functions below add two capabilities without breaking them:
 *   1. A step's approvers can be a specific STAFF member or a ROLE (mixed).
 *   2. A step can require a QUORUM — N of the listed approvers must approve
 *      before the step is satisfied and the chain advances.
 * Steps are still ordered: step k only becomes actionable once every earlier
 * step is satisfied.
 * ════════════════════════════════════════════════════════════════════════════ */

/** An approver slot on a step: a named staff member or any holder of a role. */
export interface StepApprover {
    kind: "staff" | "role";
    /** staffId when kind="staff"; the role name when kind="role". */
    value: string;
    /** Optional display label (staff full name / role label). */
    label?: string;
}

/** A configurable step on a rule: who may approve and how many must. */
export interface ApprovalRuleStep {
    approvers: StepApprover[];
    /** How many of `approvers` must approve for the step to pass (quorum). */
    requiredCount: number;
}

/** A rule that may use structured steps and/or the legacy role list. */
export interface MultiApprovalRule {
    name: string;
    minAmount: number;
    maxAmount?: number | null;
    /** New structured steps (named staff/roles + quorum). */
    steps?: ApprovalRuleStep[];
    /** Legacy ordered role chain; each role becomes a 1-of-1 step. */
    approverRoles?: string[];
    isDefault?: boolean;
    isActive: boolean;
}

/** A single recorded decision within a step (one per acting approver). */
export interface StepDecisionRecord {
    approverId: string;
    approverName?: string;
    decision: ApprovalDecision;
    reason?: string;
    decidedAt?: Date;
}

/**
 * One frozen step of an expense's chain. `approvers` + `requiredCount` are
 * copied from the rule at submit time; `decisions` accumulates as approvers act.
 */
export interface ChainStep {
    approvers: StepApprover[];
    requiredCount: number;
    decisions: StepDecisionRecord[];
}

/** A minimal identity for permission checks against a step. */
export interface ActingUser {
    staffId: string;
    role?: string;
}

/** Coerce a required-count to a sane integer >= 1, capped at the approver count. */
function sanitizeRequiredCount(requiredCount: number | undefined, approverCount: number): number {
    const n = Math.floor(Number(requiredCount));
    if (!Number.isFinite(n) || n < 1) return 1;
    if (approverCount > 0 && n > approverCount) return approverCount;
    return n;
}

/**
 * Normalise a legacy role list into structured steps: each role becomes its own
 * ordered step requiring a single approval from any holder of that role. This is
 * what keeps old `approverRoles`-only rules working through the new engine.
 */
export function stepsFromRoles(roles: string[] | undefined): ApprovalRuleStep[] {
    return (roles ?? [])
        .map((r) => String(r).trim())
        .filter(Boolean)
        .map((role) => ({ approvers: [{ kind: "role" as const, value: role }], requiredCount: 1 }));
}

/**
 * Resolve the ordered, structured steps for an amount. Mirrors
 * `resolveApprovalChain`'s selection (most specific active band, else the
 * default rule), but returns full steps. A rule's explicit `steps` win; if it
 * has none, its legacy `approverRoles` are converted via `stepsFromRoles`.
 * Returns an empty array when nothing applies.
 */
export function resolveApprovalSteps(amount: number, rules: MultiApprovalRule[]): ApprovalRuleStep[] {
    if (!Array.isArray(rules) || rules.length === 0) return [];
    const amt = toNumber(amount);
    const active = rules.filter((r) => r && r.isActive);

    const pick = (candidates: MultiApprovalRule[]): MultiApprovalRule | null => {
        if (candidates.length === 0) return null;
        return [...candidates].sort((a, b) =>
            compareSpecificity(
                { name: a.name, minAmount: a.minAmount, maxAmount: a.maxAmount, approverRoles: [], isActive: a.isActive },
                { name: b.name, minAmount: b.minAmount, maxAmount: b.maxAmount, approverRoles: [], isActive: b.isActive },
            ),
        )[0];
    };

    const matching = active.filter((r) =>
        bandContains({ name: r.name, minAmount: r.minAmount, maxAmount: r.maxAmount, approverRoles: [], isActive: r.isActive }, amt),
    );
    const chosen = pick(matching) ?? pick(active.filter((r) => r.isDefault));
    if (!chosen) return [];

    const raw =
        chosen.steps && chosen.steps.length > 0 ? chosen.steps : stepsFromRoles(chosen.approverRoles);

    // Freeze a clean copy with a sane required count.
    return raw
        .map((s) => ({
            approvers: (s.approvers ?? []).map((a) => ({ kind: a.kind, value: a.value, label: a.label })),
            requiredCount: sanitizeRequiredCount(s.requiredCount, (s.approvers ?? []).length),
        }))
        .filter((s) => s.approvers.length > 0);
}

/** The approved-decision count on a step (rejections don't count toward quorum). */
function approvedCount(step: ChainStep): number {
    return (step.decisions ?? []).filter((d) => d && d.decision === "approved").length;
}

/** True when any decision on the step is a rejection. */
export function stepHasRejection(step: ChainStep): boolean {
    return (step.decisions ?? []).some((d) => d && d.decision === "rejected");
}

/** True when the step has met its approval quorum. */
export function isStepSatisfied(step: ChainStep): boolean {
    if (!step) return false;
    return approvedCount(step) >= sanitizeRequiredCount(step.requiredCount, (step.approvers ?? []).length);
}

/**
 * The index of the first step not yet satisfied — the step currently open for
 * decisions — or -1 when every step is satisfied (or the chain is empty).
 */
export function nextPendingStepIndex(chain: ChainStep[]): number {
    if (!Array.isArray(chain) || chain.length === 0) return -1;
    for (let i = 0; i < chain.length; i++) {
        if (!isStepSatisfied(chain[i])) return i;
    }
    return -1;
}

/** True when `user` is listed as an approver on the step (by staff id or role). */
export function canUserActOnStep(step: ChainStep, user: ActingUser): boolean {
    if (!step || !user) return false;
    return (step.approvers ?? []).some((a) => {
        if (a.kind === "staff") return String(a.value) === String(user.staffId);
        if (a.kind === "role") return !!user.role && String(a.value) === String(user.role);
        return false;
    });
}

/** True when this user has already recorded a decision on the step. */
export function hasUserDecided(step: ChainStep, user: ActingUser): boolean {
    return (step?.decisions ?? []).some((d) => d && String(d.approverId) === String(user.staffId));
}

/**
 * The chain is fully approved only when it is non-empty, no step carries a
 * rejection, and every step has met its quorum.
 */
export function isChainFullyApproved(chain: ChainStep[]): boolean {
    if (!Array.isArray(chain) || chain.length === 0) return false;
    if (chain.some(stepHasRejection)) return false;
    return chain.every(isStepSatisfied);
}

/** A short human label for a step, e.g. "2 of 3: Ada, Max, Dana". */
export function describeStep(step: ChainStep): string {
    const names = (step.approvers ?? []).map((a) => a.label || a.value);
    const req = sanitizeRequiredCount(step.requiredCount, names.length);
    const who = names.join(", ");
    return req >= names.length && names.length > 1
        ? `all of: ${who}`
        : names.length === 1
          ? who
          : `${req} of ${names.length}: ${who}`;
}
