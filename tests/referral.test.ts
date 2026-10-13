import { describe, it, expect } from "vitest";
import {
    isValidDirection,
    canTransitionReferral,
    nextReferralStatuses,
    isTerminalReferral,
    REFERRAL_STATUSES,
    type ReferralStatus,
} from "../lib/clinical/referral";

const ALL_STATUSES = REFERRAL_STATUSES.map((s) => s.value);

describe("isValidDirection", () => {
    it("accepts the two recognised directions", () => {
        expect(isValidDirection("in")).toBe(true);
        expect(isValidDirection("out")).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isValidDirection("inbound")).toBe(false);
        expect(isValidDirection("")).toBe(false);
        expect(isValidDirection(null)).toBe(false);
        expect(isValidDirection(undefined)).toBe(false);
    });
});

describe("canTransitionReferral", () => {
    it("allows pending → accepted / declined / cancelled", () => {
        expect(canTransitionReferral("pending", "accepted")).toBe(true);
        expect(canTransitionReferral("pending", "declined")).toBe(true);
        expect(canTransitionReferral("pending", "cancelled")).toBe(true);
    });

    it("allows accepted → completed / cancelled", () => {
        expect(canTransitionReferral("accepted", "completed")).toBe(true);
        expect(canTransitionReferral("accepted", "cancelled")).toBe(true);
    });

    it("cannot complete a referral that was never accepted", () => {
        expect(canTransitionReferral("pending", "completed")).toBe(false);
    });

    it("cannot reopen a declined referral or accept after decline", () => {
        expect(canTransitionReferral("declined", "accepted")).toBe(false);
        expect(canTransitionReferral("declined", "pending")).toBe(false);
    });

    it("treats completed and cancelled as terminal", () => {
        for (const to of ALL_STATUSES) {
            expect(canTransitionReferral("completed", to)).toBe(false);
            expect(canTransitionReferral("cancelled", to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL_STATUSES) {
            expect(canTransitionReferral(s, s)).toBe(false);
        }
    });

    it("never allows moving backwards to pending", () => {
        for (const from of ALL_STATUSES.filter((s) => s !== "pending")) {
            expect(canTransitionReferral(from, "pending")).toBe(false);
        }
    });
});

describe("nextReferralStatuses", () => {
    it("lists exactly the legal next moves and stays consistent with canTransitionReferral", () => {
        for (const from of ALL_STATUSES) {
            const nexts = nextReferralStatuses(from);
            // everything listed is a legal transition
            for (const to of nexts) {
                expect(canTransitionReferral(from, to)).toBe(true);
            }
            // everything NOT listed is illegal
            const notListed = ALL_STATUSES.filter((s) => !nexts.includes(s));
            for (const to of notListed) {
                expect(canTransitionReferral(from, to)).toBe(false);
            }
        }
    });

    it("returns a fresh copy (callers cannot mutate the transition table)", () => {
        const a = nextReferralStatuses("pending");
        a.push("completed" as ReferralStatus);
        expect(nextReferralStatuses("pending")).not.toContain("completed");
    });
});

describe("isTerminalReferral", () => {
    it("is true only for declined, completed and cancelled", () => {
        expect(isTerminalReferral("declined")).toBe(true);
        expect(isTerminalReferral("completed")).toBe(true);
        expect(isTerminalReferral("cancelled")).toBe(true);
    });

    it("is false for the live states", () => {
        expect(isTerminalReferral("pending")).toBe(false);
        expect(isTerminalReferral("accepted")).toBe(false);
    });
});
