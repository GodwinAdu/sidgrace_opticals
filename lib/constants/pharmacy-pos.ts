/**
 * Shared constants and pure helpers for the Pharmacy POS feature.
 *
 * This module deliberately carries NO `"use server"` directive: it exports
 * constant lists, types, and pure (non-async) helpers that both the server
 * action module and the client UI import. Keeping these here is the fix for the
 * prior "A 'use server' file can only export async functions" crash — a
 * `"use server"` file may only export async functions, so all non-async exports
 * live in this plain module instead.
 */

export const POS_PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "mobile-money", label: "Mobile Money" },
    { value: "bank-transfer", label: "Bank Transfer" },
    { value: "other", label: "Other" },
] as const;

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number]["value"];

/** A single line in the client-side POS cart. */
export interface PosCartLine {
    productId: string;
    name: string;
    genericName?: string;
    unitPrice: number;
    quantity: number;
    available: number;
    prescriptionRequired: boolean;
    controlledSubstance: boolean;
}

/** Format a sale sequence number into the human-readable `POS-YYYY-00001`. */
export function formatSaleNumber(seq: number, year: number): string {
    return `POS-${year}-${String(seq).padStart(5, "0")}`;
}

/** Compute change due on a cash tender; never negative. */
export function computeChange(tendered: number, total: number): number {
    return Math.max(0, (Number(tendered) || 0) - (Number(total) || 0));
}

/** True when any line is prescription-required or controlled (auth note needed). */
export function requiresAuthNote(
    lines: { prescriptionRequired: boolean; controlledSubstance: boolean }[],
): boolean {
    return (lines || []).some((l) => l.prescriptionRequired || l.controlledSubstance);
}

/** Sum the requested quantity per product id (a cart may repeat a product). */
export function aggregateQtyByProduct(
    items: { productId: string; quantity: number }[],
): Map<string, number> {
    const map = new Map<string, number>();
    for (const it of items || []) {
        const id = String(it.productId);
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) continue;
        map.set(id, (map.get(id) || 0) + qty);
    }
    return map;
}
