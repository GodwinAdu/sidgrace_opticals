import { describe, it, expect } from "vitest";
import {
    isMeaningfulChange,
    makeVersion,
    formatAttribution,
    resolveAuthorLabel,
    latestVersionContent,
    AUTHOR_UNKNOWN,
    type AttributedVersion,
    type AttributionUser,
    type AttributionEntry,
} from "../lib/clinical/attribution";

/**
 * Pure-level coverage of the attribution correctness properties:
 *   Property 1 — author always comes from the passed user (never the payload),
 *   Property 2 — createdAt equals the passed server `now`,
 *   Property 4 — the no-op guard: identical content is not a meaningful change,
 *   Property 5 — latest consistency: current value = newest version content,
 *   Property 6 — unknown-author fallback for missing name / missing role.
 */

const SERVER_NOW = new Date("2025-10-13T14:32:00.000Z");

/** A doctor as returned by the Staff model (uses `_id` + `specialization`). */
const doctor: AttributionUser = {
    _id: "staff-1",
    fullName: "Jane Doe",
    role: "doctor",
    specialization: "Ophthalmologist",
};

/** A user as injected by `withAuth` (uses `id`, no specialization). */
const nurse: AttributionUser = {
    id: "staff-2",
    fullName: "John Smith",
    role: "nurse",
};

// ---------------------------------------------------------------------------
// Property 1: Author provenance (Requirements 1.1, 1.2)
// The recorded author is always the passed user, regardless of any author
// value carried in the content/payload (including a forged author id).
// ---------------------------------------------------------------------------
describe("makeVersion — Property 1: author provenance", () => {
    it("takes authoredBy from the passed user (_id), not the content", () => {
        const forged = { authoredBy: "attacker-999", text: "note" };
        const v = makeVersion(forged, doctor, SERVER_NOW);
        expect(v.authoredBy).toBe("staff-1");
        expect(v.authoredBy).not.toBe("attacker-999");
    });

    it("accepts the withAuth user shape (id) as the author id", () => {
        const v = makeVersion("some note", nurse, SERVER_NOW);
        expect(v.authoredBy).toBe("staff-2");
    });

    it("snapshots the author name and role from the user, not the payload", () => {
        const forged = {
            authoredBy: "attacker-999",
            authoredByName: "Fake Name",
            authoredByRole: "Fake Role",
        };
        const v = makeVersion(forged, doctor, SERVER_NOW);
        expect(v.authoredByName).toBe("Jane Doe");
        // Prefers specialization over role for the title.
        expect(v.authoredByRole).toBe("Ophthalmologist");
        expect(v.authoredByName).not.toBe("Fake Name");
        expect(v.authoredByRole).not.toBe("Fake Role");
    });

    it("falls back to plain role when the user has no specialization", () => {
        const v = makeVersion("vitals", nurse, SERVER_NOW);
        expect(v.authoredByRole).toBe("nurse");
    });

    it("stores the content verbatim (author provenance does not alter content)", () => {
        const content = { bp: "120/80", pulse: 72 };
        const v = makeVersion(content, doctor, SERVER_NOW);
        expect(v.content).toEqual(content);
    });
});

// ---------------------------------------------------------------------------
// Property 2: Server-time stamping (Requirement 1.4)
// A version's createdAt is exactly the passed server `now`.
// ---------------------------------------------------------------------------
describe("makeVersion — Property 2: server-time stamping", () => {
    it("stamps createdAt with the passed server now", () => {
        const v = makeVersion("note", doctor, SERVER_NOW);
        expect(v.createdAt.getTime()).toBe(SERVER_NOW.getTime());
    });

    it("defensively copies the timestamp so later mutation of the arg does not leak", () => {
        const now = new Date("2025-01-01T00:00:00.000Z");
        const v = makeVersion("note", doctor, now);
        now.setFullYear(2099);
        expect(v.createdAt.getUTCFullYear()).toBe(2025);
    });

    it("appended versions carry non-decreasing timestamps in append order", () => {
        const t1 = new Date("2025-10-13T10:00:00.000Z");
        const t2 = new Date("2025-10-13T10:05:00.000Z");
        const versions: AttributedVersion[] = [
            makeVersion("first", doctor, t1),
            makeVersion("second", nurse, t2),
        ];
        expect(versions[1].createdAt.getTime()).toBeGreaterThanOrEqual(
            versions[0].createdAt.getTime(),
        );
    });
});

