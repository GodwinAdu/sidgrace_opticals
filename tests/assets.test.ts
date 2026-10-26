import { describe, it, expect } from "vitest";
import {
    canTransitionAsset,
    nextAssetStatuses,
    isTerminalAsset,
    isValidAssetStatus,
    computeNextDue,
    daysUntilDue,
    maintenanceState,
    isOverdue,
    isDueOrOverdue,
    MS_PER_DAY,
    ASSET_STATUSES,
    type AssetStatus,
} from "../lib/clinical/assets";

const ALL = ASSET_STATUSES.map((s) => s.value);

// A fixed reference "now" so the schedule math is deterministic.
const NOW = new Date("2026-06-15T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * MS_PER_DAY);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * MS_PER_DAY);

/* ─────────────────────────────── Status machine ─────────────────────────── */

describe("canTransitionAsset", () => {
    it("allows active → maintenance / retired", () => {
        expect(canTransitionAsset("active", "maintenance")).toBe(true);
        expect(canTransitionAsset("active", "retired")).toBe(true);
    });

    it("allows maintenance → active / retired", () => {
        expect(canTransitionAsset("maintenance", "active")).toBe(true);
        expect(canTransitionAsset("maintenance", "retired")).toBe(true);
    });

    it("treats retired as terminal", () => {
        for (const to of ALL) expect(canTransitionAsset("retired", to)).toBe(false);
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL) expect(canTransitionAsset(s, s)).toBe(false);
    });
});

describe("nextAssetStatuses", () => {
    it("stays consistent with canTransitionAsset", () => {
        for (const from of ALL) {
            const nexts = nextAssetStatuses(from);
            for (const to of nexts) expect(canTransitionAsset(from, to)).toBe(true);
            for (const to of ALL.filter((s) => !nexts.includes(s))) {
                expect(canTransitionAsset(from, to)).toBe(false);
            }
        }
    });

    it("returns a fresh copy callers cannot mutate", () => {
        // "maintenance" is NOT a legal next-state from "retired" (terminal),
        // so pushing it to one call's result must not leak into the next.
        const a = nextAssetStatuses("retired");
        a.push("maintenance" as AssetStatus);
        expect(nextAssetStatuses("retired")).not.toContain("maintenance");
        expect(nextAssetStatuses("retired")).toEqual([]);
        // sanity: active still has exactly its two real transitions
        expect([...nextAssetStatuses("active")].sort()).toEqual(["maintenance", "retired"]);
    });
});

describe("isTerminalAsset / isValidAssetStatus", () => {
    it("retired is terminal, others are not", () => {
        expect(isTerminalAsset("retired")).toBe(true);
        expect(isTerminalAsset("active")).toBe(false);
        expect(isTerminalAsset("maintenance")).toBe(false);
    });

    it("recognises only the three real statuses", () => {
        expect(isValidAssetStatus("active")).toBe(true);
        expect(isValidAssetStatus("maintenance")).toBe(true);
        expect(isValidAssetStatus("retired")).toBe(true);
        expect(isValidAssetStatus("broken")).toBe(false);
        expect(isValidAssetStatus(null)).toBe(false);
        expect(isValidAssetStatus(undefined)).toBe(false);
    });
});

/* ──────────────────────────── Next-due computation ──────────────────────── */

describe("computeNextDue", () => {
    it("adds the interval to the last-serviced date", () => {
        const next = computeNextDue(30, daysAgo(10), NOW);
        // serviced 10 days ago + 30-day interval = due 20 days from now
        expect(next).not.toBeNull();
        expect(next!.getTime()).toBe(daysAgo(10).getTime() + 30 * MS_PER_DAY);
    });

    it("anchors on the created date when never serviced", () => {
        const created = daysAgo(5);
        // signature: computeNextDue(intervalDays, lastServiced, anchor)
        const next = computeNextDue(30, null, created);
        expect(next).not.toBeNull();
        // never serviced → anchor on created: due = created + 30 days
        expect(next!.getTime()).toBe(created.getTime() + 30 * MS_PER_DAY);
    });

    it("prefers the last-serviced date over the anchor", () => {
        const serviced = daysAgo(5);
        const created = daysAgo(40);
        const next = computeNextDue(30, serviced, created);
        // serviced wins over the created anchor
        expect(next!.getTime()).toBe(serviced.getTime() + 30 * MS_PER_DAY);
    });

    it("returns null for a non-positive or invalid interval (unscheduled)", () => {
        expect(computeNextDue(0, daysAgo(5))).toBeNull();
        expect(computeNextDue(-5, daysAgo(5))).toBeNull();
        expect(computeNextDue(undefined, daysAgo(5))).toBeNull();
        expect(computeNextDue("abc", daysAgo(5))).toBeNull();
    });
});

