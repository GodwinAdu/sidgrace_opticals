import { describe, it, expect } from "vitest";
import {
    isValidQueueService,
    canTransitionTicket,
    nextTicketStatuses,
    isTerminalTicket,
    isActiveTicket,
    nextTicketNumber,
    orderQueueForDisplay,
    canTransitionBedTransfer,
    nextBedTransferStatuses,
    isTerminalBedTransfer,
    QUEUE_STATUSES,
    BED_TRANSFER_STATUSES,
    type QueueStatus,
    type BedTransferStatus,
} from "../lib/clinical/queue";

const ALL_TICKET_STATUSES = QUEUE_STATUSES.map((s) => s.value);
const ALL_TRANSFER_STATUSES = BED_TRANSFER_STATUSES.map((s) => s.value);

/* ──────────────────────────────── Service ───────────────────────────────── */

describe("isValidQueueService", () => {
    it("accepts the three recognised services", () => {
        expect(isValidQueueService("opd")).toBe(true);
        expect(isValidQueueService("pharmacy")).toBe(true);
        expect(isValidQueueService("lab")).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isValidQueueService("radiology")).toBe(false);
        expect(isValidQueueService("")).toBe(false);
        expect(isValidQueueService(null)).toBe(false);
        expect(isValidQueueService(undefined)).toBe(false);
    });
});

/* ───────────────────────── Ticket status transitions ────────────────────── */