// ---------------------------------------------------------------------------
// Property 4: No-op guard (Requirement 2.4)
// Saving content equal to the latest version is not a meaningful change.
// ---------------------------------------------------------------------------
describe("isMeaningfulChange — Property 4: no-op guard", () => {
    it("identical strings are not a meaningful change", () => {
        expect(isMeaningfulChange("hello", "hello")).toBe(false);
    });

    it("ignores leading/trailing whitespace differences for strings", () => {
        expect(isMeaningfulChange("hello", "  hello  ")).toBe(false);
        expect(isMeaningfulChange("  note \n", "note")).toBe(false);
    });

    it("different strings are a meaningful change", () => {
        expect(isMeaningfulChange("hello", "world")).toBe(true);
        expect(isMeaningfulChange("hello", "hello!")).toBe(true);
    });

    it("absent-to-empty is not a meaningful change; absent-to-content is", () => {
        expect(isMeaningfulChange(undefined, "")).toBe(false);
        expect(isMeaningfulChange(null, "   ")).toBe(false);
        expect(isMeaningfulChange(undefined, "new")).toBe(true);
    });

    it("deep-equal structured content is not a meaningful change", () => {
        const a = { bp: "120/80", pulse: 72, extra: { ok: true } };
        const b = { bp: "120/80", pulse: 72, extra: { ok: true } };
        expect(isMeaningfulChange(a, b)).toBe(false);
    });

    it("structured content order of keys does not matter", () => {
        expect(isMeaningfulChange({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
    });

    it("changed structured content is a meaningful change", () => {
        expect(isMeaningfulChange({ bp: "120/80" }, { bp: "130/90" })).toBe(true);
        expect(isMeaningfulChange({ a: 1 }, { a: 1, b: 2 })).toBe(true);
    });

    it("compares Date values by instant", () => {
        const d1 = new Date("2025-01-01T00:00:00Z");
        const d2 = new Date("2025-01-01T00:00:00Z");
        const d3 = new Date("2025-02-01T00:00:00Z");
        expect(isMeaningfulChange({ at: d1 }, { at: d2 })).toBe(false);
        expect(isMeaningfulChange({ at: d1 }, { at: d3 })).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Property 5: Latest consistency (Requirement 2.3)
// The current value equals the newest version's content.
// ---------------------------------------------------------------------------
describe("latestVersionContent — Property 5: latest consistency", () => {
    it("returns undefined when there are no versions", () => {
        expect(latestVersionContent([])).toBeUndefined();
        expect(latestVersionContent(null)).toBeUndefined();
        expect(latestVersionContent(undefined)).toBeUndefined();
    });

    it("returns the content of the last appended version", () => {
        const versions: AttributedVersion[] = [
            makeVersion("first", doctor, SERVER_NOW),
            makeVersion("second", nurse, SERVER_NOW),
            makeVersion("third", doctor, SERVER_NOW),
        ];
        expect(latestVersionContent(versions)).toBe("third");
    });

    it("tracks the newest content as versions are appended (append-only)", () => {
        const versions: AttributedVersion[] = [];
        versions.push(makeVersion({ bp: "120/80" }, doctor, SERVER_NOW));
        expect(latestVersionContent(versions)).toEqual({ bp: "120/80" });
        versions.push(makeVersion({ bp: "130/90" }, nurse, SERVER_NOW));
        expect(latestVersionContent(versions)).toEqual({ bp: "130/90" });
    });
});

// ---------------------------------------------------------------------------
// Property 6: Attribution totality (Requirements 3.3, 6.2)
// resolveAuthorLabel always returns a displayable label; never a raw id, never
// throws; degrades to "author unknown" and omits an unknown role.
// ---------------------------------------------------------------------------
describe("resolveAuthorLabel — Property 6: unknown-author fallback", () => {
    it("resolves name and role from the denormalised snapshot", () => {
        const label = resolveAuthorLabel({
            authoredByName: "Jane Doe",
            authoredByRole: "Ophthalmologist",
        });
        expect(label).toEqual({ name: "Jane Doe", role: "Ophthalmologist" });
    });

    it("omits role (not blank) when the role cannot be resolved", () => {
        const label = resolveAuthorLabel({ authoredByName: "Jane Doe", authoredByRole: "" });
        expect(label).toEqual({ name: "Jane Doe" });
        expect("role" in label).toBe(false);
    });

    it("falls back to 'author unknown' when the name is missing or blank", () => {
        expect(resolveAuthorLabel({ authoredByName: "" })).toEqual({ name: AUTHOR_UNKNOWN });
        expect(resolveAuthorLabel({ authoredByName: "   " })).toEqual({ name: AUTHOR_UNKNOWN });
        expect(resolveAuthorLabel({})).toEqual({ name: AUTHOR_UNKNOWN });
    });

    it("never returns a raw author id as the name", () => {
        // Only an author id present (no name snapshot) → unknown, never the id.
        const label = resolveAuthorLabel({ authoredBy: "staff-123" } as AttributionEntry);
        expect(label).toEqual({ name: AUTHOR_UNKNOWN });
    });

    it("never throws on null / undefined entries", () => {
        expect(() => resolveAuthorLabel(null)).not.toThrow();
        expect(() => resolveAuthorLabel(undefined)).not.toThrow();
        expect(resolveAuthorLabel(null)).toEqual({ name: AUTHOR_UNKNOWN });
    });
});

// ---------------------------------------------------------------------------
// formatAttribution — deterministic display (Requirement 3.1)
// ---------------------------------------------------------------------------
describe("formatAttribution — deterministic display", () => {
    it("renders 'Name (Role) - HH:MM, D Mon' for a fixed date", () => {
        const s = formatAttribution({
            name: "Dr. Jane Doe",
            role: "Ophthalmologist",
            at: new Date("2025-10-13T14:32:00.000Z"),
        });
        expect(s).toBe("Dr. Jane Doe (Ophthalmologist) - 14:32, 13 Oct");
    });

    it("omits the role parentheses when the role is absent or blank", () => {
        const base = { name: "Dr. Jane Doe", at: new Date("2025-10-13T09:05:00.000Z") };
        expect(formatAttribution(base)).toBe("Dr. Jane Doe - 09:05, 13 Oct");
        expect(formatAttribution({ ...base, role: "   " })).toBe("Dr. Jane Doe - 09:05, 13 Oct");
    });

    it("is deterministic: same input yields the same string", () => {
        const parts = { name: "A B", role: "R", at: new Date("2025-01-02T03:04:00.000Z") };
        expect(formatAttribution(parts)).toBe(formatAttribution(parts));
        expect(formatAttribution(parts)).toBe("A B (R) - 03:04, 2 Jan");
    });
});
