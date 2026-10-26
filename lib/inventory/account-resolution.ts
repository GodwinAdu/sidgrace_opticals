/**
 * Pure, dependency-free account-resolution engine.
 *
 * Implements R2's product→default→skip resolution order: a posting side resolves
 * to the product's linked account code when it is set, otherwise the global
 * settings default code, otherwise null (meaning the caller skips that posting).
 *
 * This pure resolution logic is deliberately separated from the DB lookup so it
 * is unit-testable without a database or any Next/Mongoose imports. The action
 * layer supplies the already-fetched candidate codes and maps a resolved code to
 * an active, non-deleted ChartAccount.
 */

/**
 * A resolved posting side: the account id and its code, or null when neither a
 * product link nor a settings default resolves to an active account (R2.4).
 */
export type ResolvedSide = { accountId: string; code: string } | null;

/** True when a candidate code is a usable, non-empty string. */
function isUsableCode(code: string | null | undefined): code is string {
    return typeof code === "string" && code.trim().length > 0;
}

/**
 * Pick the product link if set, else the settings default code, else null.
 *
 * - R2.1/R2.2/R2.3: prefer the product's linked account code when it is set.
 * - Fall back to the global settings default code otherwise.
 * - R2.4: return null when neither is set, signalling the caller to skip the posting.
 */
export function pickAccountCode(
    productLinkCode: string | null | undefined,
    defaultCode: string | null | undefined,
): string | null {
    if (isUsableCode(productLinkCode)) return productLinkCode.trim();
    if (isUsableCode(defaultCode)) return defaultCode.trim();
    return null;
}
