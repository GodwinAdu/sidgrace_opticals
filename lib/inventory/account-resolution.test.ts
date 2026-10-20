import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { pickAccountCode } from "./account-resolution";

// Feature: product-accounting-and-batches, Property 8: Account resolution follows product-then-default order
//
// Validates: Requirements 2.1, 2.2, 2.3, 2.4
//
// For any product-link code and default code (each a usable code, a blank
// string, null, or undefined), pickAccountCode returns the product link when it
// is usable, otherwise the default when it is usable, otherwise null. A code is
// "usable" when it is non-blank after trimming (an account code is a COA `code`,
// so a whitespace-only string is not usable and resolves to a skip per R2.4);
// the resolved value is the trimmed code.

/** A value that is "unset" from pickAccountCode's perspective: blank, null, or undefined. */
const unsetArb: fc.Arbitrary<string | null | undefined> = fc.constantFrom(
    "",
    " ",
    "   ",
    null,
    undefined,
);

/** A usable account code: non-blank after trimming. */
const nonEmptyCodeArb: fc.Arbitrary<string> = fc
    .string()
    .filter((s) => s.trim().length > 0);

/** Any input slot: a usable code, or one of the unset sentinels. */
const slotArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
    nonEmptyCodeArb,
    unsetArb,
);

const isSet = (v: string | null | undefined): v is string =>
    typeof v === "string" && v.trim().length > 0;

describe("pickAccountCode", () => {
    it("Property 8: returns product link when set, else default when set, else null", () => {
        fc.assert(
            fc.property(slotArb, slotArb, (productLinkCode, defaultCode) => {
                const result = pickAccountCode(productLinkCode, defaultCode);

                if (isSet(productLinkCode)) {
                    // Product link always wins when it is usable (trimmed).
                    expect(result).toBe(productLinkCode.trim());
                } else if (isSet(defaultCode)) {
                    // Fall back to the default when the product link is unset (trimmed).
                    expect(result).toBe(defaultCode.trim());
                } else {
                    // Nothing resolves -> skip the posting (R2.4).
                    expect(result).toBeNull();
                }
            }),
            { numRuns: 200 },
        );
    });

    // A few explicit examples anchoring the resolution order.
    it("prefers the product link over the default", () => {
        expect(pickAccountCode("1200", "9999")).toBe("1200");
    });

    it("falls back to the default when the product link is blank/null/undefined", () => {
        expect(pickAccountCode("", "4000")).toBe("4000");
        expect(pickAccountCode(null, "4000")).toBe("4000");
        expect(pickAccountCode(undefined, "4000")).toBe("4000");
    });

    it("returns null when neither resolves", () => {
        expect(pickAccountCode("", "")).toBeNull();
        expect(pickAccountCode(null, null)).toBeNull();
        expect(pickAccountCode(undefined, undefined)).toBeNull();
    });
});
