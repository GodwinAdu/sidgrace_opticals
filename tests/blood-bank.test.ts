import { describe, it, expect } from "vitest";
import {
    isCompatible,
    compatibleDonorGroups,
    isExpired,
    effectiveStatus,
    isIssuable,
    canTransitionUnit,
    canTransitionSpecimen,
    BLOOD_GROUPS,
    type BloodGroup,
} from "../lib/clinical/blood-bank";

describe("isCompatible (red-cell ABO/Rh crossmatch)", () => {
    it("O- is the universal donor for every recipient group", () => {
        for (const recipient of BLOOD_GROUPS) {
            expect(isCompatible("O-", recipient)).toBe(true);
        }
    });

    it("AB+ is the universal recipient (accepts every donor group)", () => {
        for (const donor of BLOOD_GROUPS) {
            expect(isCompatible(donor, "AB+")).toBe(true);
        }
    });

    it("an Rh-negative recipient cannot receive Rh-positive blood", () => {
        expect(isCompatible("O+", "O-")).toBe(false);
        expect(isCompatible("A+", "A-")).toBe(false);
        expect(isCompatible("B+", "AB-")).toBe(false);
    });

    it("rejects ABO-incompatible pairings", () => {
        expect(isCompatible("A+", "B+")).toBe(false);
        expect(isCompatible("B-", "A-")).toBe(false);
        expect(isCompatible("AB+", "O+")).toBe(false);
    });

    it("is case-insensitive and trims the group strings", () => {
        expect(isCompatible(" o- ", "a+")).toBe(true);
        expect(isCompatible("A+", " ab+ ")).toBe(true);
    });

    it("returns false for any unrecognised group (never falsely passes)", () => {
        expect(isCompatible("Z+", "A+")).toBe(false);
        expect(isCompatible("A+", "")).toBe(false);
        expect(isCompatible(null, "A+")).toBe(false);
        expect(isCompatible(undefined, undefined)).toBe(false);
    });

    it("every donor it reports compatible is self-consistent with the recipient list", () => {
        for (const recipient of BLOOD_GROUPS) {
            const donors = compatibleDonorGroups(recipient);
            for (const d of donors) {
                expect(isCompatible(d, recipient)).toBe(true);
            }
            // and a group NOT in the list is incompatible
            const notListed = (BLOOD_GROUPS as BloodGroup[]).filter((g) => !donors.includes(g));
            for (const d of notListed) {
                expect(isCompatible(d, recipient)).toBe(false);
            }
        }
    });

    it("compatibleDonorGroups returns empty for an unknown recipient", () => {
        expect(compatibleDonorGroups("nope")).toEqual([]);
    });
});

describe("isExpired", () => {
    const asOf = "2024-06-15T00:00:00Z";

    it("is true when the expiry is strictly before the reference date", () => {
        expect(isExpired("2024-06-14T23:59:59Z", asOf)).toBe(true);
    });

    it("is false when the expiry is on or after the reference date", () => {
        expect(isExpired("2024-06-16T00:00:00Z", asOf)).toBe(false);
    });

    it("treats a missing or unusable expiry as not expired (unknown != expired)", () => {
        expect(isExpired(null, asOf)).toBe(false);
        expect(isExpired(undefined, asOf)).toBe(false);
        expect(isExpired("not-a-date", asOf)).toBe(false);
    });
});

describe("effectiveStatus", () => {
    const asOf = "2024-06-15T00:00:00Z";
    const future = "2024-12-31T00:00:00Z";
    const past = "2024-01-01T00:00:00Z";

    it("returns the stored status when the unit is live and unexpired", () => {
        expect(effectiveStatus("available", future, asOf)).toBe("available");
        expect(effectiveStatus("reserved", future, asOf)).toBe("reserved");
        expect(effectiveStatus("issued", future, asOf)).toBe("issued");
    });

    it("reports 'expired' for a non-discarded unit past its expiry", () => {
        expect(effectiveStatus("available", past, asOf)).toBe("expired");
        expect(effectiveStatus("reserved", past, asOf)).toBe("expired");
    });

    it("keeps 'discarded' as terminal even when expired", () => {
        expect(effectiveStatus("discarded", past, asOf)).toBe("discarded");
        expect(effectiveStatus("discarded", future, asOf)).toBe("discarded");
    });
});

describe("isIssuable", () => {
    const asOf = "2024-06-15T00:00:00Z";
    const future = "2024-12-31T00:00:00Z";
    const past = "2024-01-01T00:00:00Z";

    it("is true only for an available, unexpired unit", () => {
        expect(isIssuable("available", future, asOf)).toBe(true);
    });

    it("is false for reserved/issued/discarded units", () => {
        expect(isIssuable("reserved", future, asOf)).toBe(false);
        expect(isIssuable("issued", future, asOf)).toBe(false);
        expect(isIssuable("discarded", future, asOf)).toBe(false);
    });

    it("is false for an available but expired unit", () => {
        expect(isIssuable("available", past, asOf)).toBe(false);
    });
});

describe("canTransitionUnit", () => {
    it("allows available → reserved / issued / discarded", () => {
        expect(canTransitionUnit("available", "reserved")).toBe(true);
        expect(canTransitionUnit("available", "issued")).toBe(true);
        expect(canTransitionUnit("available", "discarded")).toBe(true);
    });

    it("allows reserved → issued / available / discarded", () => {
        expect(canTransitionUnit("reserved", "issued")).toBe(true);
        expect(canTransitionUnit("reserved", "available")).toBe(true);
        expect(canTransitionUnit("reserved", "discarded")).toBe(true);
    });

    it("only allows issued → discarded", () => {
        expect(canTransitionUnit("issued", "discarded")).toBe(true);
        expect(canTransitionUnit("issued", "available")).toBe(false);
        expect(canTransitionUnit("issued", "reserved")).toBe(false);
    });

    it("treats discarded as terminal and rejects no-op transitions", () => {
        expect(canTransitionUnit("discarded", "available")).toBe(false);
        expect(canTransitionUnit("available", "available")).toBe(false);
    });
});

describe("canTransitionSpecimen", () => {
    it("allows the forward lifecycle collected → in-transit → received → processed", () => {
        expect(canTransitionSpecimen("collected", "in-transit")).toBe(true);
        expect(canTransitionSpecimen("in-transit", "received")).toBe(true);
        expect(canTransitionSpecimen("received", "processed")).toBe(true);
    });

    it("allows skipping transit (collected → received)", () => {
        expect(canTransitionSpecimen("collected", "received")).toBe(true);
    });

    it("allows rejection before processing but not after", () => {
        expect(canTransitionSpecimen("collected", "rejected")).toBe(true);
        expect(canTransitionSpecimen("in-transit", "rejected")).toBe(true);
        expect(canTransitionSpecimen("received", "rejected")).toBe(true);
        expect(canTransitionSpecimen("processed", "rejected")).toBe(false);
    });

    it("rejects backward moves and terminal exits", () => {
        expect(canTransitionSpecimen("received", "collected")).toBe(false);
        expect(canTransitionSpecimen("processed", "received")).toBe(false);
        expect(canTransitionSpecimen("rejected", "received")).toBe(false);
        expect(canTransitionSpecimen("collected", "collected")).toBe(false);
    });
});