/* ───────────────────────────── Days-until-due math ──────────────────────── */

describe("daysUntilDue", () => {
    it("is positive when the next service is in the future", () => {
        // serviced today, 30-day interval → ~30 days remain
        expect(daysUntilDue(30, NOW, NOW)).toBe(30);
    });

    it("is 0 when due exactly today", () => {
        // serviced 30 days ago, 30-day interval → due today
        expect(daysUntilDue(30, daysAgo(30), NOW)).toBe(0);
    });

    it("is negative when overdue", () => {
        // serviced 40 days ago, 30-day interval → 10 days overdue
        expect(daysUntilDue(30, daysAgo(40), NOW)).toBe(-10);
    });

    it("is null when unscheduled", () => {
        expect(daysUntilDue(0, daysAgo(40), NOW)).toBeNull();
    });
});

/* ─────────────────────── Due / overdue classification ───────────────────── */

describe("maintenanceState", () => {
    it("is unscheduled with no positive interval", () => {
        expect(maintenanceState(0, daysAgo(100), NOW)).toBe("unscheduled");
    });

    it("is overdue when the next-due date is in the past", () => {
        expect(maintenanceState(30, daysAgo(40), NOW)).toBe("overdue");
    });

    it("is due when within the default 7-day window", () => {
        // serviced 25 days ago, 30-day interval → due in 5 days (inside window)
        expect(maintenanceState(30, daysAgo(25), NOW)).toBe("due");
    });

    it("is due exactly on the day it falls due", () => {
        expect(maintenanceState(30, daysAgo(30), NOW)).toBe("due");
    });

    it("is ok when comfortably in the future", () => {
        // serviced today, 30-day interval → 30 days out, outside the 7-day window
        expect(maintenanceState(30, NOW, NOW)).toBe("ok");
    });

    it("respects a custom due window", () => {
        // due in 10 days: inside a 14-day window, outside the default 7-day one
        expect(maintenanceState(30, daysAgo(20), NOW, 14)).toBe("due");
        expect(maintenanceState(30, daysAgo(20), NOW, 7)).toBe("ok");
    });

    it("anchors a never-serviced asset on its created date", () => {
        // created 40 days ago, 30-day interval, never serviced → overdue
        expect(maintenanceState(30, null, NOW, 7, daysAgo(40))).toBe("overdue");
        // created today, 30-day interval, never serviced → not immediately due
        expect(maintenanceState(30, null, NOW, 7, NOW)).toBe("ok");
    });
});

describe("isOverdue", () => {
    it("is true only when strictly past due (0-day window)", () => {
        expect(isOverdue(30, daysAgo(31), NOW)).toBe(true);
        expect(isOverdue(30, daysAgo(30), NOW)).toBe(false); // due today, not yet overdue
        expect(isOverdue(30, daysAgo(10), NOW)).toBe(false);
    });

    it("is false when unscheduled", () => {
        expect(isOverdue(0, daysAgo(100), NOW)).toBe(false);
    });
});

describe("isDueOrOverdue", () => {
    it("is true for both due-soon and overdue assets", () => {
        expect(isDueOrOverdue(30, daysAgo(40), NOW)).toBe(true);  // overdue
        expect(isDueOrOverdue(30, daysAgo(25), NOW)).toBe(true);  // due soon
    });

    it("is false when comfortably in the future or unscheduled", () => {
        expect(isDueOrOverdue(30, NOW, NOW)).toBe(false);
        expect(isDueOrOverdue(0, daysAgo(40), NOW)).toBe(false);
    });

    it("ignores future-dated service with no interval", () => {
        expect(isDueOrOverdue(30, daysAhead(5), NOW)).toBe(false);
    });
});
