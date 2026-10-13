import { describe, it, expect } from "vitest";
import {
    bookingWindow,
    windowsOverlap,
    findSlotConflict,
    hasSlotConflict,
    DEFAULT_SURGERY_DURATION_MIN,
    type SurgeryBookingLike,
} from "../lib/clinical/theatre";

const at = (iso: string) => new Date(iso);

describe("bookingWindow", () => {
    it("builds a [start, end) window from scheduledAt + durationMinutes", () => {
        const w = bookingWindow({ scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: 90 });
        expect(w).not.toBeNull();
        expect(w!.end - w!.start).toBe(90 * 60_000);
    });

    it("falls back to the default duration when missing / zero / invalid", () => {
        for (const d of [undefined, 0, -30, NaN]) {
            const w = bookingWindow({ scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: d as number });
            expect(w!.end - w!.start).toBe(DEFAULT_SURGERY_DURATION_MIN * 60_000);
        }
    });

    it("returns null for an unusable start time", () => {
        expect(bookingWindow({ scheduledAt: null })).toBeNull();
        expect(bookingWindow({ scheduledAt: "not-a-date" })).toBeNull();
    });
});

describe("windowsOverlap", () => {
    it("detects overlapping windows", () => {
        const a = { scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: 60 };
        const b = { scheduledAt: at("2024-01-01T09:30:00Z"), durationMinutes: 60 };
        expect(windowsOverlap(a, b)).toBe(true);
    });

    it("treats back-to-back bookings as non-overlapping (half-open)", () => {
        const a = { scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: 60 };
        const b = { scheduledAt: at("2024-01-01T10:00:00Z"), durationMinutes: 60 };
        expect(windowsOverlap(a, b)).toBe(false);
    });

    it("is false when either window is unusable", () => {
        const a = { scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: 60 };
        expect(windowsOverlap(a, { scheduledAt: null })).toBe(false);
    });
});

describe("findSlotConflict", () => {
    const base: SurgeryBookingLike = {
        theatreId: "OR1",
        scheduledAt: at("2024-01-01T09:00:00Z"),
        durationMinutes: 60,
        status: "scheduled",
    };

    it("flags an overlapping case in the same theatre", () => {
        const existing: SurgeryBookingLike[] = [
            { _id: "x", theatreId: "OR1", scheduledAt: at("2024-01-01T09:30:00Z"), durationMinutes: 60, status: "scheduled" },
        ];
        expect(findSlotConflict(base, existing)?._id).toBe("x");
        expect(hasSlotConflict(base, existing)).toBe(true);
    });

    it("ignores overlaps in a different theatre", () => {
        const existing: SurgeryBookingLike[] = [
            { _id: "x", theatreId: "OR2", scheduledAt: at("2024-01-01T09:30:00Z"), durationMinutes: 60, status: "scheduled" },
        ];
        expect(findSlotConflict(base, existing)).toBeNull();
    });

    it("ignores cancelled existing cases (slot is freed)", () => {
        const existing: SurgeryBookingLike[] = [
            { _id: "x", theatreId: "OR1", scheduledAt: at("2024-01-01T09:30:00Z"), durationMinutes: 60, status: "cancelled" },
        ];
        expect(findSlotConflict(base, existing)).toBeNull();
    });

    it("does not conflict with itself when editing (matched by _id)", () => {
        const self: SurgeryBookingLike = { ...base, _id: "me" };
        const existing: SurgeryBookingLike[] = [
            { _id: "me", theatreId: "OR1", scheduledAt: at("2024-01-01T09:00:00Z"), durationMinutes: 60, status: "scheduled" },
        ];
        expect(findSlotConflict(self, existing)).toBeNull();
    });

    it("allows back-to-back bookings in the same theatre", () => {
        const existing: SurgeryBookingLike[] = [
            { _id: "x", theatreId: "OR1", scheduledAt: at("2024-01-01T10:00:00Z"), durationMinutes: 60, status: "scheduled" },
        ];
        expect(findSlotConflict(base, existing)).toBeNull();
    });

    it("returns null when the proposed booking has no usable time", () => {
        expect(findSlotConflict({ theatreId: "OR1", scheduledAt: null }, [])).toBeNull();
    });

    it("handles empty / nullish existing list", () => {
        expect(findSlotConflict(base, [])).toBeNull();
        expect(findSlotConflict(base, undefined as unknown as SurgeryBookingLike[])).toBeNull();
    });
});
