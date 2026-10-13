import { describe, it, expect } from "vitest";
import {
    resolveSaveStatus,
    resolveCompleteStatus,
    type VisitStatus,
} from "../lib/clinical/encounter";
import {
    makeVersion,
    isMeaningfulChange,
    latestVersionContent,
    type AttributedVersion,
    type AttributionUser,
} from "../lib/clinical/attribution";

/**
 * Decision-level, DB-free coverage for Task 5 — routing the record Save through
 * the attributed append-only path WITHOUT regressing behavior.
 *
 * The Mongoose action (`_updateAttendanceById`) cannot be exercised without a
 * live DB, so this suite asserts the two pure invariants the routing relies on:
 *
 *   1. Status-on-save preserved (Property 9 / R6.4): a plain Save (status
 *      omitted/null) never changes the visit status and never yields
 *      "completed"; only the explicit Complete action completes a visit.
 *   2. Append-only growth (Property 3 / R2.2, R7.1): routing a changed tracked
 *      field grows its versions array and leaves every prior entry
 *      byte-identical; a no-op save does not grow it.
 *
 * These complement — and do not duplicate — the pure-helper properties already
 * owned by tests/attribution.test.ts; here we assert the save-routing semantics
 * specifically (status preservation + the append-only growth invariant on a
 * simulated versions array, exactly as the action manipulates it).
 */

const doctor: AttributionUser = {
    _id: "staff-1",
    fullName: "Jane Doe",
    role: "doctor",
    specialization: "Ophthalmologist",
};

const nurse: AttributionUser = {
    id: "staff-2",
    fullName: "John Smith",
    role: "nurse",
};

// ---------------------------------------------------------------------------
// Status-on-save: a plain Save never completes a visit (R6.4 / Property 9)
// ---------------------------------------------------------------------------
describe("record Save — status-on-save preserved when routing tracked fields", () => {
    const statuses: VisitStatus[] = ["waiting", "ongoing", "completed", "cancelled"];

    it("a plain Save (status omitted) preserves the current status for every status", () => {
        for (const current of statuses) {
            // The action deletes `status` from the payload when omitted, so the
            // resolved status is the current one — unchanged by the save.
            expect(resolveSaveStatus(current, undefined)).toBe(current);
            expect(resolveSaveStatus(current, null)).toBe(current);
        }
    });

    it("a plain Save never yields 'completed' from a non-completed visit", () => {
        for (const current of statuses.filter((s) => s !== "completed")) {
            expect(resolveSaveStatus(current, undefined)).not.toBe("completed");
            expect(resolveSaveStatus(current, null)).not.toBe("completed");
        }
    });

    it("a plain Save on a brand-new (absent) status defaults to 'waiting', never 'completed'", () => {
        expect(resolveSaveStatus(undefined, undefined)).toBe("waiting");
        expect(resolveSaveStatus(null, undefined)).toBe("waiting");
    });

    it("only the explicit Complete action resolves to 'completed'", () => {
        expect(resolveCompleteStatus()).toBe("completed");
        // And an explicit requested status still wins when intentionally driven.
        expect(resolveSaveStatus("ongoing", "completed")).toBe("completed");
    });
});

// ---------------------------------------------------------------------------
// Append-only growth of a tracked field's versions (R2.2, R7.1 / Property 3)
// Simulates exactly what `_updateAttendanceById` does to a `*Versions` array:
// push a new makeVersion(...) only when the content is a meaningful change.
// ---------------------------------------------------------------------------
describe("record Save — append-only version growth when routing tracked fields", () => {
    /**
     * Mirror of the action's per-field append step: push a new attributed
     * version iff the content is a meaningful change against the latest.
     * Returns whether a version was appended.
     */
    function routeSave(
        versions: AttributedVersion[],
        content: unknown,
        user: AttributionUser,
        now: Date,
    ): boolean {
        const latest = latestVersionContent(versions);
        if (!isMeaningfulChange(latest, content)) return false;
        versions.push(makeVersion(content, user, now));
        return true;
    }

    it("a changed Save grows the array by one and leaves prior entries untouched", () => {
        const versions: AttributedVersion[] = [];
        const t1 = new Date("2025-10-13T10:00:00.000Z");

        const appended1 = routeSave(versions, "first draft", doctor, t1);
        expect(appended1).toBe(true);
        expect(versions).toHaveLength(1);

        // Snapshot the first entry byte-for-byte before the second save.
        const firstSnapshot = JSON.parse(JSON.stringify(versions[0]));

        const t2 = new Date("2025-10-13T10:05:00.000Z");
        const appended2 = routeSave(versions, "second draft", nurse, t2);
        expect(appended2).toBe(true);
        expect(versions).toHaveLength(2);

        // Prior version is byte-identical — never overwritten or mutated (R7.1).
        expect(JSON.parse(JSON.stringify(versions[0]))).toEqual(firstSnapshot);
        // The materialised latest tracks the newest content (R2.3).
        expect(latestVersionContent(versions)).toBe("second draft");
    });

    it("a no-op Save (unchanged content) does NOT grow the array", () => {
        const versions: AttributedVersion[] = [];
        const t1 = new Date("2025-10-13T10:00:00.000Z");
        routeSave(versions, "same note", doctor, t1);
        expect(versions).toHaveLength(1);

        // Re-saving identical content (even with whitespace noise) is a no-op.
        const appended = routeSave(versions, "  same note  ", nurse, new Date());
        expect(appended).toBe(false);
        expect(versions).toHaveLength(1);
        // Author of the sole version is unchanged by the rejected no-op save.
        expect(versions[0].authoredBy).toBe("staff-1");
    });

    it("the versions array length is monotonically non-decreasing across saves", () => {
        const versions: AttributedVersion[] = [];
        let prevLen = versions.length;
        const saves: unknown[] = ["a", "a", "b", "b", "c", { k: 1 }, { k: 1 }, { k: 2 }];
        for (const content of saves) {
            routeSave(versions, content, doctor, new Date());
            expect(versions.length).toBeGreaterThanOrEqual(prevLen);
            prevLen = versions.length;
        }
        // 5 meaningful changes among the sequence above: a, b, c, {k:1}, {k:2}.
        expect(versions).toHaveLength(5);
    });

    it("concurrent-style appends by different authors each keep their own version", () => {
        const versions: AttributedVersion[] = [];
        routeSave(versions, "doctor note", doctor, new Date("2025-10-13T10:00:00.000Z"));
        routeSave(versions, "nurse note", nurse, new Date("2025-10-13T10:01:00.000Z"));
        expect(versions).toHaveLength(2);
        expect(versions[0].authoredBy).toBe("staff-1");
        expect(versions[1].authoredBy).toBe("staff-2");
    });
});
