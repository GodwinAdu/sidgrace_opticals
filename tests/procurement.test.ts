import { describe, it, expect } from "vitest";
import {
    canTransitionRequisition,
    nextRequisitionStatuses,
    isTerminalRequisition,
    canIssuePurchaseOrder,
    canTransitionPurchaseOrder,
    nextPurchaseOrderStatuses,
    isTerminalPurchaseOrder,
    canReceiveGrn,
    reconcileGrn,
    isFullyReceived,
    totalReceivedQuantity,
    REQUISITION_STATUSES,
    PURCHASE_ORDER_STATUSES,
    type RequisitionStatus,
    type PurchaseOrderStatus,
} from "../lib/clinical/procurement";

const ALL_REQ = REQUISITION_STATUSES.map((s) => s.value);
const ALL_PO = PURCHASE_ORDER_STATUSES.map((s) => s.value);

/* ─────────────────────────── Requisition workflow ───────────────────────── */

describe("canTransitionRequisition", () => {
    it("allows draft → submitted", () => {
        expect(canTransitionRequisition("draft", "submitted")).toBe(true);
    });

    it("allows submitted → approved / rejected (the approval gate)", () => {
        expect(canTransitionRequisition("submitted", "approved")).toBe(true);
        expect(canTransitionRequisition("submitted", "rejected")).toBe(true);
    });

    it("cannot approve a draft directly (must be submitted first)", () => {
        expect(canTransitionRequisition("draft", "approved")).toBe(false);
        expect(canTransitionRequisition("draft", "rejected")).toBe(false);
    });

    it("treats approved and rejected as terminal", () => {
        for (const to of ALL_REQ) {
            expect(canTransitionRequisition("approved", to)).toBe(false);
            expect(canTransitionRequisition("rejected", to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL_REQ) {
            expect(canTransitionRequisition(s, s)).toBe(false);
        }
    });

    it("never moves backwards to draft", () => {
        for (const from of ALL_REQ.filter((s) => s !== "draft")) {
            expect(canTransitionRequisition(from, "draft")).toBe(false);
        }
    });
});

describe("nextRequisitionStatuses", () => {
    it("stays consistent with canTransitionRequisition", () => {
        for (const from of ALL_REQ) {
            const nexts = nextRequisitionStatuses(from);
            for (const to of nexts) expect(canTransitionRequisition(from, to)).toBe(true);
            for (const to of ALL_REQ.filter((s) => !nexts.includes(s))) {
                expect(canTransitionRequisition(from, to)).toBe(false);
            }
        }
    });

    it("returns a fresh copy callers cannot mutate", () => {
        const a = nextRequisitionStatuses("draft");
        a.push("approved" as RequisitionStatus);
        expect(nextRequisitionStatuses("draft")).not.toContain("approved");
    });
});

describe("isTerminalRequisition", () => {
    it("is true only for approved and rejected", () => {
        expect(isTerminalRequisition("approved")).toBe(true);
        expect(isTerminalRequisition("rejected")).toBe(true);
        expect(isTerminalRequisition("draft")).toBe(false);
        expect(isTerminalRequisition("submitted")).toBe(false);
    });
});

describe("canIssuePurchaseOrder", () => {
    it("is true only when the requisition is approved", () => {
        expect(canIssuePurchaseOrder("approved")).toBe(true);
        expect(canIssuePurchaseOrder("draft")).toBe(false);
        expect(canIssuePurchaseOrder("submitted")).toBe(false);
        expect(canIssuePurchaseOrder("rejected")).toBe(false);
    });
});

/* ──────────────────────── Purchase-order workflow ───────────────────────── */

describe("canTransitionPurchaseOrder", () => {
    it("allows draft → ordered / cancelled", () => {
        expect(canTransitionPurchaseOrder("draft", "ordered")).toBe(true);
        expect(canTransitionPurchaseOrder("draft", "cancelled")).toBe(true);
    });

    it("allows ordered → received / cancelled", () => {
        expect(canTransitionPurchaseOrder("ordered", "received")).toBe(true);
        expect(canTransitionPurchaseOrder("ordered", "cancelled")).toBe(true);
    });

    it("cannot receive a draft PO that was never ordered", () => {
        expect(canTransitionPurchaseOrder("draft", "received")).toBe(false);
    });

    it("treats received and cancelled as terminal", () => {
        for (const to of ALL_PO) {
            expect(canTransitionPurchaseOrder("received", to)).toBe(false);
            expect(canTransitionPurchaseOrder("cancelled", to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL_PO) {
            expect(canTransitionPurchaseOrder(s, s)).toBe(false);
        }
    });
});

describe("nextPurchaseOrderStatuses", () => {
    it("stays consistent with canTransitionPurchaseOrder", () => {
        for (const from of ALL_PO) {
            const nexts = nextPurchaseOrderStatuses(from);
            for (const to of nexts) expect(canTransitionPurchaseOrder(from, to)).toBe(true);
            for (const to of ALL_PO.filter((s) => !nexts.includes(s))) {
                expect(canTransitionPurchaseOrder(from, to)).toBe(false);
            }
        }
    });

    it("returns a fresh copy callers cannot mutate", () => {
        const a = nextPurchaseOrderStatuses("draft");
        a.push("received" as PurchaseOrderStatus);
        expect(nextPurchaseOrderStatuses("draft")).not.toContain("received");
    });
});

describe("isTerminalPurchaseOrder / canReceiveGrn", () => {
    it("received and cancelled are terminal", () => {
        expect(isTerminalPurchaseOrder("received")).toBe(true);
        expect(isTerminalPurchaseOrder("cancelled")).toBe(true);
        expect(isTerminalPurchaseOrder("draft")).toBe(false);
        expect(isTerminalPurchaseOrder("ordered")).toBe(false);
    });

    it("only an ordered PO can be received", () => {
        expect(canReceiveGrn("ordered")).toBe(true);
        expect(canReceiveGrn("draft")).toBe(false);
        expect(canReceiveGrn("received")).toBe(false);
        expect(canReceiveGrn("cancelled")).toBe(false);
    });
});

/* ──────────────────────────── GRN reconciliation ────────────────────────── */

describe("reconcileGrn", () => {
    it("reports an exact match as zero variance", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 10 }],
            [{ productId: "a", quantity: 10 }],
        );
        expect(lines).toEqual([{ productId: "a", ordered: 10, received: 10, variance: 0 }]);
    });

    it("reports a short-shipment as negative variance", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 10 }],
            [{ productId: "a", quantity: 7 }],
        );
        expect(lines[0]).toMatchObject({ ordered: 10, received: 7, variance: -3 });
    });

    it("reports an over-receipt as positive variance", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 5 }],
            [{ productId: "a", quantity: 8 }],
        );
        expect(lines[0]).toMatchObject({ ordered: 5, received: 8, variance: 3 });
    });

    it("includes ordered lines with no receipt (received 0)", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 4 }, { productId: "b", quantity: 2 }],
            [{ productId: "a", quantity: 4 }],
        );
        const b = lines.find((l) => l.productId === "b");
        expect(b).toMatchObject({ ordered: 2, received: 0, variance: -2 });
    });

    it("surfaces an unexpected product that was only received (ordered 0)", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 4 }],
            [{ productId: "a", quantity: 4 }, { productId: "x", quantity: 1 }],
        );
        const x = lines.find((l) => l.productId === "x");
        expect(x).toMatchObject({ ordered: 0, received: 1, variance: 1 });
    });

    it("merges duplicate lines for the same product", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 3 }, { productId: "a", quantity: 2 }],
            [{ productId: "a", quantity: 5 }],
        );
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatchObject({ ordered: 5, received: 5, variance: 0 });
    });

    it("treats non-positive / invalid quantities as zero", () => {
        const lines = reconcileGrn(
            [{ productId: "a", quantity: 5 }],
            [{ productId: "a", quantity: -3 }],
        );
        expect(lines[0]).toMatchObject({ ordered: 5, received: 0, variance: -5 });
    });
});

describe("isFullyReceived", () => {
    it("is true when every ordered line matches exactly", () => {
        expect(isFullyReceived(
            [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 3 }],
            [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 3 }],
        )).toBe(true);
    });

    it("is false on any short or over receipt", () => {
        expect(isFullyReceived([{ productId: "a", quantity: 2 }], [{ productId: "a", quantity: 1 }])).toBe(false);
        expect(isFullyReceived([{ productId: "a", quantity: 2 }], [{ productId: "a", quantity: 3 }])).toBe(false);
    });

    it("is false for an empty order", () => {
        expect(isFullyReceived([], [])).toBe(false);
    });
});

describe("totalReceivedQuantity", () => {
    it("sums positive received quantities and ignores invalid ones", () => {
        expect(totalReceivedQuantity([
            { productId: "a", quantity: 3 },
            { productId: "b", quantity: 2 },
            { productId: "c", quantity: -5 },
        ])).toBe(5);
    });

    it("is zero for an empty receipt", () => {
        expect(totalReceivedQuantity([])).toBe(0);
    });
});