describe("canTransitionTicket", () => {
    it("allows the happy path waiting → called → serving → done", () => {
        expect(canTransitionTicket("waiting", "called")).toBe(true);
        expect(canTransitionTicket("called", "serving")).toBe(true);
        expect(canTransitionTicket("serving", "done")).toBe(true);
    });

    it("allows skipping from any live state", () => {
        expect(canTransitionTicket("waiting", "skipped")).toBe(true);
        expect(canTransitionTicket("called", "skipped")).toBe(true);
        expect(canTransitionTicket("serving", "skipped")).toBe(true);
    });

    it("allows recalling a called ticket back to waiting (requeue)", () => {
        expect(canTransitionTicket("called", "waiting")).toBe(true);
    });

    it("cannot start serving a ticket that was never called", () => {
        expect(canTransitionTicket("waiting", "serving")).toBe(false);
    });

    it("cannot jump straight from waiting to done", () => {
        expect(canTransitionTicket("waiting", "done")).toBe(false);
    });

    it("treats done and skipped as terminal", () => {
        for (const to of ALL_TICKET_STATUSES) {
            expect(canTransitionTicket("done", to)).toBe(false);
            expect(canTransitionTicket("skipped", to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL_TICKET_STATUSES) {
            expect(canTransitionTicket(s, s)).toBe(false);
        }
    });
});

describe("nextTicketStatuses", () => {
    it("stays consistent with canTransitionTicket for every status", () => {
        for (const from of ALL_TICKET_STATUSES) {
            const nexts = nextTicketStatuses(from);
            for (const to of nexts) expect(canTransitionTicket(from, to)).toBe(true);
            const notListed = ALL_TICKET_STATUSES.filter((s) => !nexts.includes(s));
            for (const to of notListed) expect(canTransitionTicket(from, to)).toBe(false);
        }
    });

    it("returns a fresh copy (callers cannot mutate the transition table)", () => {
        const a = nextTicketStatuses("waiting");
        a.push("done" as QueueStatus);
        expect(nextTicketStatuses("waiting")).not.toContain("done");
    });
});

describe("isTerminalTicket / isActiveTicket", () => {
    it("terminal is true only for done and skipped", () => {
        expect(isTerminalTicket("done")).toBe(true);
        expect(isTerminalTicket("skipped")).toBe(true);
        expect(isTerminalTicket("waiting")).toBe(false);
        expect(isTerminalTicket("called")).toBe(false);
        expect(isTerminalTicket("serving")).toBe(false);
    });

    it("active is true only for the live states", () => {
        expect(isActiveTicket("waiting")).toBe(true);
        expect(isActiveTicket("called")).toBe(true);
        expect(isActiveTicket("serving")).toBe(true);
        expect(isActiveTicket("done")).toBe(false);
        expect(isActiveTicket("skipped")).toBe(false);
    });

    it("every status is either active or terminal, never both", () => {
        for (const s of ALL_TICKET_STATUSES) {
            expect(isActiveTicket(s)).toBe(!isTerminalTicket(s));
        }
    });
});

/* ──────────────────────────── Next ticket number ────────────────────────── */

describe("nextTicketNumber", () => {
    it("starts at 1 for an empty day", () => {
        expect(nextTicketNumber([])).toBe(1);
    });

    it("is one past the current max", () => {
        expect(nextTicketNumber([1, 2, 3])).toBe(4);
        expect(nextTicketNumber([3, 1, 2])).toBe(4); // order independent
    });

    it("does not reuse gaps left by skipped/removed tokens", () => {
        expect(nextTicketNumber([1, 2, 5])).toBe(6);
    });

    it("ignores non-finite numbers defensively", () => {
        expect(nextTicketNumber([1, NaN, 2, Infinity])).toBe(3);
    });

    it("the issued number is always strictly greater than every prior number", () => {
        const issued = [4, 1, 9, 2];
        const next = nextTicketNumber(issued);
        for (const n of issued) expect(next).toBeGreaterThan(n);
    });
});

/* ─────────────────────────── Display ordering ───────────────────────────── */

describe("orderQueueForDisplay", () => {
    const t = (status: QueueStatus, number: number) => ({ status, number });

    it("orders by status bucket then token number ascending", () => {
        const input = [
            t("done", 1),
            t("waiting", 5),
            t("serving", 9),
            t("called", 3),
            t("waiting", 2),
            t("serving", 4),
            t("skipped", 7),
        ];
        const ordered = orderQueueForDisplay(input).map((x) => `${x.status}:${x.number}`);
        expect(ordered).toEqual([
            "serving:4",
            "serving:9",
            "called:3",
            "waiting:2",
            "waiting:5",
            "done:1",
            "skipped:7",
        ]);
    });

    it("does not mutate the input array", () => {
        const input = [t("done", 1), t("serving", 2)];
        const snapshot = input.map((x) => `${x.status}:${x.number}`);
        orderQueueForDisplay(input);
        expect(input.map((x) => `${x.status}:${x.number}`)).toEqual(snapshot);
    });

    it("serving/called tickets always sort ahead of waiting ones", () => {
        const ordered = orderQueueForDisplay([t("waiting", 1), t("called", 99), t("serving", 50)]);
        expect(ordered[0].status).toBe("serving");
        expect(ordered[1].status).toBe("called");
        expect(ordered[2].status).toBe("waiting");
    });
});

/* ─────────────────────── Bed-transfer approval states ────────────────────── */

describe("canTransitionBedTransfer", () => {
    it("allows a pending request to be approved or rejected", () => {
        expect(canTransitionBedTransfer("pending-approval", "approved")).toBe(true);
        expect(canTransitionBedTransfer("pending-approval", "rejected")).toBe(true);
    });

    it("treats approved and rejected as terminal", () => {
        for (const to of ALL_TRANSFER_STATUSES) {
            expect(canTransitionBedTransfer("approved", to)).toBe(false);
            expect(canTransitionBedTransfer("rejected", to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL_TRANSFER_STATUSES) {
            expect(canTransitionBedTransfer(s, s)).toBe(false);
        }
    });

    it("never allows moving back to pending-approval", () => {
        expect(canTransitionBedTransfer("approved", "pending-approval")).toBe(false);
        expect(canTransitionBedTransfer("rejected", "pending-approval")).toBe(false);
    });
});

describe("nextBedTransferStatuses / isTerminalBedTransfer", () => {
    it("stays consistent with canTransitionBedTransfer", () => {
        for (const from of ALL_TRANSFER_STATUSES) {
            const nexts = nextBedTransferStatuses(from);
            for (const to of nexts) expect(canTransitionBedTransfer(from, to)).toBe(true);
            const notListed = ALL_TRANSFER_STATUSES.filter((s) => !nexts.includes(s));
            for (const to of notListed) expect(canTransitionBedTransfer(from, to)).toBe(false);
        }
    });

    it("pending-approval is the only non-terminal state", () => {
        expect(isTerminalBedTransfer("pending-approval")).toBe(false);
        expect(isTerminalBedTransfer("approved")).toBe(true);
        expect(isTerminalBedTransfer("rejected")).toBe(true);
    });

    it("returns a fresh copy (callers cannot mutate the transition table)", () => {
        const a = nextBedTransferStatuses("pending-approval");
        a.push("pending-approval" as BedTransferStatus);
        // mutation of the returned array must not leak into later calls
        expect(nextBedTransferStatuses("pending-approval")).not.toContain("pending-approval");
        // still has exactly the two legal moves
        expect(nextBedTransferStatuses("pending-approval").sort()).toEqual(["approved", "rejected"]);
    });
});
